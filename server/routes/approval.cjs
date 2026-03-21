'use strict';
const express = require('express');
const router = express.Router();
const { db, roundQty, todayISO } = require('../db/database.cjs');
const { hasPermission } = require('../middleware/permission.cjs');
const { createNotification } = require('./notifications.cjs');

let _io = null;
const setIo = (io) => { _io = io; };
const notifyUpdate = () => { if (_io) _io.emit('data_updated'); };

// Helper: check if approval is required
const isApprovalRequired = () => {
    try {
        const row = db.prepare("SELECT value FROM system_settings WHERE key = 'approval_required'").get();
        return !row || row.value !== 'false'; // default true
    } catch { return true; }
};

// GET /api/approval/pending — accessible by WAREHOUSE + ADMIN
router.get('/pending', (req, res) => {
    try {
        const user = req.auth?.user;
        const role = user?.role;
        if (role !== 'ADMIN' && role !== 'WAREHOUSE' && !hasPermission(user, 'APPROVE_TRANSACTION') && !hasPermission(user, 'VIEW_TRANSACTION'))
            return res.status(403).json({ success: false, error: 'Bạn không có quyền xem phiếu chờ duyệt.' });

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

// GET /api/approval/history — view approved/rejected receipts
router.get('/history', (req, res) => {
    try {
        const user = req.auth?.user;
        const role = user?.role;
        if (role !== 'ADMIN' && role !== 'WAREHOUSE' && !hasPermission(user, 'APPROVE_TRANSACTION') && !hasPermission(user, 'VIEW_TRANSACTION'))
            return res.status(403).json({ success: false, error: 'Bạn không có quyền xem lịch sử duyệt phiếu.' });

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;
        const statusFilter = req.query.status; // 'approved', 'rejected', or undefined for both

        let whereClause = "t.status IN ('approved', 'rejected') AND t.type = 'OUT'";
        const params = { limit, offset };
        if (statusFilter === 'approved' || statusFilter === 'rejected') {
            whereClause = `t.status = @statusFilter AND t.type = 'OUT'`;
            params.statusFilter = statusFilter;
        }

        const total = db.prepare(`SELECT COUNT(DISTINCT COALESCE(t.receiptId, t.id)) as c FROM transactions t WHERE ${whereClause}`).get(params).c;

        const groups = db.prepare(`
            SELECT COALESCE(t.receiptId, t.id) as groupId,
                MIN(t.date) as date, MIN(t.transactionTime) as transactionTime,
                MIN(t.user) as user, MIN(t.workshop) as workshop,
                MIN(t.status) as status, MIN(t.approvedBy) as approvedBy,
                MIN(t.rejectedReason) as rejectedReason,
                COUNT(*) as itemCount, SUM(t.quantity) as totalQuantity
            FROM transactions t
            WHERE ${whereClause}
            GROUP BY COALESCE(t.receiptId, t.id)
            ORDER BY MIN(t.date) DESC, MIN(t.transactionTime) DESC
            LIMIT @limit OFFSET @offset
        `).all(params);

        res.json({
            success: true,
            data: groups,
            total, page, limit,
            totalPages: Math.ceil(total / limit)
        });
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

// GET /api/approval/settings — get approval toggle state
router.get('/settings', (req, res) => {
    try {
        res.json({ success: true, approvalRequired: isApprovalRequired() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/approval/settings — toggle approval on/off (ADMIN only)
router.post('/settings', (req, res) => {
    const user = req.auth?.user;
    if (user?.role !== 'ADMIN')
        return res.status(403).json({ success: false, error: 'Chỉ Admin mới có thể thay đổi cài đặt duyệt phiếu.' });

    const { approvalRequired } = req.body;
    try {
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('approval_required', ?)").run(approvalRequired ? 'true' : 'false');
        notifyUpdate();
        if (_io) _io.emit('approval_settings_changed', { approvalRequired: !!approvalRequired });
        res.json({ success: true, approvalRequired: !!approvalRequired });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/approval/approve — ADMIN only
router.post('/approve', (req, res) => {
    const user = req.auth?.user;
    if (!hasPermission(user, 'APPROVE_TRANSACTION'))
        return res.status(403).json({ success: false, error: 'Bạn không có quyền duyệt phiếu.' });

    const { receiptId } = req.body;
    if (!receiptId) return res.status(400).json({ success: false, error: 'Thiếu receiptId.' });

    const approveReceipt = db.transaction(() => {
        const pendingTxs = db.prepare("SELECT * FROM transactions WHERE (receiptId = ? OR id = ?) AND status = 'pending'").all(receiptId, receiptId);
        if (pendingTxs.length === 0) throw new Error('Không tìm thấy phiếu chờ duyệt.');

        // Aggregate quantities per material to check stock
        const materialQtyMap = new Map();
        for (const tx of pendingTxs) {
            const qty = roundQty(tx.quantity);
            materialQtyMap.set(tx.materialId, (materialQtyMap.get(tx.materialId) || 0) + qty);
        }

        // Pre-check all materials have enough stock
        for (const [matId, totalQty] of materialQtyMap) {
            const currentMat = db.prepare("SELECT quantity, name FROM materials WHERE id = ?").get(matId);
            if (!currentMat || roundQty(currentMat.quantity) < totalQty) {
                throw new Error(`Không đủ tồn kho cho ${currentMat?.name || matId}. Hiện có: ${currentMat ? roundQty(currentMat.quantity) : 0}, yêu cầu: ${totalQty}`);
            }
        }

        // Execute stock deductions
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
        return { affected: pendingTxs.length, creatorName: pendingTxs[0].user };
    });

    try {
        const result = approveReceipt();
        notifyUpdate();
        
        // Notify creator
        const creator = db.prepare("SELECT id FROM users WHERE username = ? OR fullName = ?").get(result.creatorName, result.creatorName);
        if (creator) {
            createNotification(creator.id, null, 'receipt_approved', `Phiếu xuất kho ${receiptId} của bạn đã được duyệt bởi ${user.fullName || user.username}`, receiptId);
        } else {
            createNotification(null, 'WAREHOUSE', 'receipt_approved', `Phiếu xuất kho ${receiptId} đã được duyệt bởi ${user.fullName || user.username}`, receiptId);
        }

        if (_io) _io.emit('approval_updated', { receiptId, action: 'approved', by: user.fullName || user.username });
        return res.json({ success: true, ...result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
});

// POST /api/approval/reject — ADMIN only
router.post('/reject', (req, res) => {
    const user = req.auth?.user;
    if (!hasPermission(user, 'APPROVE_TRANSACTION'))
        return res.status(403).json({ success: false, error: 'Bạn không có quyền từ chối phiếu.' });

    const { receiptId, reason } = req.body;
    if (!receiptId) return res.status(400).json({ success: false, error: 'Thiếu receiptId.' });
    if (!reason?.trim()) return res.status(400).json({ success: false, error: 'Vui lòng nhập lý do từ chối.' });

    try {
        // Find creator first
        const pendingTxs = db.prepare("SELECT user FROM transactions WHERE (receiptId = ? OR id = ?) AND status = 'pending' LIMIT 1").get(receiptId, receiptId);
        const creatorName = pendingTxs ? pendingTxs.user : null;

        const result = db.prepare("UPDATE transactions SET status = 'rejected', rejectedReason = ?, approvedBy = ? WHERE (receiptId = ? OR id = ?) AND status = 'pending'")
            .run(reason.trim(), user.fullName || user.username, receiptId, receiptId);
        if (result.changes === 0)
            return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu chờ duyệt.' });
        notifyUpdate();
        
        // Notify creator
        if (creatorName) {
            const creator = db.prepare("SELECT id FROM users WHERE username = ? OR fullName = ?").get(creatorName, creatorName);
            if (creator) {
                createNotification(creator.id, null, 'receipt_rejected', `Phiếu xuất kho ${receiptId} của bạn đã bị từ chối bởi ${user.fullName || user.username} (Lý do: ${reason.trim()})`, receiptId);
            } else {
                createNotification(null, 'WAREHOUSE', 'receipt_rejected', `Phiếu xuất kho ${receiptId} đã bị từ chối bởi ${user.fullName || user.username} (Lý do: ${reason.trim()})`, receiptId);
            }
        }

        if (_io) _io.emit('approval_updated', { receiptId, action: 'rejected', by: user.fullName || user.username, reason: reason.trim() });
        return res.json({ success: true, affected: result.changes });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = { router, setIo, isApprovalRequired };