'use strict';
const express = require('express');
const router = express.Router();
const { db, hashPassword, verifyPassword, sanitizeUser, parseJsonSafe, HASH_PREFIX, todayISO } = require('../db/database.cjs');
const { verifyToken } = require('../middleware/auth.cjs');
const { invalidateUserCache } = require('../middleware/auth.cjs');
const { requirePermission, validateFields, VALID_ROLES } = require('../middleware/permission.cjs');

const notifyUpdate = (io) => { if (io) io.emit('data_updated'); };

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

// GET /api/users
router.get('/', requirePermission('MANAGE_USERS'), (req, res) => {
    res.json(db.prepare('SELECT * FROM users').all().map(sanitizeUser));
});

// POST /api/users/delete
router.post('/delete', requirePermission('MANAGE_USERS'), (req, res) => {
    const { id } = req.body;
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(id);
    if (user?.role === 'ADMIN')
        return res.status(400).json({ error: 'Không thể xóa tài khoản Quản trị viên.' });
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
});

// POST /api/users/save
router.post('/save', requirePermission('MANAGE_USERS'), (req, res) => {
    const user = req.body;

    // Validate
    const validErr = validateFields({ username: user.username, fullName: user.fullName, role: user.role });
    if (validErr) return res.status(400).json({ success: false, error: validErr });
    if (user.username?.trim().length < 3)
        return res.status(400).json({ success: false, error: 'Username phải có ít nhất 3 ký tự.' });
    if (!/^[a-zA-Z0-9_]+$/.test(user.username))
        return res.status(400).json({ success: false, error: 'Username chỉ được chứa chữ cái, số và dấu gạch dưới.' });
    if (!VALID_ROLES.includes(user.role))
        return res.status(400).json({ success: false, error: 'Role không hợp lệ.' });
    if (user.password && user.password.length < 6)
        return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' });

    // Enforce single ADMIN
    if (user.role === 'ADMIN') {
        const existingAdmin = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' AND id != ?").get(user.id || '');
        if (existingAdmin)
            return res.status(400).json({ error: 'Chỉ được phép có 1 tài khoản Quản trị viên.' });
    }

    // Prevent changing ADMIN role
    if (user.id) {
        const existingUser = db.prepare("SELECT role FROM users WHERE id = ?").get(user.id);
        if (existingUser?.role === 'ADMIN' && user.role !== 'ADMIN')
            return res.status(400).json({ error: 'Không thể thay đổi vai trò của Quản trị viên.' });
    }

    const existing = user?.id ? db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) : null;
    let passwordToStore = existing?.password || null;
    if (typeof user.password === 'string' && user.password.trim()) {
        passwordToStore = user.password.startsWith('pbkdf2$') ? user.password : hashPassword(user.password);
    }
    if (!passwordToStore)
        return res.status(400).json({ success: false, error: 'Mật khẩu không hợp lệ.' });

    db.prepare(`
        INSERT INTO users (id, username, password, fullName, email, role, permissions, isActive, createdAt, lastLogin, createdBy)
        VALUES (@id, @username, @password, @fullName, @email, @role, @permissions, @isActive, @createdAt, @lastLogin, @createdBy)
        ON CONFLICT(id) DO UPDATE SET
            username=excluded.username, password=excluded.password, fullName=excluded.fullName,
            email=excluded.email, role=excluded.role, permissions=excluded.permissions,
            isActive=excluded.isActive, lastLogin=excluded.lastLogin
    `).run({
        email: null, lastLogin: null, createdBy: null, ...user,
        password: passwordToStore,
        permissions: JSON.stringify(user.permissions || []),
        isActive: user.isActive ? 1 : 0
    });
    invalidateUserCache(user.id);
    res.json({ success: true });
});

// POST /api/users/update_self
router.post('/update_self', (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { fullName, email, currentPassword, newPassword } = req.body || {};
    const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(userId);
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });

    if (!verifyPassword(currentPassword || '', user.password))
        return res.status(400).json({ success: false, error: 'Mật khẩu hiện tại không chính xác.' });

    const nextPassword = (typeof newPassword === 'string' && newPassword.trim())
        ? hashPassword(newPassword.trim()) : user.password;

    db.prepare("UPDATE users SET fullName = ?, email = ?, password = ? WHERE id = ?")
        .run(fullName || user.fullName, email ?? user.email, nextPassword, userId);

    invalidateUserCache(userId);
    const updated = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(userId);
    return res.json({ success: true, user: sanitizeUser(updated) });
});

module.exports = router;