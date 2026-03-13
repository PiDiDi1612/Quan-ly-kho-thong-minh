'use strict';
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, JWT_SECRET, TOKEN_EXPIRY, verifyPassword, parseJsonSafe, sanitizeUser } = require('../db/database.cjs');
const { invalidateUserCache } = require('../middleware/auth.cjs');

router.post('/login', (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin đăng nhập.' });
    }

    const user = db.prepare("SELECT * FROM users WHERE lower(username) = ? LIMIT 1").get(username);
    if (!user || !user.isActive || !verifyPassword(password, user.password)) {
        return res.status(401).json({ success: false, error: 'Sai tài khoản hoặc mật khẩu.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE users SET lastLogin = ? WHERE id = ?").run(now, user.id);
    invalidateUserCache(user.id);

    const token = jwt.sign(
        {
            userId: user.id,
            username: user.username,
            role: user.role,
            permissions: parseJsonSafe(user.permissions, [])
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );

    return res.json({ success: true, token, user: sanitizeUser({ ...user, lastLogin: now }) });
});

router.post('/logout', (req, res) => {
    return res.json({ success: true });
});

module.exports = router;