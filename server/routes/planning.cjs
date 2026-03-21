'use strict';
const express = require('express');
const router = express.Router();
const { db } = require('../db/database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');
const { requirePermission } = require('../middleware/permission.cjs');

// ===== PROJECTS =====

// GET /api/projects
router.get('/projects', verifyToken, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 200;
        const projects = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC LIMIT ?').all(limit);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/save
router.post('/projects/save', verifyToken, requirePermission('MANAGE_PLANNING'), (req, res) => {
    try {
        const pj = req.body;
        db.prepare(`
            INSERT INTO projects (id, code, name, address, phone, description, createdAt)
            VALUES (@id, @code, @name, @address, @phone, @description, @createdAt)
            ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                name = excluded.name,
                address = excluded.address,
                phone = excluded.phone,
                description = excluded.description
        `).run(pj);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/delete
router.post('/projects/delete', verifyToken, requirePermission('MANAGE_PLANNING'), (req, res) => {
    try {
        const { id } = req.body;
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== BUDGETS =====

// GET /api/budgets/all
router.get('/budgets/all', verifyToken, (req, res) => {
    try {
        const budgets = db.prepare('SELECT * FROM budgets ORDER BY createdAt DESC').all();
        // Parse items JSON
        const parsedBudgets = budgets.map(b => ({
            ...b,
            items: JSON.parse(b.items || '[]')
        }));
        res.json(parsedBudgets);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/budgets/save
router.post('/budgets/save', verifyToken, requirePermission('MANAGE_PLANNING'), (req, res) => {
    try {
        const bg = req.body;
        const itemsJson = JSON.stringify(bg.items || []);
        db.prepare(`
            INSERT INTO budgets (id, orderCode, orderName, projectCode, projectName, address, phone, description, status, workshop, items, createdAt, lastUpdated)
            VALUES (@id, @orderCode, @orderName, @projectCode, @projectName, @address, @phone, @description, @status, @workshop, @items, @createdAt, @lastUpdated)
            ON CONFLICT(id) DO UPDATE SET
                orderCode = excluded.orderCode,
                orderName = excluded.orderName,
                projectCode = excluded.projectCode,
                projectName = excluded.projectName,
                address = excluded.address,
                phone = excluded.phone,
                description = excluded.description,
                status = excluded.status,
                workshop = excluded.workshop,
                items = excluded.items,
                lastUpdated = excluded.lastUpdated
        `).run({ ...bg, items: itemsJson });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/budgets/delete
router.post('/budgets/delete', verifyToken, requirePermission('MANAGE_PLANNING'), (req, res) => {
    try {
        const { id } = req.body;
        db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
