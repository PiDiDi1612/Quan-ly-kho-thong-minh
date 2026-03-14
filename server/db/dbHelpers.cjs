'use strict';
const crypto = require('crypto');

// ===== PASSWORD HELPERS =====
const HASH_PREFIX = 'pbkdf2$';
const HASH_ITERATIONS = 120000;
const HASH_KEYLEN = 64;

const hashPassword = (plain) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(String(plain), salt, HASH_ITERATIONS, HASH_KEYLEN, 'sha512').toString('hex');
    return `${HASH_PREFIX}${HASH_ITERATIONS}$${salt}$${hash}`;
};

const verifyPassword = (plain, storedHash) => {
    if (!storedHash) return false;
    const value = String(storedHash);
    if (!value.startsWith(HASH_PREFIX)) return value === String(plain);
    const [, iterationStr, salt, expected] = value.split('$');
    const iterations = Number(iterationStr);
    if (!iterations || !salt || !expected) return false;
    const computed = crypto.pbkdf2Sync(String(plain), salt, iterations, HASH_KEYLEN, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expected, 'hex'));
};

// ===== HELPERS =====
const parseJsonSafe = (value, fallback) => {
    try {
        if (typeof value !== 'string') return fallback;
        return JSON.parse(value);
    } catch { return fallback; }
};

const sanitizeUser = (u) => ({
    id: u.id, username: u.username, fullName: u.fullName,
    email: u.email, role: u.role,
    permissions: parseJsonSafe(u.permissions, []),
    isActive: Boolean(u.isActive),
    createdAt: u.createdAt, lastLogin: u.lastLogin, createdBy: u.createdBy
});

const roundQty = (n) => Math.round((Number(n) || 0) * 100) / 100;
const todayISO = () => new Date().toISOString().split('T')[0];
const txId = (prefix = 'tx') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

module.exports = {
    hashPassword,
    verifyPassword,
    parseJsonSafe,
    roundQty,
    todayISO,
    txId,
    sanitizeUser,
    HASH_PREFIX
};
