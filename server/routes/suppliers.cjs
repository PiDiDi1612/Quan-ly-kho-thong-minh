'use strict';
const express = require('express');
const router = express.Router();
const { db } = require('../db/database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');
const { requirePermission } = require('../middleware/permission.cjs');

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

// GET /api/suppliers
router.get('/', (req, res) => {
    const { page, limit, offset, search } = parsePagination(req.query);
    const conditions = [];
    const params = {};
    if (search) {
        conditions.push(`(code LIKE @search OR name LIKE @search OR contactPerson LIKE @search OR phone LIKE @search)`);
        params.search = `%${search}%`;
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    try {
        const total = db.prepare(`SELECT COUNT(*) as c FROM suppliers ${whereClause}`).get(params).c;
        const data = db.prepare(`SELECT * FROM suppliers ${whereClause} ORDER BY createdAt DESC LIMIT @limit OFFSET @offset`)
            .all({ ...params, limit, offset });
        res.json(paginatedResponse(data, total, page, limit));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CUSTOMER CODES =====
router.get('/customer-codes', verifyToken, (req, res) => {
    try {
        res.json(db.prepare('SELECT * FROM customer_codes ORDER BY code').all());
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/customer-codes/save', verifyToken, requirePermission('MANAGE_SUPPLIERS'), (req, res) => {
    try {
        const code = req.body;
        const now = new Date().toISOString();
        if (code.id) {
            db.prepare(`UPDATE customer_codes SET code = ?, name = ?, description = ?, updatedAt = ? WHERE id = ?`)
                .run(code.code, code.name, code.description || null, now, code.id);
        } else {
            const newId = `CC${String(Date.now()).slice(-6)}`;
            db.prepare(`INSERT INTO customer_codes (id, code, name, description, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)`)
                .run(newId, code.code, code.name, code.description || null, now, req.user.userId);
        }
        res.json({ success: true });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ success: false, error: 'Mã khách đã tồn tại.' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

router.post('/customer-codes/delete', verifyToken, requirePermission('MANAGE_SUPPLIERS'), (req, res) => {
    try {
        const { id } = req.body;
        const materialsUsingCode = db.prepare(
            'SELECT COUNT(*) as count FROM materials WHERE customerCode = (SELECT code FROM customer_codes WHERE id = ?)'
        ).get(id);
        if (materialsUsingCode.count > 0)
            return res.status(400).json({ success: false, error: `Không thể xóa vì đang được dùng bởi ${materialsUsingCode.count} vật tư.` });
        db.prepare('DELETE FROM customer_codes WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/customer-codes/import', verifyToken, requirePermission('MANAGE_SUPPLIERS'), (req, res) => {
    try {
        const { codes } = req.body;
        if (!Array.isArray(codes) || codes.length === 0)
            return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ.' });

        const now = new Date().toISOString();
        const userId = req.user.userId;
        const insertStmt = db.prepare(`
            INSERT INTO customer_codes (id, code, name, description, createdAt, createdBy)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET name=excluded.name, description=excluded.description, updatedAt=?
        `);

        const transaction = db.transaction((codes) => {
            let imported = 0, updated = 0;
            for (const code of codes) {
                if (!code.code || !code.name) continue;
                const existing = db.prepare('SELECT id FROM customer_codes WHERE code = ?').get(code.code);
                const id = existing ? existing.id : `CC${String(Date.now() + Math.random()).slice(-8)}`;
                insertStmt.run(id, code.code.trim(), code.name.trim(), code.description?.trim() || null, now, userId, now);
                if (existing) updated++; else imported++;
            }
            return { imported, updated };
        });

        const result = transaction(codes);
        res.json({ success: true, ...result, total: result.imported + result.updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/customer-codes/merge', verifyToken, requirePermission('MANAGE_SUPPLIERS'), (req, res) => {
    try {
        const { supplierIds, primaryCode, primaryName, description } = req.body;
        if (!Array.isArray(supplierIds) || supplierIds.length < 2)
            return res.status(400).json({ success: false, error: 'Vui lòng chọn ít nhất 2 NCC để hợp nhất.' });
        if (!primaryCode || !primaryName)
            return res.status(400).json({ success: false, error: 'Vui lòng chọn Mã NCC và Tên NCC chính.' });

        const mergeTransaction = db.transaction(() => {
            const suppliers = db.prepare(`SELECT * FROM customer_codes WHERE id IN (${supplierIds.map(() => '?').join(',')})`).all(...supplierIds);
            if (suppliers.length !== supplierIds.length) throw new Error('Một số NCC không tồn tại.');

            const supplierCodes = suppliers.map(s => s.code);
            const primarySupplier = suppliers.find(s => s.code === primaryCode);
            if (!primarySupplier) throw new Error('Mã NCC chính không hợp lệ.');

            const now = new Date().toISOString();
            db.prepare(`UPDATE customer_codes SET name = ?, description = ?, updatedAt = ? WHERE id = ?`)
                .run(primaryName, description || null, now, primarySupplier.id);

            const otherCodes = supplierCodes.filter(c => c !== primaryCode);
            if (otherCodes.length > 0) {
                db.prepare(`UPDATE transactions SET orderCode = ? WHERE orderCode IN (${otherCodes.map(() => '?').join(',')})`)
                    .run(primaryCode, ...otherCodes);
            }

            const otherIds = supplierIds.filter(id => id !== primarySupplier.id);
            if (otherIds.length > 0) {
                db.prepare(`DELETE FROM customer_codes WHERE id IN (${otherIds.map(() => '?').join(',')})`).run(...otherIds);
            }

            return { mergedCount: otherIds.length, primaryCode, primaryName };
        });

        const result = mergeTransaction();
        notifyUpdate();
        res.json({ success: true, message: `Đã hợp nhất ${result.mergedCount} NCC vào ${result.primaryCode}`, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = { router, setIo };