'use strict';

// ===== CONSTANTS =====
const VALID_WORKSHOPS = ['OG', 'CK', 'NT'];
const VALID_CLASSIFICATIONS = ['Vật tư chính', 'Vật tư phụ'];
const VALID_ROLES = ['ADMIN', 'WAREHOUSE', 'PLANNING', 'GUEST'];
const VALID_TX_TYPES = ['IN', 'OUT', 'TRANSFER'];

// ===== VALIDATION HELPERS =====
const validateFields = (fields) => {
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null || String(value).trim() === '') {
            return `Trường "${key}" không được để trống.`;
        }
    }
    return null;
};

const validateNumber = (value, fieldName, min = 0) => {
    const num = parseFloat(value);
    if (isNaN(num)) return `"${fieldName}" phải là số hợp lệ.`;
    if (num <= min) return `"${fieldName}" phải lớn hơn ${min}.`;
    return null;
};

const ROLE_PERMISSIONS = {
    ADMIN: [
        'VIEW_MATERIAL', 'MANAGE_WAREHOUSE', 'VIEW_TRANSACTION', 'MANAGE_SUPPLIERS',
        'PLANNING_PROJECTS', 'PLANNING_ESTIMATES', 'MANAGE_PLANNING', 'VIEW_REPORT',
        'MANAGE_USERS', 'MANAGE_SETTINGS', 'MANAGE_ROLES', 'EXPORT_DATA', 'APPROVE_TRANSACTION'
    ],
    WAREHOUSE: [
        'VIEW_MATERIAL', 'MANAGE_WAREHOUSE', 'VIEW_TRANSACTION', 'MANAGE_SUPPLIERS',
        'PLANNING_PROJECTS', 'PLANNING_ESTIMATES', 'EXPORT_DATA',
        'APPROVE_TRANSACTION'
    ],
    PLANNING: [
        'VIEW_MATERIAL', 'VIEW_TRANSACTION', 'PLANNING_PROJECTS', 'PLANNING_ESTIMATES',
        'MANAGE_PLANNING', 'EXPORT_DATA'
    ],
    GUEST: [
        'VIEW_MATERIAL', 'VIEW_TRANSACTION', 'PLANNING_PROJECTS', 'PLANNING_ESTIMATES'
    ]
};

// ===== PERMISSION HELPERS =====
const hasPermission = (user, permission) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    
    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    const explicitPerms = Array.isArray(user.permissions) ? user.permissions : [];
    
    return rolePerms.includes(permission) || explicitPerms.includes(permission);
};

const requirePermission = (permission) => (req, res, next) => {
    const user = req.auth?.user;
    if (!hasPermission(user, permission)) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
};

module.exports = {
    VALID_WORKSHOPS, VALID_CLASSIFICATIONS, VALID_ROLES, VALID_TX_TYPES,
    validateFields, validateNumber, hasPermission, requirePermission,
};