'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { 
    hashPassword, 
    verifyPassword, 
    parseJsonSafe, 
    roundQty, 
    todayISO, 
    txId,
    sanitizeUser,
    HASH_PREFIX 
} = require('./dbHelpers.cjs');

// ===== DATA DIR =====
const defaultDataDir = path.join(__dirname, '..', '..', 'data');
const dataDir = process.env.ELECTRON_DATA_PATH || defaultDataDir;
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ===== DATABASE =====
const db = new Database(path.join(dataDir, 'data.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('mmap_size = 268435456');
db.pragma('temp_store = MEMORY');

// (Helpers moved to dbHelpers.cjs)

// ===== JWT SECRET =====
const getOrCreateJwtSecret = () => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    const secretPath = path.join(dataDir, '.jwt-secret');
    try {
        const existing = fs.readFileSync(secretPath, 'utf-8').trim();
        if (existing.length >= 32) return existing;
    } catch { }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretPath, generated, 'utf-8');
    console.log('[SmartStock] Generated new JWT secret');
    return generated;
};

const JWT_SECRET = getOrCreateJwtSecret();
const TOKEN_EXPIRY = '4h';

// (Helpers moved to dbHelpers.cjs)

// (Helpers moved to dbHelpers.cjs)

// (Helpers moved to dbHelpers.cjs)

const generateMaterialIdForWorkshop = (workshop) => {
    const rows = db.prepare("SELECT id FROM materials WHERE workshop = ? AND id LIKE ?").all(workshop, `VT/${workshop}/%`);
    let maxNum = 0;
    for (const row of rows) {
        const parts = String(row.id).split('/');
        const n = parseInt(parts[2], 10);
        if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
    return `VT/${workshop}/${String(maxNum + 1).padStart(5, '0')}`;
};

const isTableEmpty = (tableName) =>
    db.prepare(`SELECT count(*) as count FROM ${tableName}`).get().count === 0;

// ===== SCHEMA =====
db.exec(`
  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY, name TEXT, classification TEXT, unit TEXT, quantity REAL, minThreshold REAL,
    lastUpdated TEXT, workshop TEXT, origin TEXT, note TEXT, image TEXT, customerCode TEXT
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, receiptId TEXT, materialId TEXT, materialName TEXT, type TEXT,
    quantity REAL, date TEXT, transactionTime TEXT, user TEXT, workshop TEXT, targetWorkshop TEXT,
    targetMaterialId TEXT, orderCode TEXT, note TEXT
  );
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY, orderCode TEXT, orderName TEXT, projectCode TEXT, projectName TEXT,
    address TEXT, phone TEXT, description TEXT, status TEXT, workshop TEXT, items TEXT,
    createdAt TEXT, lastUpdated TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, fullName TEXT, email TEXT, role TEXT,
    permissions TEXT, isActive INTEGER, createdAt TEXT, lastLogin TEXT, createdBy TEXT
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY, userId TEXT, username TEXT, action TEXT, entityType TEXT, entityId TEXT,
    details TEXT, ipAddress TEXT, timestamp TEXT
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT UNIQUE, address TEXT, phone TEXT,
    description TEXT, createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, contactPerson TEXT,
    phone TEXT, email TEXT, address TEXT, products TEXT, rating INTEGER, createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS customer_codes (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    description TEXT, createdAt TEXT NOT NULL, createdBy TEXT, updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS inventory_checks (
    id TEXT PRIMARY KEY, warehouse TEXT, checkDate TEXT, checkedBy TEXT,
    items TEXT, status TEXT, note TEXT, createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, userId TEXT, role TEXT, type TEXT, message TEXT, 
    referenceId TEXT, isRead INTEGER DEFAULT 0, createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY, value TEXT
  );
`);

// ===== INDEXES =====
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tx_materialId       ON transactions(materialId);
  CREATE INDEX IF NOT EXISTS idx_tx_targetMaterialId ON transactions(targetMaterialId);
  CREATE INDEX IF NOT EXISTS idx_tx_date             ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tx_receiptId        ON transactions(receiptId);
  CREATE INDEX IF NOT EXISTS idx_tx_workshop         ON transactions(workshop);
  CREATE INDEX IF NOT EXISTS idx_tx_type             ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_mat_workshop        ON materials(workshop);
  CREATE INDEX IF NOT EXISTS idx_mat_name            ON materials(name);
  CREATE INDEX IF NOT EXISTS idx_mat_classification  ON materials(classification);
  CREATE INDEX IF NOT EXISTS idx_log_timestamp       ON activity_logs(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_mat_date_type    ON transactions(materialId, date, type, quantity);
  CREATE INDEX IF NOT EXISTS idx_tx_date_time        ON transactions(date DESC, transactionTime DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_receipt_date     ON transactions(receiptId, date DESC);
  CREATE INDEX IF NOT EXISTS idx_mat_ws_name         ON materials(workshop, name);
  CREATE INDEX IF NOT EXISTS idx_notify_user         ON notifications(userId, createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_notify_role         ON notifications(role, createdAt DESC);
`);

// ===== MIGRATIONS =====
const runMigration = (check, sql, msg) => {
    try { db.prepare(check).get(); }
    catch (e) {
        if (e.message.includes('no such column')) {
            console.log(`[SmartStock] Migration: ${msg}`);
            db.exec(sql);
        }
    }
};

runMigration('SELECT image FROM materials LIMIT 1',
    'ALTER TABLE materials ADD COLUMN image TEXT', "Adding 'image' to materials");

const budgetColumns = db.prepare("PRAGMA table_info(budgets)").all().map(c => c.name);
['orderName', 'projectCode', 'projectName', 'address', 'phone', 'description', 'status'].forEach(col => {
    if (!budgetColumns.includes(col)) {
        db.exec(`ALTER TABLE budgets ADD COLUMN ${col} TEXT`);
        if (col === 'projectCode')
            db.exec(`UPDATE budgets SET projectCode = projectName WHERE projectCode IS NULL`);
    }
});

const projectColumns = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
['code', 'address', 'phone'].forEach(col => {
    if (!projectColumns.includes(col)) {
        db.exec(`ALTER TABLE projects ADD COLUMN ${col} TEXT`);
        if (col === 'code')
            db.exec(`UPDATE projects SET code = name WHERE code IS NULL`);
    }
});

const txColumns = db.prepare("PRAGMA table_info(transactions)").all().map(c => c.name);
if (!txColumns.includes('targetMaterialId'))
    db.exec("ALTER TABLE transactions ADD COLUMN targetMaterialId TEXT");
if (!txColumns.includes('transactionTime'))
    db.exec("ALTER TABLE transactions ADD COLUMN transactionTime TEXT");
if (!txColumns.includes('status')) {
    db.exec("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'approved'");
    db.exec("UPDATE transactions SET status = 'approved' WHERE status IS NULL");
}
if (!txColumns.includes('approvedBy'))
    db.exec("ALTER TABLE transactions ADD COLUMN approvedBy TEXT");
if (!txColumns.includes('rejectedReason'))
    db.exec("ALTER TABLE transactions ADD COLUMN rejectedReason TEXT");

const materialColumns = db.prepare("PRAGMA table_info(materials)").all().map(c => c.name);
if (!materialColumns.includes('customerCode'))
    db.exec("ALTER TABLE materials ADD COLUMN customerCode TEXT");

// ===== SEED DATA =====
const SEED_USERS = [
    {
        id: 'u1', username: 'admin',
        password: hashPassword(process.env.ADMIN_DEFAULT_PASSWORD || 'SmartStock@2026!'),
        fullName: 'Quản trị viên', email: 'admin@smartstock.com', role: 'ADMIN',
        permissions: JSON.stringify(['VIEW_DASHBOARD', 'VIEW_INVENTORY', 'VIEW_HISTORY', 'VIEW_ORDERS',
            'MANAGE_MATERIALS', 'CREATE_RECEIPT', 'DELETE_TRANSACTION', 'MANAGE_BUDGETS',
            'TRANSFER_MATERIALS', 'EXPORT_DATA', 'MANAGE_USERS', 'VIEW_ACTIVITY_LOG', 'MANAGE_SETTINGS']),
        isActive: 1, createdAt: '2024-01-01', createdBy: 'SYSTEM'
    },
];

if (isTableEmpty('users')) {
    const insert = db.prepare(`INSERT INTO users 
        (id, username, password, fullName, email, role, permissions, isActive, createdAt, lastLogin, createdBy)
        VALUES (@id, @username, @password, @fullName, @email, @role, @permissions, @isActive, @createdAt, @lastLogin, @createdBy)`);
    SEED_USERS.forEach(u => insert.run({ email: null, lastLogin: null, ...u }));
    console.log('[SmartStock] Seed users created');
}

// Migrate legacy plain-text passwords
const legacyUsers = db.prepare("SELECT id, password FROM users").all();
const updatePasswordStmt = db.prepare("UPDATE users SET password = ? WHERE id = ?");
for (const user of legacyUsers) {
    if (user.password && !String(user.password).startsWith(HASH_PREFIX)) {
        updatePasswordStmt.run(hashPassword(user.password), user.id);
    }
}

console.log('[SmartStock] Database initialized');

module.exports = {
    db,
    JWT_SECRET,
    TOKEN_EXPIRY,
    hashPassword,
    verifyPassword,
    parseJsonSafe,
    sanitizeUser,
    roundQty,
    todayISO,
    txId,
    generateMaterialIdForWorkshop,
    dataDir,
};