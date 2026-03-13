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

// ===== BUDGETS =====
router.get('/budgets', (req, res) => {
    const { page, limit, offset, search } = parsePagination(req.query);
    const conditions = [];
    const params = {};
    if (search) {
        conditions.push(`(orderCode LIKE @search OR orderName LIKE @search OR projectName LIKE @search)`);
        params.search = `%${search}%`;
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    try {
        const total = db.prepare(`SELECT COUNT(*) as c FROM budgets ${whereClause}`).get(params).c;
        const data = db.prepare(`SELECT * FROM budgets ${whereClause} ORDER BY lastUpdated DESC LIMIT @limit OFFSET @offset`)
            .all({ ...params, limit, offset })
            .map(b => ({ ...b, items: parseJsonSafe(b.items, []) }));
        res.json(paginatedResponse(data, total, page, limit));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/budgets/all', (req, res) => {
    try {
        res.json(db.prepare('SELECT * FROM budgets').all().map(b => ({ ...b, items: parseJsonSafe(b.items, []) })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/budgets/save', verifyToken, (req, res) => {
    const budget = req.body;
    db.prepare(`
        INSERT INTO budgets (id, orderCode, orderName, projectCode, projectName, address, phone, description, status, workshop, items, createdAt, lastUpdated)
        VALUES (@id, @orderCode, @orderName, @projectCode, @projectName, @address, @phone, @description, @status, @workshop, @items, @createdAt, @lastUpdated)
        ON CONFLICT(id) DO UPDATE SET
            orderCode=excluded.orderCode, orderName=excluded.orderName, projectCode=excluded.projectCode,
            projectName=excluded.projectName, address=excluded.address, phone=excluded.phone,
            description=excluded.description, status=excluded.status, workshop=excluded.workshop,
            items=excluded.items, lastUpdated=excluded.lastUpdated
    `).run({
        ...budget,
        orderName: budget.orderName || '', projectCode: budget.projectCode || '',
        projectName: budget.projectName || '', address: budget.address || '',
        phone: budget.phone || '', description: budget.description || '',
        status: budget.status || 'Đang thực hiện',
        items: JSON.stringify(budget.items)
    });
    res.json({ success: true });
});

router.post('/budgets/delete', verifyToken, (req, res) => {
    db.prepare('DELETE FROM budgets WHERE id = ?').run(req.body.id);
    res.json({ success: true });
});

// ===== PROJECTS =====
router.get('/projects', (req, res) => {
    const { page, limit, offset, search } = parsePagination(req.query);
    const conditions = [];
    const params = {};
    if (search) {
        conditions.push(`(code LIKE @search OR name LIKE @search OR address LIKE @search)`);
        params.search = `%${search}%`;
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    try {
        const total = db.prepare(`SELECT COUNT(*) as c FROM projects ${whereClause}`).get(params).c;
        const data = db.prepare(`SELECT * FROM projects ${whereClause} ORDER BY createdAt DESC LIMIT @limit OFFSET @offset`)
            .all({ ...params, limit, offset });
        res.json(paginatedResponse(data, total, page, limit));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/projects/save', verifyToken, (req, res) => {
    const item = req.body;
    db.prepare(`INSERT INTO projects (id, code, name, address, phone, description, createdAt)
        VALUES (@id, @code, @name, @address, @phone, @description, @createdAt)
        ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name,
        address=excluded.address, phone=excluded.phone, description=excluded.description`)
        .run(item);
    res.json({ success: true });
});

router.post('/projects/delete', verifyToken, (req, res) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.body.id);
    res.json({ success: true });
});

module.exports = router;