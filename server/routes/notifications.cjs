'use strict';
const express = require('express');
const router = express.Router();
const { db, txId } = require('../db/database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');
const { hasPermission } = require('../middleware/permission.cjs');

// ===== HELPER TO CREATE NOTIFICATION =====
const createNotification = (userId, role, type, message, referenceId = null) => {
    try {
        const id = txId();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO notifications (id, userId, role, type, message, referenceId, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, userId, role, type, message, referenceId, now);
        
        // Notify frontend via global.io
        if (global.io) {
            global.io.emit('notification_new', { userId, role });
        }
    } catch (error) {
        console.error('[SmartStock] Error creating notification:', error);
    }
};

// GET /api/notifications
// Retrieves notifications for the logged-in user
router.get('/', verifyToken, (req, res) => {
    try {
        const user = req.auth?.user;
        if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

        // User can see notifications addressed to their specific userId OR to their role
        // For admin, they might also see general admin notifications.
        // Assuming WAREHOUSE role has 'MANAGE_WAREHOUSE' and ADMIN has everything.
        // We'll filter by userId OR role = user.role
        const roleStr = user.role || '';
        
        let query = `
            SELECT * FROM notifications 
            WHERE userId = @userId OR role = @role
            ORDER BY createdAt DESC 
            LIMIT 50
        `;
        
        const notifications = db.prepare(query).all({
            userId: user.id || '',
            role: roleStr
        });

        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/notifications/read
// Mark a specific notification or all notifications as read
router.post('/read', verifyToken, (req, res) => {
    try {
        const user = req.auth?.user;
        if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { id, all } = req.body;
        
        if (all) {
            db.prepare(`
                UPDATE notifications 
                SET isRead = 1 
                WHERE userId = @userId OR role = @role
            `).run({ userId: user.id || '', role: user.role || '' });
        } else if (id) {
            db.prepare(`
                UPDATE notifications 
                SET isRead = 1 
                WHERE id = @id AND (userId = @userId OR role = @role)
            `).run({ id, userId: user.id || '', role: user.role || '' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Mark read notifications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/notifications/unread-count
router.get('/unread-count', verifyToken, (req, res) => {
    try {
        const user = req.auth?.user;
        if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const result = db.prepare(`
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE isRead = 0 AND (userId = @userId OR role = @role)
        `).get({ userId: user.id || '', role: user.role || '' });

        res.json({ success: true, count: result.count });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = {
    router,
    createNotification
};
