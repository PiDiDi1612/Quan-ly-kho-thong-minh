'use strict';
const express = require('express');
const router = express.Router();
const { db, roundQty, todayISO } = require('../db/database.cjs');

let _io = null;
const setIo = (io) => { _io = io; };
const notifyUpdate = () => { if (_io) _io.emit('data_updated'); };

// GET /api/approval/pending
router.get('/pending', (req, res) => {
    try {
        const user = req.auth?.user;
        if (!user || !['ADMIN', 'MANAGER'].includes(user.role))
            return res.status(403).json({ success: false, error: 'Chỉ ADMIN/MANAGER mới có quyền xem phiếu chờ duyệt.' });

        const rows = db.prepare(`
            SELECT t.*, m.unit as materialUnit FROM transactions t
            LEFT JOIN materials m ON t.materialId = m.id
            WHERE t.status = 'pending' AND t.type = 'OUT'
            ORDER BY t.date DESC, t.transactionTime DESC
        `).all();

        const groupMap = new Map();
        for (const row of rows) {
            const key = row.receiptId || row.id;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    receiptId: key, date: row.date, transactionTime: row.transactionTime,
                    user: row.user, workshop: row.workshop, orderCode: row.orderCode, items: []
                });
            }
            groupMap.get(key).items.push({
                id: row.id, materialId: row.materialId, materialName: row.materialName,
                quantity: row.quantity, unit: row.materialUnit || '', note: row.note
            });
        }
        res.json({ success: true, pending: Array.from(groupMap.values()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/approval/count
router.get('/count', (req, res) => {
    try {
        const count = db.prepare("SELECT COUNT(DISTINCT COALESCE(receiptId, id)) as c FROM transactions WHERE status = 'pending' AND type = 'OUT'").get().c;
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/approval/approve
router.post('/approve', (req, res) => {
    const user = req.auth?.user;
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role))
        return res.status(403).json({ success: false, error: 'Chỉ ADMIN/MANAGER mới có quyền duyệt phiếu.' });

    const { receiptId } = req.body;
    if (!receiptId) return res.status(400).json({ success: false, error: 'Thiếu receiptId.' });

    const approveReceipt = db.transaction(() => {
        const pendingTxs = db.prepare("SELECT * FROM transactions WHERE (receiptId = ? OR id = ?) AND status = 'pending'").all(receiptId, receiptId);
        if (pendingTxs.length === 0) throw new Error('Không tìm thấy phiếu chờ duyệt.');

        for (const tx of pendingTxs) {
            const qty = roundQty(tx.quantity);
            const result = db.prepare("UPDATE materials SET quantity = quantity - ?, lastUpdated = ? WHERE id = ? AND quantity >= ?")
                .run(qty, todayISO(), tx.materialId, qty);
            if (result.changes === 0) {
                const currentMat = db.prepare("SELECT quantity, name FROM materials WHERE id = ?").get(tx.materialId);
                throw new Error(`Không đủ tồn kho cho ${currentMat?.name || tx.materialName}. Hiện có: ${currentMat ? roundQty(currentMat.quantity) : 0}, yêu cầu: ${qty}`);
            }
            db.prepare("UPDATE transactions SET status = 'approved', approvedBy = ? WHERE id = ?")
                .run(user.fullName || user.username, tx.id);
        }
        return { affected: pendingTxs.length };
    });

    try {
        const result = approveReceipt();
        notifyUpdate();
        if (_io) _io.emit('approval_updated', { receiptId, action: 'approved', by: user.fullName || user.username });
        return res.json({ success: true, ...result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
});

// POST /api/approval/reject
router.post('/reject', (req, res) => {
    const user = req.auth?.user;
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role))
        return res.status(403).json({ success: false, error: 'Chỉ ADMIN/MANAGER mới có quyền từ chối phiếu.' });

    const { receiptId, reason } = req.body;
    if (!receiptId) return res.status(400).json({ success: false, error: 'Thiếu receiptId.' });
    if (!reason?.trim()) return res.status(400).json({ success: false, error: 'Vui lòng nhập lý do từ chối.' });

    try {
        const result = db.prepare("UPDATE transactions SET status = 'rejected', rejectedReason = ?, approvedBy = ? WHERE (receiptId = ? OR id = ?) AND status = 'pending'")
            .run(reason.trim(), user.fullName || user.username, receiptId, receiptId);
        if (result.changes === 0)
            return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu chờ duyệt.' });
        notifyUpdate();
        if (_io) _io.emit('approval_updated', { receiptId, action: 'rejected', by: user.fullName || user.username, reason: reason.trim() });
        return res.json({ success: true, affected: result.changes });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = { router, setIo };