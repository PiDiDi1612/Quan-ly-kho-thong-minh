'use strict';
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, dataDir, parseJsonSafe } = require('../db/database.cjs');
const { requirePermission } = require('../middleware/permission.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');

let _io = null;
const setIo = (io) => { _io = io; };

const BACKUP_MAX_COUNT = parseInt(process.env.BACKUP_MAX_COUNT) || 30;
const backupDir = process.env.BACKUP_DIR || path.join(dataDir, '..', 'backup');

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

// ===== BACKUP HELPERS =====
const rotateBackups = () => {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('smartstock_backup_') && f.endsWith('.db'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
            .sort((a, b) => b.time - a.time);
        if (files.length > BACKUP_MAX_COUNT) {
            for (const file of files.slice(BACKUP_MAX_COUNT)) {
                fs.unlinkSync(path.join(backupDir, file.name));
                console.log(`[SmartStock] Deleted old backup: ${file.name}`);
            }
        }
    } catch (err) {
        console.error('[SmartStock] Backup rotation error:', err.message);
    }
};

const performBackup = () => {
    try {
        const now = new Date();
        const filename = `smartstock_backup_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.db`;
        const destPath = path.join(backupDir, filename);

        db.backup(destPath).then(() => {
            const stats = fs.statSync(destPath);
            console.log(`[SmartStock] Backup completed: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
            if (_io) _io.emit('backup:completed', { success: true, filename, timestamp: now.toISOString(), sizeBytes: stats.size });
            rotateBackups();
        }).catch(err => {
            console.error('[SmartStock] Backup failed:', err.message);
            if (_io) _io.emit('backup:completed', { success: false, error: err.message });
        });
    } catch (err) {
        console.error('[SmartStock] Backup error:', err.message);
    }
};

// POST /api/backups/trigger
router.post('/trigger', requirePermission('MANAGE_SETTINGS'), (req, res) => {
    try {
        performBackup();
        res.json({ success: true, message: 'Backup đã được khởi chạy.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/backups/recent
router.get('/recent', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        if (!fs.existsSync(backupDir)) return res.json({ success: true, backups: [] });
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('smartstock_backup_') && f.endsWith('.db'))
            .map(f => {
                const stats = fs.statSync(path.join(backupDir, f));
                return { filename: f, sizeBytes: stats.size, createdAt: stats.mtime.toISOString() };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
        res.json({ success: true, backups: files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/backups/restore
router.post('/restore', requirePermission('MANAGE_SETTINGS'), (req, res) => {
    const { filename } = req.body;
    if (!filename || !filename.endsWith('.db'))
        return res.status(400).json({ success: false, error: 'Tên file backup không hợp lệ.' });
    const backupPath = path.join(backupDir, filename);
    if (!fs.existsSync(backupPath))
        return res.status(404).json({ success: false, error: 'File backup không tồn tại.' });
    try {
        const destPath = path.join(dataDir, 'data.db');
        db.close();
        fs.copyFileSync(backupPath, destPath);
        res.json({ success: true, message: 'Khôi phục thành công. Server sẽ tự khởi động lại.' });
        setTimeout(() => process.exit(0), 1000);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/backup — export to Desktop
router.post('/export', requirePermission('EXPORT_DATA'), (req, res) => {
    try {
        const os = require('os');
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = path.join(desktopPath, `SmartStock_Backup_${timestamp}.db`);
        const dbPath = path.join(dataDir, 'data.db');
        if (!fs.existsSync(dbPath))
            return res.status(404).json({ success: false, error: 'Database file not found' });
        db.backup(backupPath)
            .then(() => res.json({ success: true, path: backupPath }))
            .catch(err => res.status(500).json({ success: false, error: err.message }));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/download-db
router.get('/download-db', requirePermission('EXPORT_DATA'), async (req, res) => {
    try {
        const tempPath = path.join(dataDir, `backup_temp_${Date.now()}.db`);
        await db.backup(tempPath);
        res.download(tempPath, 'SmartStock_Data.db', () => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== INVENTORY CHECKS =====
router.get('/inventory-checks', authMiddleware, (req, res) => {
    try {
        const checks = db.prepare("SELECT * FROM inventory_checks ORDER BY createdAt DESC").all();
        res.json({ success: true, data: checks.map(c => ({ ...c, items: parseJsonSafe(c.items, []) })) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/inventory-checks/save', authMiddleware, (req, res) => {
    const { id, warehouse, items, note, status } = req.body;
    const user = req.auth.user;
    try {
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO inventory_checks (id, warehouse, checkDate, checkedBy, items, status, note, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, warehouse, now, user.fullName, JSON.stringify(items), status, note || '', now);

        if (status === 'COMPLETED') {
            const receiptId = `ADJ-${Date.now()}`;
            const insertTx = db.prepare(`INSERT INTO transactions (id, receiptId, materialId, materialName, type, quantity, date, transactionTime, user, workshop, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            const updateMat = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");

            items.forEach(item => {
                const diff = item.actualQty - item.systemQty;
                if (diff !== 0) {
                    insertTx.run(
                        `TX-ADJ-${crypto.randomBytes(4).toString('hex')}`,
                        receiptId, item.materialId, item.materialName,
                        diff > 0 ? 'IN' : 'OUT', Math.abs(diff),
                        now.split('T')[0], now, user.fullName, warehouse,
                        `Điều chỉnh kiểm kê - ${id}`
                    );
                    updateMat.run(item.actualQty, now, item.materialId);
                }
            });
        }
        if (_io) _io.emit('data_updated');
        res.json({ success: true, message: 'Đã lưu phiếu kiểm kê' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = { router, performBackup, setIo };
