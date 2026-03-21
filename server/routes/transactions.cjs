'use strict';
const express = require('express');
const router = express.Router();
const { db, roundQty, todayISO, txId, generateMaterialIdForWorkshop } = require('../db/database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');
const { requirePermission, hasPermission } = require('../middleware/permission.cjs');
const { createNotification } = require('./notifications.cjs');
const { isApprovalRequired } = require('./approval.cjs');

let _io = null;
const setIo = (io) => { _io = io; };

const notifyUpdate = () => { if (_io) _io.emit('data_updated'); };

const paginatedResponse = (data, total, page, limit) => ({
    data, total, page, limit, totalPages: Math.ceil(total / limit)
});

const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = query.search?.trim() || '';
    return { page, limit, offset, search };
};

// GET /api/transactions/planning
router.get('/planning', (req, res) => {
    try {
        res.json(db.prepare('SELECT * FROM transactions WHERE orderCode IS NOT NULL').all());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/transactions/all
router.get('/all', (req, res) => {
    try {
        res.json(db.prepare('SELECT * FROM transactions ORDER BY date DESC, transactionTime DESC').all());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/transactions/receipts
router.get('/receipts', (req, res) => {
    const { type } = req.query;
    const { page, limit, offset, search } = parsePagination(req.query);
    const conditions = [];
    const params = {};
    if (search) {
        conditions.push(`(t.materialId LIKE @search OR t.materialName LIKE @search OR t.user LIKE @search OR t.receiptId LIKE @search OR t.note LIKE @search)`);
        params.search = `%${search}%`;
    }
    if (type && type !== 'ALL') { conditions.push(`t.type = @type`); params.type = type; }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    try {
        const total = db.prepare(`SELECT COUNT(DISTINCT COALESCE(t.receiptId, t.id)) as c FROM transactions t ${whereClause}`).get(params).c;
        const groups = db.prepare(`
            SELECT COALESCE(t.receiptId, t.id) as groupId,
                MIN(t.date) as date, MIN(t.transactionTime) as transactionTime,
                MIN(t.type) as type, MIN(t.user) as user,
                COUNT(*) as itemCount, SUM(t.quantity) as totalQuantity
            FROM transactions t ${whereClause}
            GROUP BY COALESCE(t.receiptId, t.id)
            ORDER BY MIN(t.date) DESC, MIN(t.transactionTime) DESC
            LIMIT @limit OFFSET @offset
        `).all({ ...params, limit, offset });

        if (groups.length === 0) return res.json(paginatedResponse([], total, page, limit));

        const groupIds = groups.map(g => g.groupId);
        const ph = groupIds.map(() => '?').join(',');
        const allDetails = db.prepare(`SELECT * FROM transactions WHERE COALESCE(receiptId, id) IN (${ph}) ORDER BY date DESC, transactionTime DESC`).all(...groupIds);

        const detailMap = new Map();
        for (const tx of allDetails) {
            const key = tx.receiptId || tx.id;
            if (!detailMap.has(key)) detailMap.set(key, []);
            detailMap.get(key).push(tx);
        }

        const data = groups.map(g => ({
            receiptId: g.groupId, date: g.date, transactionTime: g.transactionTime,
            type: g.type, user: g.user, itemCount: g.itemCount,
            totalQuantity: g.totalQuantity, transactions: detailMap.get(g.groupId) || []
        }));
        res.json(paginatedResponse(data, total, page, limit));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/transactions
router.get('/', (req, res) => {
    const { type } = req.query;
    const { page, limit, offset, search } = parsePagination(req.query);
    const conditions = [];
    const params = {};
    if (search) {
        conditions.push(`(materialId LIKE @search OR materialName LIKE @search OR user LIKE @search OR receiptId LIKE @search OR note LIKE @search)`);
        params.search = `%${search}%`;
    }
    if (type && type !== 'ALL') { conditions.push(`type = @type`); params.type = type; }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    try {
        const total = db.prepare(`SELECT COUNT(*) as c FROM transactions ${whereClause}`).get(params).c;
        const data = db.prepare(`SELECT * FROM transactions ${whereClause} ORDER BY date DESC, transactionTime DESC LIMIT @limit OFFSET @offset`)
            .all({ ...params, limit, offset });
        res.json(paginatedResponse(data, total, page, limit));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/transactions/save
router.post('/save', (req, res) => {
    const tx = req.body;
    db.prepare(`INSERT OR REPLACE INTO transactions 
        (id, receiptId, materialId, materialName, type, quantity, date, transactionTime, user, workshop, targetWorkshop, targetMaterialId, orderCode, note)
        VALUES (@id, @receiptId, @materialId, @materialName, @type, @quantity, @date, @transactionTime, @user, @workshop, @targetWorkshop, @targetMaterialId, @orderCode, @note)`)
        .run({
            targetWorkshop: null, targetMaterialId: null, orderCode: null, note: null,
            transactionTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), ...tx
        });
    notifyUpdate();
    res.json({ success: true });
});

// POST /api/transactions/delete
router.post('/delete', (req, res) => {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.body.id);
    notifyUpdate();
    res.json({ success: true });
});

// POST /api/transactions/commit
router.post('/commit', (req, res) => {
    const { mode } = req.body || {};
    if (mode === 'TRANSFER') {
        if (!hasPermission(req.auth?.user, 'MANAGE_WAREHOUSE'))
            return res.status(403).json({ success: false, error: 'Forbidden' });
    } else if (!hasPermission(req.auth?.user, 'MANAGE_WAREHOUSE')) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const commitReceipt = db.transaction((payload, userRole) => {
        const { receiptType, receiptWorkshop, receiptId, receiptTime, receiptSupplier, orderCode, user, items } = payload || {};
        if (!Array.isArray(items) || items.length === 0) throw new Error('Danh sách vật tư trống.');
        if (!receiptWorkshop || !receiptType) throw new Error('Thiếu thông tin phiếu.');

        const isPrivileged = userRole === 'ADMIN';
        // Check approval toggle: if disabled, all OUT receipts auto-approve
        const approvalEnabled = isApprovalRequired();
        const needsApproval = receiptType === 'OUT' && !isPrivileged && approvalEnabled;
        const txStatus = needsApproval ? 'pending' : 'approved';
        const approvedBy = !needsApproval && receiptType === 'OUT' ? user : null;

        const updateMaterialQty = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");
        const insertMaterial = db.prepare(`INSERT INTO materials (id, name, classification, unit, quantity, minThreshold, lastUpdated, workshop, origin, note, image, customerCode)
            VALUES (@id, @name, @classification, @unit, @quantity, @minThreshold, @lastUpdated, @workshop, @origin, @note, @image, @customerCode)`);
        const insertTx = db.prepare(`INSERT INTO transactions 
            (id, receiptId, materialId, materialName, type, quantity, date, transactionTime, user, workshop, targetWorkshop, targetMaterialId, orderCode, note, status, approvedBy)
            VALUES (@id, @receiptId, @materialId, @materialName, @type, @quantity, @date, @transactionTime, @user, @workshop, @targetWorkshop, @targetMaterialId, @orderCode, @note, @status, @approvedBy)`);

        const txRows = [];
        for (const item of items) {
            const qty = roundQty(item.quantity);
            if (!(qty > 0)) continue;

            const baseMat = db.prepare("SELECT * FROM materials WHERE id = ?").get(item.materialId);
            if (!baseMat) throw new Error(`Không tìm thấy vật tư ${item.materialId}.`);

            let targetMat = db.prepare("SELECT * FROM materials WHERE workshop = ? AND name = ? AND origin = ? LIMIT 1")
                .get(receiptWorkshop, baseMat.name, baseMat.origin);

            if (!targetMat && receiptType === 'IN') {
                targetMat = { ...baseMat, id: generateMaterialIdForWorkshop(receiptWorkshop), workshop: receiptWorkshop, quantity: 0, lastUpdated: todayISO() };
                insertMaterial.run(targetMat);
            }
            if (!targetMat) throw new Error(`Vật tư ${baseMat.name} chưa có tại xưởng ${receiptWorkshop}.`);

            // For OUT receipts: check total pending + new qty vs current stock
            if (receiptType === 'OUT') {
                const pendingSum = db.prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM transactions WHERE materialId = ? AND status = 'pending' AND type = 'OUT'").get(targetMat.id);
                const currentMat = db.prepare("SELECT quantity FROM materials WHERE id = ?").get(targetMat.id);
                const currentStock = currentMat ? roundQty(currentMat.quantity) : 0;
                const totalPending = roundQty(pendingSum.total);
                if (totalPending + qty > currentStock) {
                    throw new Error(`Không đủ tồn kho cho ${targetMat.name}. Hiện có: ${currentStock} ${baseMat.unit}, đang chờ duyệt: ${totalPending} ${baseMat.unit}, yêu cầu thêm: ${qty} ${baseMat.unit}`);
                }
            }

            if (txStatus === 'approved') {
                if (receiptType === 'OUT') {
                    const result = db.prepare("UPDATE materials SET quantity = quantity - ?, lastUpdated = ? WHERE id = ? AND quantity >= ?")
                        .run(qty, todayISO(), targetMat.id, qty);
                    if (result.changes === 0) {
                        const currentMat = db.prepare("SELECT quantity FROM materials WHERE id = ?").get(targetMat.id);
                        throw new Error(`Không đủ tồn kho cho ${targetMat.name}. Hiện có: ${currentMat ? roundQty(currentMat.quantity) : 0} ${baseMat.unit}, yêu cầu: ${qty} ${baseMat.unit}`);
                    }
                } else {
                    updateMaterialQty.run(roundQty(Number(targetMat.quantity) + qty), todayISO(), targetMat.id);
                }
            }

            txRows.push({
                id: txId('tx'), receiptId: receiptId || txId(receiptType === 'IN' ? 'PNK' : 'PXK'),
                materialId: targetMat.id, materialName: targetMat.name, type: receiptType, quantity: qty,
                date: receiptTime || todayISO(),
                transactionTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                user: user || 'SYSTEM', workshop: receiptWorkshop, targetWorkshop: null, targetMaterialId: null,
                orderCode: orderCode || null, note: receiptType === 'IN' ? (receiptSupplier || null) : null,
                status: txStatus, approvedBy
            });
        }

        if (txRows.length === 0) throw new Error('Không có vật tư hợp lệ để tạo phiếu.');
        for (const row of txRows) insertTx.run(row);
        return { affected: txRows.length, status: txStatus, receiptId: txRows[0] ? txRows[0].receiptId : null };
    });

    const commitTransfer = db.transaction((payload) => {
        const { fromWorkshop, toWorkshop, receiptId, orderCode, user, items } = payload || {};
        if (!Array.isArray(items) || items.length === 0) throw new Error('Danh sách điều chuyển trống.');
        if (!fromWorkshop || !toWorkshop || fromWorkshop === toWorkshop) throw new Error('Kho nguồn/đích không hợp lệ.');

        const updateMaterialQty = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");
        const insertMaterial = db.prepare(`INSERT INTO materials (id, name, classification, unit, quantity, minThreshold, lastUpdated, workshop, origin, note, image, customerCode)
            VALUES (@id, @name, @classification, @unit, @quantity, @minThreshold, @lastUpdated, @workshop, @origin, @note, @image, @customerCode)`);
        const insertTx = db.prepare(`INSERT INTO transactions 
            (id, receiptId, materialId, materialName, type, quantity, date, transactionTime, user, workshop, targetWorkshop, targetMaterialId, orderCode, note)
            VALUES (@id, @receiptId, @materialId, @materialName, @type, @quantity, @date, @transactionTime, @user, @workshop, @targetWorkshop, @targetMaterialId, @orderCode, @note)`);

        let affected = 0;
        for (const item of items) {
            const qty = roundQty(item.quantity);
            if (!(qty > 0)) continue;

            const sourceMat = db.prepare("SELECT * FROM materials WHERE id = ? AND workshop = ?").get(item.materialId, fromWorkshop);
            if (!sourceMat) throw new Error(`Không tìm thấy vật tư ${item.materialId} tại kho nguồn.`);

            const result = db.prepare("UPDATE materials SET quantity = quantity - ?, lastUpdated = ? WHERE id = ? AND quantity >= ?")
                .run(qty, todayISO(), sourceMat.id, qty);
            if (result.changes === 0) {
                const currentMat = db.prepare("SELECT quantity FROM materials WHERE id = ?").get(sourceMat.id);
                throw new Error(`Không đủ tồn kho cho ${sourceMat.name} tại ${fromWorkshop}. Hiện có: ${currentMat ? roundQty(currentMat.quantity) : 0} ${sourceMat.unit}, yêu cầu: ${qty} ${sourceMat.unit}`);
            }

            let destMat = db.prepare("SELECT * FROM materials WHERE workshop = ? AND name = ? AND origin = ? LIMIT 1")
                .get(toWorkshop, sourceMat.name, sourceMat.origin);
            if (!destMat) {
                destMat = { ...sourceMat, id: generateMaterialIdForWorkshop(toWorkshop), workshop: toWorkshop, quantity: 0, lastUpdated: todayISO() };
                insertMaterial.run(destMat);
            }
            updateMaterialQty.run(roundQty(Number(destMat.quantity) + qty), todayISO(), destMat.id);

            insertTx.run({
                id: txId('tr'), receiptId: receiptId || txId('PDC'),
                materialId: sourceMat.id, materialName: sourceMat.name, type: 'TRANSFER', quantity: qty,
                date: todayISO(), transactionTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                user: user || 'SYSTEM', workshop: fromWorkshop, targetWorkshop: toWorkshop,
                targetMaterialId: destMat.id, orderCode: orderCode || null, note: null
            });
            affected += 1;
        }
        if (!affected) throw new Error('Không có vật tư hợp lệ để điều chuyển.');
        return { affected };
    });

    try {
        let result;
        if (mode === 'TRANSFER') {
            result = commitTransfer(req.body.payload || {});
        } else {
            result = commitReceipt(req.body.payload || {}, req.auth?.user?.role || req.user?.role || 'GUEST');
            if (result.status === 'pending') {
                createNotification(
                    null, 'ADMIN', 'receipt_pending',
                    `Có phiếu xuất kho mới cần duyệt từ ${req.auth?.user?.fullName || req.auth?.user?.username || 'nhân viên'}`,
                    result.receiptId
                );
            }
        }
        notifyUpdate();
        return res.json({ success: true, ...result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Commit failed' });
    }
});

// POST /api/transactions/delete_with_revert
router.post('/delete_with_revert', requirePermission('MANAGE_WAREHOUSE'), (req, res) => {
    const revertDelete = db.transaction((id) => {
        const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
        if (!tx) throw new Error('Không tìm thấy giao dịch.');

        const newerTx = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE materialId = ? AND date > ? AND id != ?")
            .get(tx.materialId, tx.date, tx.id);
        if (newerTx?.count > 0)
            throw new Error(`Không thể xóa vì đã có ${newerTx.count} giao dịch mới hơn.`);

        const updateMaterialQty = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");
        const findById = db.prepare("SELECT * FROM materials WHERE id = ? LIMIT 1");
        const findByNameWorkshop = db.prepare("SELECT * FROM materials WHERE name = ? AND workshop = ? LIMIT 1");

        if (tx.type === 'IN') {
            const mat = findById.get(tx.materialId);
            if (mat) {
                const newQty = roundQty(Number(mat.quantity) - Number(tx.quantity));
                if (newQty < 0) throw new Error(`Không thể xóa vì sẽ làm tồn kho âm.`);
                updateMaterialQty.run(newQty, todayISO(), mat.id);
            }
        } else if (tx.type === 'OUT') {
            const mat = findById.get(tx.materialId);
            if (mat) updateMaterialQty.run(roundQty(Number(mat.quantity) + Number(tx.quantity)), todayISO(), mat.id);
        } else if (tx.type === 'TRANSFER') {
            const sourceMat = findById.get(tx.materialId) || findByNameWorkshop.get(tx.materialName, tx.workshop);
            if (sourceMat) updateMaterialQty.run(roundQty(Number(sourceMat.quantity) + Number(tx.quantity)), todayISO(), sourceMat.id);
            const destMat = tx.targetMaterialId ? findById.get(tx.targetMaterialId) : findByNameWorkshop.get(tx.materialName, tx.targetWorkshop);
            if (destMat) {
                const newQty = roundQty(Number(destMat.quantity) - Number(tx.quantity));
                if (newQty < 0) throw new Error(`Không thể xóa vì sẽ làm tồn kho âm tại xưởng đích.`);
                updateMaterialQty.run(newQty, todayISO(), destMat.id);
            }
        }
        db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
        return true;
    });

    try {
        revertDelete(req.body.id);
        notifyUpdate();
        return res.json({ success: true });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
});

// POST /api/transactions/update
router.post('/update', verifyToken, requirePermission('MANAGE_WAREHOUSE'), (req, res) => {
    const { id, quantity } = req.body;
    if (!id || !quantity || quantity <= 0)
        return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ.' });

    const updateTransaction = db.transaction(() => {
        const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
        if (!tx) throw new Error('Không tìm thấy giao dịch.');

        const oldQuantity = Number(tx.quantity);
        const newQuantity = Number(quantity);
        const quantityDiff = newQuantity - oldQuantity;
        if (quantityDiff === 0) return { success: true, message: 'Không có thay đổi.' };

        const updateMaterialQty = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");
        const findById = db.prepare("SELECT * FROM materials WHERE id = ? LIMIT 1");
        const findByNameWorkshop = db.prepare("SELECT * FROM materials WHERE name = ? AND workshop = ? LIMIT 1");

        if (tx.type === 'IN') {
            const mat = findById.get(tx.materialId);
            if (mat) updateMaterialQty.run(roundQty(Number(mat.quantity) + quantityDiff), todayISO(), mat.id);
        } else if (tx.type === 'OUT') {
            const mat = findById.get(tx.materialId);
            if (mat) {
                const newQty = roundQty(Number(mat.quantity) - quantityDiff);
                if (newQty < 0) throw new Error('Số lượng tồn kho không đủ.');
                updateMaterialQty.run(newQty, todayISO(), mat.id);
            }
        } else if (tx.type === 'TRANSFER') {
            const sourceMat = findById.get(tx.materialId) || findByNameWorkshop.get(tx.materialName, tx.workshop);
            if (sourceMat) {
                const newQty = roundQty(Number(sourceMat.quantity) - quantityDiff);
                if (newQty < 0) throw new Error('Số lượng tồn kho nguồn không đủ.');
                updateMaterialQty.run(newQty, todayISO(), sourceMat.id);
            }
            const destMat = tx.targetMaterialId ? findById.get(tx.targetMaterialId) : findByNameWorkshop.get(tx.materialName, tx.targetWorkshop);
            if (destMat) updateMaterialQty.run(roundQty(Number(destMat.quantity) + quantityDiff), todayISO(), destMat.id);
        }

        db.prepare("UPDATE transactions SET quantity = ? WHERE id = ?").run(newQuantity, id);
        return { success: true, message: 'Cập nhật thành công.' };
    });

    try {
        const result = updateTransaction();
        notifyUpdate();
        res.json(result);
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = { router, setIo };