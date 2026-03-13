'use strict';
const express = require('express');
const router = express.Router();
const os = require('os');
const { db } = require('../db/database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');
const { requirePermission } = require('../middleware/permission.cjs');

// ===== HELPERS =====
const paginatedResponse = (data, total, page, limit) => ({
    data, total, page, limit,
    totalPages: Math.ceil(total / limit)
});

const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = query.search?.trim() || '';
    return { page, limit, offset, search };
};

// ===== SYSTEM INFO =====
router.get('/system-info', (req, res) => {
    const nets = os.networkInterfaces();
    let fallbacks = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            const isIPv4 = net.family === 'IPv4' || net.family === 4;
            if (isIPv4 && !net.internal) {
                const isPrivate =
                    net.address.startsWith('192.168.') ||
                    net.address.startsWith('10.') ||
                    net.address.startsWith('172.16.') ||
                    net.address.startsWith('172.31.');
                if (isPrivate) return res.json({ ip: net.address });
                fallbacks.push(net.address);
            }
        }
    }
    return res.json({ ip: fallbacks.length > 0 ? fallbacks[0] : '127.0.0.1' });
});

// ===== DASHBOARD =====
router.get('/dashboard/summary', (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const startDateStr = sevenDaysAgo.toISOString().split('T')[0];

        const totalItems = db.prepare('SELECT COUNT(*) as c FROM materials').get().c;
        const lowStockCount = db.prepare('SELECT COUNT(*) as c FROM materials WHERE quantity <= minThreshold').get().c;
        const lowStockItems = db.prepare('SELECT * FROM materials WHERE quantity <= minThreshold ORDER BY quantity ASC LIMIT 10').all();
        const todayIn = db.prepare("SELECT COALESCE(SUM(quantity),0) as s FROM transactions WHERE date = ? AND (type = 'IN' OR (type = 'TRANSFER' AND targetMaterialId IS NOT NULL))").get(today).s;
        const todayOut = db.prepare("SELECT COALESCE(SUM(quantity),0) as s FROM transactions WHERE date = ? AND (type = 'OUT' OR type = 'TRANSFER')").get(today).s;
        const workshopData = db.prepare('SELECT workshop as name, COUNT(*) as total, SUM(quantity) as quantity FROM materials GROUP BY workshop').all();

        const activityRows = db.prepare(`
            SELECT date, type, SUM(quantity) as qty
            FROM transactions WHERE date >= ? AND date <= ?
            GROUP BY date, type
        `).all(startDateStr, today);

        const activityMap = new Map();
        for (const row of activityRows) {
            if (!activityMap.has(row.date)) activityMap.set(row.date, { inCount: 0, outCount: 0 });
            const entry = activityMap.get(row.date);
            if (row.type === 'IN') entry.inCount += row.qty;
            else if (row.type === 'OUT' || row.type === 'TRANSFER') entry.outCount += row.qty;
        }

        const activityData = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const entry = activityMap.get(dateStr) || { inCount: 0, outCount: 0 };
            activityData.push({
                name: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                inCount: entry.inCount,
                outCount: entry.outCount
            });
        }

        res.json({ totalItems, lowStockCount, lowStockItems, todayIn, todayOut, workshopData, activityData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== ACTIVITY LOGS =====
router.get('/activity_logs', requirePermission('VIEW_ACTIVITY_LOG'), (req, res) => {
    const { page, limit, offset, search } = parsePagination(req.query);
    const conditions = [];
    const params = {};
    if (search) {
        conditions.push(`(username LIKE @search OR action LIKE @search OR details LIKE @search)`);
        params.search = `%${search}%`;
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    try {
        const total = db.prepare(`SELECT COUNT(*) as c FROM activity_logs ${whereClause}`).get(params).c;
        const data = db.prepare(`SELECT * FROM activity_logs ${whereClause} ORDER BY timestamp DESC LIMIT @limit OFFSET @offset`)
            .all({ ...params, limit, offset });
        res.json(paginatedResponse(data, total, page, limit));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/activity_logs/save', verifyToken, (req, res) => {
    const log = req.body;
    db.prepare(`INSERT INTO activity_logs (id, userId, username, action, entityType, entityId, details, ipAddress, timestamp)
        VALUES (@id, @userId, @username, @action, @entityType, @entityId, @details, @ipAddress, @timestamp)`)
        .run({ entityId: null, details: null, ipAddress: null, ...log });
    res.json({ success: true });
});

router.post('/activity_logs/delete', requirePermission('MANAGE_USERS'), (req, res) => {
    db.prepare('DELETE FROM activity_logs WHERE id = ?').run(req.body.id);
    res.json({ success: true });
});

router.post('/activity_logs/clear', requirePermission('MANAGE_USERS'), (req, res) => {
    db.prepare('DELETE FROM activity_logs').run();
    res.json({ success: true });
});

module.exports = { router, paginatedResponse, parsePagination };