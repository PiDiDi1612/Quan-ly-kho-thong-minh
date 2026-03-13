'use strict';
const jwt = require('jsonwebtoken');
const { db, JWT_SECRET, sanitizeUser } = require('../db/database.cjs');

// User cache
const userCache = new Map();
const USER_CACHE_TTL = 30_000;

const getCachedUser = (userId) => {
    const entry = userCache.get(userId);
    if (entry && entry.expiresAt > Date.now()) return entry.user;
    userCache.delete(userId);
    return null;
};

const invalidateUserCache = (userId) => {
    if (userId) userCache.delete(userId);
    else userCache.clear();
};

const getTokenFromHeader = (req) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    return auth.slice(7).trim() || null;
};

const verifyToken = (req, res, next) => {
    const token = getTokenFromHeader(req);
    if (!token) {
        return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
        }
        return res.status(401).json({ error: 'Token không hợp lệ.' });
    }
};

const authMiddleware = (req, res, next) => {
    if (req.path === '/auth/login' || req.path === '/auth/logout' || req.path === '/system-info') {
        return next();
    }
    const token = getTokenFromHeader(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Token không hợp lệ. Vui lòng đăng nhập lại.' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        let authUserSanitized = getCachedUser(decoded.userId);
        if (!authUserSanitized) {
            const authUser = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(decoded.userId);
            if (!authUser || !authUser.isActive) {
                return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.' });
            }
            authUserSanitized = sanitizeUser(authUser);
            userCache.set(decoded.userId, { user: authUserSanitized, expiresAt: Date.now() + USER_CACHE_TTL });
        }
        req.auth = { token, userId: decoded.userId, user: authUserSanitized };
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
        }
        return res.status(401).json({ success: false, error: 'Token không hợp lệ.' });
    }
};

module.exports = { authMiddleware, verifyToken, getTokenFromHeader, getCachedUser, invalidateUserCache };