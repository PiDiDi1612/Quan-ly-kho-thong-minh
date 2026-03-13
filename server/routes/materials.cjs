'use strict';
const express = require('express');
const router = express.Router();
const { db, todayISO, generateMaterialIdForWorkshop } = require('../db/database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');
const { requirePermission, validateFields, VALID_WORKSHOPS, VALID_CLASSIFICATIONS } = require('../middleware/permission.cjs');

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

// GET /api/materials — paginated with optional stock range
router.get('/', (req, res) => {
    const { startDate, endDate, workshop, classification } = req.query;
    const { page, limit, offset, search } = parsePagination(req.query);

    const conditions = [];
    const params = {};
    if (search) { conditions.push(`(m.name LIKE @search OR m.id LIKE @search OR m.origin LIKE @search)`); params.search = `%${search}%`; }
    if (workshop && workshop !== 'ALL') { conditions.push(`m.workshop = @workshop`); params.workshop = workshop; }
    if (classification && classification !== 'ALL') { conditions.push(`m.classification = @classification`); params.classification = classification; }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    if (!startDate || !endDate) {
        try {
            const total = db.prepare(`SELECT COUNT(*) as c FROM materials m ${whereClause}`).get(params).c;
            const data = db.prepare(`SELECT * FROM materials m ${whereClause} ORDER BY m.workshop, m.name LIMIT @limit OFFSET @offset`)
                .all({ ...params, limit, offset });
            return res.json(paginatedResponse(data, total, page, limit));
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    try {
        const total = db.prepare(`SELECT COUNT(*) as c FROM materials m ${whereClause}`).get(params).c;
        const pageRows = db.prepare(`SELECT m.id FROM materials m ${whereClause} ORDER BY m.workshop, m.name LIMIT @limit OFFSET @offset`)
            .all({ ...params, limit, offset });

        if (pageRows.length === 0) return res.json(paginatedResponse([], total, page, limit));

        const ids = pageRows.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');
        const sql = `
            WITH page_materials AS (SELECT * FROM materials WHERE id IN (${placeholders})),
            ts AS (
                SELECT m_id,
                    SUM(CASE WHEN date > ? THEN qty ELSE 0 END) as net_after,
                    SUM(CASE WHEN date >= ? THEN qty ELSE 0 END) as net_from_start,
                    SUM(CASE WHEN date BETWEEN ? AND ? AND is_in = 1 THEN quantity ELSE 0 END) as p_in,
                    SUM(CASE WHEN date BETWEEN ? AND ? AND is_in = 0 THEN quantity ELSE 0 END) as p_out
                FROM (
                    SELECT materialId as m_id, date, quantity,
                        CASE WHEN type='IN' THEN quantity WHEN type='OUT' THEN -quantity WHEN type='TRANSFER' THEN -quantity ELSE 0 END as qty,
                        (CASE WHEN type='IN' THEN 1 ELSE 0 END) as is_in
                    FROM transactions WHERE materialId IN (${placeholders})
                    UNION ALL
                    SELECT targetMaterialId as m_id, date, quantity, quantity as qty, 1 as is_in
                    FROM transactions WHERE type='TRANSFER' AND targetMaterialId IN (${placeholders})
                ) GROUP BY m_id
            )
            SELECT pm.*,
                (pm.quantity - COALESCE(ts.net_after, 0)) as closingStock,
                (pm.quantity - COALESCE(ts.net_from_start, 0)) as openingStock,
                COALESCE(ts.p_in, 0) as periodIn, COALESCE(ts.p_out, 0) as periodOut
            FROM page_materials pm LEFT JOIN ts ON pm.id = ts.m_id
            ORDER BY pm.workshop, pm.name
        `;
        const sqlParams = [...ids, endDate, startDate, startDate, endDate, startDate, endDate, ...ids, ...ids];
        const data = db.prepare(sql).all(...sqlParams);
        res.json(paginatedResponse(data, total, page, limit));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/materials/all — full list for dropdowns
router.get('/all', (req, res) => {
    try {
        res.json(db.prepare('SELECT * FROM materials').all());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/materials/save — create or update
router.post('/save', verifyToken, (req, res) => {
    const material = { note: '', image: '', customerCode: '', ...req.body };
    const { name, unit, workshop, classification } = material;

    const validErr = validateFields({ name, unit, workshop });
    if (validErr) return res.status(400).json({ success: false, error: validErr });
    if (String(name).trim().length < 2)
        return res.status(400).json({ success: false, error: 'Tên vật tư phải có ít nhất 2 ký tự.' });
    if (!VALID_WORKSHOPS.includes(workshop))
        return res.status(400).json({ success: false, error: 'Workshop không hợp lệ.' });
    if (classification && !VALID_CLASSIFICATIONS.includes(classification))
        return res.status(400).json({ success: false, error: 'Phân loại không hợp lệ.' });

    db.prepare(`
        INSERT INTO materials (id, name, classification, unit, quantity, minThreshold, lastUpdated, workshop, origin, note, image, customerCode)
        VALUES (@id, @name, @classification, @unit, @quantity, @minThreshold, @lastUpdated, @workshop, @origin, @note, @image, @customerCode)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, classification=excluded.classification, unit=excluded.unit,
            quantity=excluded.quantity, minThreshold=excluded.minThreshold, lastUpdated=excluded.lastUpdated,
            workshop=excluded.workshop, origin=excluded.origin, note=excluded.note, image=excluded.image,
            customerCode=excluded.customerCode
    `).run(material);
    require('../db/database.cjs'); // notifyUpdate handled by index
    res.json({ success: true });
});

// DELETE /api/materials/:id
router.delete('/:id(*)', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    const { id } = req.params;
    const hasTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE materialId = ? OR targetMaterialId = ?').get(id, id);
    if (hasTransactions.count > 0) {
        return res.status(400).json({
            success: false,
            error: `Không thể xóa vật tư này vì đã có ${hasTransactions.count} giao dịch liên quan.`
        });
    }
    db.prepare('DELETE FROM materials WHERE id = ?').run(id);
    res.json({ success: true });
});

// POST /api/materials/merge
router.post('/merge', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    const { materialIds, mergedMaterial } = req.body;
    if (!materialIds || !Array.isArray(materialIds) || materialIds.length < 2)
        return res.status(400).json({ success: false, error: 'Vui lòng chọn ít nhất 2 vật tư để hợp nhất.' });
    if (!mergedMaterial?.name || !mergedMaterial?.unit)
        return res.status(400).json({ success: false, error: 'Thông tin vật tư hợp nhất không hợp lệ.' });

    const mergeMaterials = db.transaction(() => {
        const materials = materialIds.map(id => {
            const mat = db.prepare("SELECT * FROM materials WHERE id = ?").get(id);
            if (!mat) throw new Error(`Không tìm thấy vật tư: ${id}`);
            return mat;
        });
        if ([...new Set(materials.map(m => m.workshop))].length > 1)
            throw new Error('Chỉ có thể hợp nhất vật tư cùng kho.');
        if ([...new Set(materials.map(m => m.unit))].length > 1)
            throw new Error('Chỉ có thể hợp nhất vật tư cùng đơn vị.');

        const newMaterialId = `MAT-${Date.now()}`;
        const now = todayISO();
        db.prepare(`INSERT INTO materials (id, name, classification, unit, quantity, minThreshold, workshop, origin, note, lastUpdated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(newMaterialId, mergedMaterial.name, mergedMaterial.classification, mergedMaterial.unit,
                mergedMaterial.quantity, materials[0].minThreshold || 10,
                mergedMaterial.workshop, mergedMaterial.origin || '', mergedMaterial.note || '', now);

        const updateTx = db.prepare(`UPDATE transactions SET materialId = ?, materialName = ? WHERE materialId = ?`);
        const updateTarget = db.prepare(`UPDATE transactions SET targetMaterialId = ? WHERE targetMaterialId = ?`);
        const deleteMat = db.prepare('DELETE FROM materials WHERE id = ?');
        materialIds.forEach(oldId => {
            updateTx.run(newMaterialId, mergedMaterial.name, oldId);
            updateTarget.run(newMaterialId, oldId);
            deleteMat.run(oldId);
        });
        return { success: true, newMaterialId, mergedCount: materialIds.length };
    });

    try {
        const result = mergeMaterials();
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;