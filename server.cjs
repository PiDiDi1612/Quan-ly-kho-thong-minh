const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to notify all clients
const notifyUpdate = () => {
    io.emit('data_updated');
};

// Database setup
const defaultDataDir = path.join(__dirname, 'data');
const dataDir = process.env.ELECTRON_DATA_PATH || defaultDataDir;

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'data.db'));

// Enable WAL (Write-Ahead Logging) mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');  // Faster writes, safe with WAL
db.pragma('cache_size = -64000');   // 64MB page cache
db.pragma('mmap_size = 268435456'); // 256MB memory mapped I/O
db.pragma('temp_store = MEMORY');   // Temp tables in RAM

// Removed: SESSION_TTL_MS and sessions Map - JWT is stateless
const HASH_PREFIX = 'pbkdf2$';
const HASH_ITERATIONS = 120000;
const HASH_KEYLEN = 64;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'smartstock-secret-key-2026';
const TOKEN_EXPIRY = '4h'; // Token expires after 4 hours

const hashPassword = (plain) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(String(plain), salt, HASH_ITERATIONS, HASH_KEYLEN, 'sha512').toString('hex');
    return `${HASH_PREFIX}${HASH_ITERATIONS}$${salt}$${hash}`;
};

const verifyPassword = (plain, storedHash) => {
    if (!storedHash) return false;
    const value = String(storedHash);
    if (!value.startsWith(HASH_PREFIX)) {
        // backward compatibility for legacy plain-text rows
        return value === String(plain);
    }
    const [, iterationStr, salt, expected] = value.split('$');
    const iterations = Number(iterationStr);
    if (!iterations || !salt || !expected) return false;
    const computed = crypto.pbkdf2Sync(String(plain), salt, iterations, HASH_KEYLEN, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expected, 'hex'));
};

const parseJsonSafe = (value, fallback) => {
    try {
        if (typeof value !== 'string') return fallback;
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const sanitizeUser = (u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    permissions: parseJsonSafe(u.permissions, []),
    isActive: Boolean(u.isActive),
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
    createdBy: u.createdBy
});

const getTokenFromHeader = (req) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    return auth.slice(7).trim() || null;
};

// JWT Middleware: Verify token and attach user to request
const verifyToken = (req, res, next) => {
    const token = getTokenFromHeader(req);

    if (!token) {
        return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
        }
        return res.status(401).json({ error: 'Token không hợp lệ.' });
    }
};


// Short-lived in-memory user cache to avoid DB hit on every API request
const userCache = new Map(); // userId -> { user, expiresAt }
const USER_CACHE_TTL = 30_000; // 30 seconds

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

const authMiddleware = (req, res, next) => {
    // Skip auth for login/logout endpoints
    if (req.path === '/auth/login' || req.path === '/auth/logout' || req.path === '/system-info') {
        return next();
    }

    const token = getTokenFromHeader(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Token không hợp lệ. Vui lòng đăng nhập lại.' });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check in-memory cache first to avoid DB hit on every request
        let authUserSanitized = getCachedUser(decoded.userId);
        if (!authUserSanitized) {
            const authUser = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(decoded.userId);
            if (!authUser || !authUser.isActive) {
                return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.' });
            }
            authUserSanitized = sanitizeUser(authUser);
            userCache.set(decoded.userId, { user: authUserSanitized, expiresAt: Date.now() + USER_CACHE_TTL });
        }

        // Attach user info to request
        req.auth = {
            token,
            userId: decoded.userId,
            user: authUserSanitized
        };
        req.user = decoded; // For permission checks

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
        }
        return res.status(401).json({ success: false, error: 'Token không hợp lệ.' });
    }
};

const hasPermission = (user, permission) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes(permission);
};

const requirePermission = (permission) => (req, res, next) => {
    const user = req.auth?.user;
    if (!hasPermission(user, permission)) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
};

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY, name TEXT, classification TEXT, unit TEXT, quantity REAL, minThreshold REAL, 
    lastUpdated TEXT, workshop TEXT, origin TEXT, note TEXT, image TEXT
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, receiptId TEXT, materialId TEXT, materialName TEXT, type TEXT, 
    quantity REAL, date TEXT, transactionTime TEXT, user TEXT, workshop TEXT, targetWorkshop TEXT, targetMaterialId TEXT, orderCode TEXT, note TEXT
  );
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY, orderCode TEXT, orderName TEXT, projectCode TEXT, projectName TEXT, address TEXT, 
    phone TEXT, description TEXT, status TEXT, workshop TEXT, items TEXT, createdAt TEXT, lastUpdated TEXT
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
    id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT UNIQUE, address TEXT, phone TEXT, description TEXT, createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, contactPerson TEXT, 
    phone TEXT, email TEXT, address TEXT, products TEXT, rating INTEGER, createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS customer_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    createdAt TEXT NOT NULL,
    createdBy TEXT,
    updatedAt TEXT
  );
`);

// Performance indexes — created only if they don't already exist
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tx_materialId        ON transactions(materialId);
  CREATE INDEX IF NOT EXISTS idx_tx_targetMaterialId  ON transactions(targetMaterialId);
  CREATE INDEX IF NOT EXISTS idx_tx_date              ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tx_receiptId         ON transactions(receiptId);
  CREATE INDEX IF NOT EXISTS idx_tx_workshop          ON transactions(workshop);
  CREATE INDEX IF NOT EXISTS idx_mat_workshop         ON materials(workshop);
  CREATE INDEX IF NOT EXISTS idx_log_timestamp        ON activity_logs(timestamp DESC);
  
  -- Composite Indexes for Performance Optimization
  CREATE INDEX IF NOT EXISTS idx_tx_mat_date_type     ON transactions(materialId, date, type, quantity);
  CREATE INDEX IF NOT EXISTS idx_tx_date_time         ON transactions(date DESC, transactionTime DESC);
`);

// Migration: Ensure 'image' column exists in 'materials'
try {
    db.prepare("SELECT image FROM materials LIMIT 1").get();
} catch (e) {
    if (e.message.includes("no such column: image")) {
        console.log("[SmartStock] Migrating database: Adding 'image' column to 'materials' table...");
        db.exec("ALTER TABLE materials ADD COLUMN image TEXT");
    }
}

// Migration: Update 'budgets' table with new project fields
const budgetColumns = db.prepare("PRAGMA table_info(budgets)").all().map(c => c.name);
const requiredBudgetCols = ['orderName', 'projectCode', 'projectName', 'address', 'phone', 'description', 'status'];
requiredBudgetCols.forEach(col => {
    if (!budgetColumns.includes(col)) {
        console.log(`[SmartStock] Migrating database: Adding '${col}' column to 'budgets' table...`);
        db.exec(`ALTER TABLE budgets ADD COLUMN ${col} TEXT`);
        if (col === 'projectCode') {
            db.exec(`UPDATE budgets SET projectCode = projectName WHERE projectCode IS NULL`);
        }
    }
});

// Migration: Update 'projects' table
const projectColumns = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
const requiredProjectCols = ['code', 'address', 'phone'];
requiredProjectCols.forEach(col => {
    if (!projectColumns.includes(col)) {
        console.log(`[SmartStock] Migrating database: Adding '${col}' column to 'projects' table...`);
        db.exec(`ALTER TABLE projects ADD COLUMN ${col} TEXT`);
        if (col === 'code') {
            // Initialize code with name for existing projects
            db.exec(`UPDATE projects SET code = name WHERE code IS NULL`);
        }
    }
});

// Migration: Add targetMaterialId to transactions for reliable transfer tracking
const txColumns = db.prepare("PRAGMA table_info(transactions)").all().map(c => c.name);
if (!txColumns.includes('targetMaterialId')) {
    console.log("[SmartStock] Migrating database: Adding 'targetMaterialId' column to 'transactions' table...");
    db.exec("ALTER TABLE transactions ADD COLUMN targetMaterialId TEXT");
}
if (!txColumns.includes('transactionTime')) {
    console.log("[SmartStock] Migrating database: Adding 'transactionTime' column to 'transactions' table...");
    db.exec("ALTER TABLE transactions ADD COLUMN transactionTime TEXT");
}

// Migration: Add customerCode to materials
const materialColumns = db.prepare("PRAGMA table_info(materials)").all().map(c => c.name);
if (!materialColumns.includes('customerCode')) {
    console.log("[SmartStock] Migrating database: Adding 'customerCode' column to 'materials' table...");
    db.exec("ALTER TABLE materials ADD COLUMN customerCode TEXT");
}

const roundQty = (n) => Math.round((Number(n) || 0) * 100) / 100;
const todayISO = () => new Date().toISOString().split('T')[0];
const txId = (prefix = 'tx') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

const isTableEmpty = (tableName) => {
    return db.prepare(`SELECT count(*) as count FROM ${tableName}`).get().count === 0;
};

// Seed Data (Inlined)
// REMOVED: SEED_MATERIALS - App should start with empty material database
// Users will add their own materials as needed

const SEED_USERS = [
    { id: 'u1', username: 'admin', password: '123', fullName: 'Quản trị viên', email: 'admin@smartstock.com', role: 'ADMIN', permissions: JSON.stringify(['VIEW_DASHBOARD', 'VIEW_INVENTORY', 'VIEW_HISTORY', 'VIEW_ORDERS', 'MANAGE_MATERIALS', 'CREATE_RECEIPT', 'DELETE_TRANSACTION', 'MANAGE_BUDGETS', 'TRANSFER_MATERIALS', 'EXPORT_DATA', 'MANAGE_USERS', 'VIEW_ACTIVITY_LOG', 'MANAGE_SETTINGS']), isActive: 1, createdAt: '2024-01-01', createdBy: 'SYSTEM' },
    { id: 'u2', username: 'manager', password: '123', fullName: 'Quản lý kho', email: 'manager@smartstock.com', role: 'MANAGER', permissions: JSON.stringify(['VIEW_DASHBOARD', 'VIEW_INVENTORY', 'VIEW_HISTORY', 'VIEW_ORDERS', 'MANAGE_MATERIALS', 'CREATE_RECEIPT', 'DELETE_TRANSACTION', 'MANAGE_BUDGETS', 'TRANSFER_MATERIALS', 'EXPORT_DATA', 'VIEW_ACTIVITY_LOG']), isActive: 1, createdAt: '2024-01-01', createdBy: 'SYSTEM' },
];

// REMOVED: Material seed initialization - database starts empty

if (isTableEmpty('users')) {
    const insert = db.prepare(`INSERT INTO users (id, username, password, fullName, email, role, permissions, isActive, createdAt, lastLogin, createdBy) VALUES (@id, @username, @password, @fullName, @email, @role, @permissions, @isActive, @createdAt, @lastLogin, @createdBy)`);
    SEED_USERS.forEach(u => insert.run({ email: null, lastLogin: null, ...u }));
}

// Migrate legacy plain-text passwords to hashed format
const legacyUsers = db.prepare("SELECT id, password FROM users").all();
const updatePasswordStmt = db.prepare("UPDATE users SET password = ? WHERE id = ?");
for (const user of legacyUsers) {
    if (user.password && !String(user.password).startsWith(HASH_PREFIX)) {
        updatePasswordStmt.run(hashPassword(user.password), user.id);
    }
}

app.get('/api/system-info', (req, res) => {
    const nets = os.networkInterfaces();
    let fallbacks = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            // Support both net.family='IPv4' (older Node) and net.family=4 (newer Node)
            const isIPv4 = net.family === 'IPv4' || net.family === 4;
            if (isIPv4 && !net.internal) {
                // Priority for common local ranges
                const isPrivate =
                    net.address.startsWith('192.168.') ||
                    net.address.startsWith('10.') ||
                    net.address.startsWith('172.16.') ||
                    net.address.startsWith('172.17.') ||
                    net.address.startsWith('172.18.') ||
                    net.address.startsWith('172.19.') ||
                    net.address.startsWith('172.20.') ||
                    net.address.startsWith('172.31.');

                if (isPrivate) {
                    return res.json({ ip: net.address });
                }
                fallbacks.push(net.address);
            }
        }
    }
    // Return the first non-internal IPv4 found if no private one matched
    return res.json({ ip: fallbacks.length > 0 ? fallbacks[0] : '127.0.0.1' });
});

app.post('/api/auth/login', (req, res) => {
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

    // Generate JWT token with 4-hour expiry
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

app.post('/api/auth/logout', (req, res) => {
    // JWT is stateless, no server-side session to delete
    // Client will discard the token
    return res.json({ success: true });
});

app.use('/api', authMiddleware);

// API Endpoints
app.get('/api/materials', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.json(db.prepare('SELECT * FROM materials').all());
    }

    const sql = `
        WITH 
          ts AS (
            SELECT 
              m_id,
              SUM(CASE WHEN date > @endDate THEN qty ELSE 0 END) as net_after,
              SUM(CASE WHEN date >= @startDate THEN qty ELSE 0 END) as net_from_start,
              SUM(CASE WHEN date BETWEEN @startDate AND @endDate AND is_in = 1 THEN quantity ELSE 0 END) as p_in,
              SUM(CASE WHEN date BETWEEN @startDate AND @endDate AND is_in = 0 THEN quantity ELSE 0 END) as p_out
            FROM (
              -- Outgoing/Normal In
              SELECT materialId as m_id, date, quantity, 
                     CASE WHEN type='IN' THEN quantity WHEN type='OUT' THEN -quantity WHEN type='TRANSFER' THEN -quantity ELSE 0 END as qty,
                     (CASE WHEN type='IN' THEN 1 ELSE 0 END) as is_in
              FROM transactions
              UNION ALL
              -- Incoming transfers (targetMaterialId)
              SELECT targetMaterialId as m_id, date, quantity, quantity as qty, 1 as is_in
              FROM transactions WHERE type='TRANSFER' AND targetMaterialId IS NOT NULL
            )
            GROUP BY m_id
          )
        SELECT m.*, 
               (m.quantity - COALESCE(ts.net_after, 0)) as closingStock,
               (m.quantity - COALESCE(ts.net_from_start, 0)) as openingStock,
               COALESCE(ts.p_in, 0) as periodIn,
               COALESCE(ts.p_out, 0) as periodOut
        FROM materials m
        LEFT JOIN ts ON m.id = ts.m_id;
    `;

    try {
        const materials = db.prepare(sql).all({ startDate, endDate });
        res.json(materials);
    } catch (error) {
        console.error("Error calculating stock:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard/summary', (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const summary = {
            totalItems: db.prepare('SELECT COUNT(*) as c FROM materials').get().c,
            lowStockCount: db.prepare('SELECT COUNT(*) as c FROM materials WHERE quantity <= minThreshold').get().c,
            lowStockItems: db.prepare('SELECT * FROM materials WHERE quantity <= minThreshold ORDER BY quantity ASC LIMIT 10').all(),
            todayIn: db.prepare("SELECT SUM(quantity) as s FROM transactions WHERE date = ? AND (type = 'IN' OR (type = 'TRANSFER' AND targetMaterialId IS NOT NULL))").get(today)?.s || 0,
            todayOut: db.prepare("SELECT SUM(quantity) as s FROM transactions WHERE date = ? AND (type = 'OUT' OR type = 'TRANSFER')").get(today)?.s || 0,
            workshopData: db.prepare(`
                SELECT workshop as name, COUNT(*) as total, SUM(quantity) as quantity 
                FROM materials GROUP BY workshop
            `).all(),
            activityData: []
        };

        // Activity for 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const txs = db.prepare("SELECT type, SUM(quantity) as qty FROM transactions WHERE date = ? GROUP BY type").all(dateStr);
            summary.activityData.push({
                name: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                inCount: txs.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.qty, 0),
                outCount: txs.filter(t => t.type === 'OUT' || t.type === 'TRANSFER').reduce((acc, t) => acc + t.qty, 0)
            });
        }

        res.json(summary);
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/transactions', (req, res) => res.json(db.prepare('SELECT * FROM transactions ORDER BY date DESC, transactionTime DESC LIMIT 1000').all()));
app.get('/api/users', requirePermission('MANAGE_USERS'), (req, res) => res.json(db.prepare('SELECT * FROM users').all().map(sanitizeUser)));
app.get('/api/budgets', (req, res) => res.json(db.prepare('SELECT * FROM budgets').all().map(b => ({ ...b, items: parseJsonSafe(b.items, []) }))));
app.get('/api/activity_logs', requirePermission('VIEW_ACTIVITY_LOG'), (req, res) => res.json(db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 500').all()));
app.get('/api/projects', (req, res) => res.json(db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all()));
app.get('/api/suppliers', (req, res) => res.json(db.prepare('SELECT * FROM suppliers ORDER BY createdAt DESC').all()));


app.post('/api/materials/save', verifyToken, (req, res) => {
    const material = { note: '', image: '', ...req.body };
    db.prepare(`INSERT INTO materials (id, name, classification, unit, quantity, minThreshold, lastUpdated, workshop, origin, note, image) VALUES (@id, @name, @classification, @unit, @quantity, @minThreshold, @lastUpdated, @workshop, @origin, @note, @image) ON CONFLICT(id) DO UPDATE SET name=excluded.name, classification=excluded.classification, unit=excluded.unit, quantity=excluded.quantity, minThreshold=excluded.minThreshold, lastUpdated=excluded.lastUpdated, workshop=excluded.workshop, origin=excluded.origin, note=excluded.note, image=excluded.image`).run(material);
    notifyUpdate();
    res.json({ success: true });
});

app.delete('/api/materials/:id', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    const { id } = req.params;

    // Check if material has transactions
    const hasTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE materialId = ? OR targetMaterialId = ?').get(id, id);

    if (hasTransactions.count > 0) {
        return res.status(400).json({
            success: false,
            error: `Không thể xóa vật tư này vì đã có ${hasTransactions.count} giao dịch liên quan. Vui lòng hợp nhất thay vì xóa.`
        });
    }

    db.prepare('DELETE FROM materials WHERE id = ?').run(id);
    notifyUpdate();
    res.json({ success: true });
});





app.post('/api/transactions/save', (req, res) => {
    const tx = req.body;
    db.prepare(`INSERT OR REPLACE INTO transactions (id, receiptId, materialId, materialName, type, quantity, date, transactionTime, user, workshop, targetWorkshop, targetMaterialId, orderCode, note) VALUES (@id, @receiptId, @materialId, @materialName, @type, @quantity, @date, @transactionTime, @user, @workshop, @targetWorkshop, @targetMaterialId, @orderCode, @note)`).run({
        targetWorkshop: null,
        targetMaterialId: null,
        orderCode: null,
        note: null,
        transactionTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        ...tx
    });
    notifyUpdate();
    res.json({ success: true });
});

app.post('/api/transactions/delete', (req, res) => {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.body.id);
    notifyUpdate();
    res.json({ success: true });
});

app.post('/api/transactions/commit', (req, res) => {
    const { mode } = req.body || {};
    if (mode === 'TRANSFER') {
        if (!hasPermission(req.auth?.user, 'TRANSFER_MATERIALS')) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
    } else if (!hasPermission(req.auth?.user, 'CREATE_RECEIPT')) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const commitReceipt = db.transaction((payload) => {
        const {
            receiptType,
            receiptWorkshop,
            receiptId,
            receiptTime,
            receiptSupplier,
            orderCode,
            user,
            items
        } = payload || {};

        if (!Array.isArray(items) || items.length === 0) throw new Error('Danh sách vật tư trống.');
        if (!receiptWorkshop || !receiptType) throw new Error('Thiếu thông tin phiếu.');

        const txRows = [];
        const updateMaterialQty = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");
        const insertMaterial = db.prepare(`
            INSERT INTO materials (id, name, classification, unit, quantity, minThreshold, lastUpdated, workshop, origin, note, image)
            VALUES (@id, @name, @classification, @unit, @quantity, @minThreshold, @lastUpdated, @workshop, @origin, @note, @image)
        `);
        const insertTx = db.prepare(`
            INSERT INTO transactions (id, receiptId, materialId, materialName, type, quantity, date, transactionTime, user, workshop, targetWorkshop, targetMaterialId, orderCode, note)
            VALUES (@id, @receiptId, @materialId, @materialName, @type, @quantity, @date, @transactionTime, @user, @workshop, @targetWorkshop, @targetMaterialId, @orderCode, @note)
        `);

        for (const item of items) {
            const qty = roundQty(item.quantity);
            if (!(qty > 0)) continue;

            const baseMat = db.prepare("SELECT * FROM materials WHERE id = ?").get(item.materialId);
            if (!baseMat) throw new Error(`Không tìm thấy vật tư ${item.materialId}.`);

            let targetMat = db.prepare("SELECT * FROM materials WHERE workshop = ? AND name = ? AND origin = ? LIMIT 1")
                .get(receiptWorkshop, baseMat.name, baseMat.origin);

            if (!targetMat && receiptType === 'IN') {
                targetMat = {
                    ...baseMat,
                    id: generateMaterialIdForWorkshop(receiptWorkshop),
                    workshop: receiptWorkshop,
                    quantity: 0,
                    lastUpdated: todayISO()
                };
                insertMaterial.run(targetMat);
            }

            if (!targetMat) throw new Error(`Vật tư ${baseMat.name} chưa có tại xưởng ${receiptWorkshop}.`);

            // CRITICAL FIX: Use atomic UPDATE with WHERE clause to prevent race conditions
            const change = receiptType === 'IN' ? qty : -qty;
            const nextQty = roundQty(Number(targetMat.quantity) + change);

            if (receiptType === 'OUT') {
                // Atomic UPDATE: only succeeds if quantity >= qty
                const result = db.prepare(
                    "UPDATE materials SET quantity = quantity - ?, lastUpdated = ? WHERE id = ? AND quantity >= ?"
                ).run(qty, todayISO(), targetMat.id, qty);

                if (result.changes === 0) {
                    // Failed: either material not found or insufficient stock
                    const currentMat = db.prepare("SELECT quantity FROM materials WHERE id = ?").get(targetMat.id);
                    throw new Error(
                        `Không đủ tồn kho cho ${targetMat.name}. ` +
                        `Hiện có: ${currentMat ? roundQty(currentMat.quantity) : 0} ${baseMat.unit}, ` +
                        `yêu cầu: ${qty} ${baseMat.unit}`
                    );
                }
            } else {
                // IN transaction: simple addition (no race condition risk)
                updateMaterialQty.run(nextQty, todayISO(), targetMat.id);
            }

            txRows.push({
                id: txId('tx'),
                receiptId: receiptId || txId(receiptType === 'IN' ? 'PNK' : 'PXK'),
                materialId: targetMat.id,
                materialName: targetMat.name,
                type: receiptType,
                quantity: qty,
                date: receiptTime || todayISO(),
                transactionTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                user: user || 'SYSTEM',
                workshop: receiptWorkshop,
                targetWorkshop: null,
                targetMaterialId: null,
                orderCode: orderCode || null,
                note: receiptType === 'IN' ? (receiptSupplier || null) : null
            });
        }

        if (txRows.length === 0) throw new Error('Không có vật tư hợp lệ để tạo phiếu.');
        for (const row of txRows) insertTx.run(row);
        return { affected: txRows.length };
    });

    const commitTransfer = db.transaction((payload) => {
        const { fromWorkshop, toWorkshop, receiptId, orderCode, user, items } = payload || {};
        if (!Array.isArray(items) || items.length === 0) throw new Error('Danh sách điều chuyển trống.');
        if (!fromWorkshop || !toWorkshop || fromWorkshop === toWorkshop) throw new Error('Kho nguồn/đích không hợp lệ.');

        const updateMaterialQty = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");
        const insertMaterial = db.prepare(`
            INSERT INTO materials (id, name, classification, unit, quantity, minThreshold, lastUpdated, workshop, origin, note, image)
            VALUES (@id, @name, @classification, @unit, @quantity, @minThreshold, @lastUpdated, @workshop, @origin, @note, @image)
        `);
        const insertTx = db.prepare(`
            INSERT INTO transactions (id, receiptId, materialId, materialName, type, quantity, date, transactionTime, user, workshop, targetWorkshop, targetMaterialId, orderCode, note)
            VALUES (@id, @receiptId, @materialId, @materialName, @type, @quantity, @date, @transactionTime, @user, @workshop, @targetWorkshop, @targetMaterialId, @orderCode, @note)
        `);

        let affected = 0;
        for (const item of items) {
            const qty = roundQty(item.quantity);
            if (!(qty > 0)) continue;

            const sourceMat = db.prepare("SELECT * FROM materials WHERE id = ? AND workshop = ?").get(item.materialId, fromWorkshop);
            if (!sourceMat) throw new Error(`Không tìm thấy vật tư ${item.materialId} tại kho nguồn.`);

            // CRITICAL FIX: Atomic UPDATE to prevent race conditions in transfers
            const result = db.prepare(
                "UPDATE materials SET quantity = quantity - ?, lastUpdated = ? WHERE id = ? AND quantity >= ?"
            ).run(qty, todayISO(), sourceMat.id, qty);

            if (result.changes === 0) {
                const currentMat = db.prepare("SELECT quantity FROM materials WHERE id = ?").get(sourceMat.id);
                throw new Error(
                    `Không đủ tồn kho cho ${sourceMat.name} tại ${fromWorkshop}. ` +
                    `Hiện có: ${currentMat ? roundQty(currentMat.quantity) : 0} ${sourceMat.unit}, ` +
                    `yêu cầu: ${qty} ${sourceMat.unit}`
                );
            }

            let destMat = db.prepare("SELECT * FROM materials WHERE workshop = ? AND name = ? AND origin = ? LIMIT 1")
                .get(toWorkshop, sourceMat.name, sourceMat.origin);
            if (!destMat) {
                destMat = {
                    ...sourceMat,
                    id: generateMaterialIdForWorkshop(toWorkshop),
                    workshop: toWorkshop,
                    quantity: 0,
                    lastUpdated: todayISO(),
                    // Ensure all properties are explicitly preserved from source
                    classification: sourceMat.classification,
                    unit: sourceMat.unit,
                    origin: sourceMat.origin,
                    note: sourceMat.note,
                    image: sourceMat.image
                };
                insertMaterial.run(destMat);
            }

            const destNext = roundQty(Number(destMat.quantity) + qty);
            updateMaterialQty.run(destNext, todayISO(), destMat.id);

            insertTx.run({
                id: txId('tr'),
                receiptId: receiptId || txId('PDC'),
                materialId: sourceMat.id,
                materialName: sourceMat.name,
                type: 'TRANSFER',
                quantity: qty,
                date: todayISO(),
                transactionTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                user: user || 'SYSTEM',
                workshop: fromWorkshop,
                targetWorkshop: toWorkshop,
                targetMaterialId: destMat.id,
                orderCode: orderCode || null,
                note: null
            });
            affected += 1;
        }

        if (!affected) throw new Error('Không có vật tư hợp lệ để điều chuyển.');
        return { affected };
    });

    try {
        const result = mode === 'TRANSFER'
            ? commitTransfer(req.body.payload || {})
            : commitReceipt(req.body.payload || {});
        notifyUpdate();
        return res.json({ success: true, ...result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Commit transaction failed' });
    }
});

app.post('/api/transactions/delete_with_revert', requirePermission('DELETE_TRANSACTION'), (req, res) => {
    const revertDelete = db.transaction((id) => {
        const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
        if (!tx) throw new Error('Không tìm thấy giao dịch.');

        // SAFETY CHECK: Prevent deleting old transactions that could corrupt current inventory
        // Check if there are any transactions after this one for the same material
        const newerTx = db.prepare(
            "SELECT COUNT(*) as count FROM transactions WHERE materialId = ? AND date > ? AND id != ?"
        ).get(tx.materialId, tx.date, tx.id);

        if (newerTx && newerTx.count > 0) {
            throw new Error(
                `Không thể xóa giao dịch này vì đã có ${newerTx.count} giao dịch mới hơn cho vật tư này. ` +
                `Xóa giao dịch cũ sẽ làm sai dữ liệu tồn kho hiện tại.`
            );
        }

        const updateMaterialQty = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");
        const findById = db.prepare("SELECT * FROM materials WHERE id = ? LIMIT 1");
        const findByNameWorkshop = db.prepare("SELECT * FROM materials WHERE name = ? AND workshop = ? LIMIT 1");

        if (tx.type === 'IN') {
            const mat = findById.get(tx.materialId);
            if (mat) {
                const newQty = roundQty(Number(mat.quantity) - Number(tx.quantity));

                // VALIDATION: Prevent negative stock
                if (newQty < 0) {
                    throw new Error(
                        `Không thể xóa giao dịch nhập này vì sẽ làm tồn kho âm. ` +
                        `Tồn hiện tại: ${roundQty(mat.quantity)} ${mat.unit}, ` +
                        `giao dịch nhập: ${tx.quantity} ${mat.unit}. ` +
                        `Cần có ít nhất ${roundQty(tx.quantity)} ${mat.unit} trong kho để xóa.`
                    );
                }

                updateMaterialQty.run(newQty, todayISO(), mat.id);
            }
        } else if (tx.type === 'OUT') {
            const mat = findById.get(tx.materialId);
            if (mat) {
                updateMaterialQty.run(roundQty(Number(mat.quantity) + Number(tx.quantity)), todayISO(), mat.id);
            }
        } else if (tx.type === 'TRANSFER') {
            const sourceMat = findById.get(tx.materialId) || findByNameWorkshop.get(tx.materialName, tx.workshop);
            if (sourceMat) {
                updateMaterialQty.run(roundQty(Number(sourceMat.quantity) + Number(tx.quantity)), todayISO(), sourceMat.id);
            }

            const destMat = tx.targetMaterialId
                ? findById.get(tx.targetMaterialId)
                : findByNameWorkshop.get(tx.materialName, tx.targetWorkshop);
            if (destMat) {
                const newQty = roundQty(Number(destMat.quantity) - Number(tx.quantity));

                // VALIDATION: Prevent negative stock at destination
                if (newQty < 0) {
                    throw new Error(
                        `Không thể xóa giao dịch điều chuyển này vì sẽ làm tồn kho âm tại xưởng đích. ` +
                        `Tồn hiện tại: ${roundQty(destMat.quantity)} ${destMat.unit}, ` +
                        `cần trừ: ${tx.quantity} ${destMat.unit}.`
                    );
                }

                updateMaterialQty.run(newQty, todayISO(), destMat.id);
            }
        }

        db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
        return true;
    });

    try {
        revertDelete(req.body.id);
        notifyUpdate();
        return res.json({ success: true });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Delete with revert failed' });
    }
});

// Update transaction quantity
app.post('/api/transactions/update', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    const { id, quantity } = req.body;

    if (!id || !quantity || quantity <= 0) {
        return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ.' });
    }

    const updateTransaction = db.transaction(() => {
        // Get current transaction
        const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
        if (!tx) throw new Error('Không tìm thấy giao dịch.');

        const oldQuantity = Number(tx.quantity);
        const newQuantity = Number(quantity);
        const quantityDiff = newQuantity - oldQuantity;

        if (quantityDiff === 0) {
            return { success: true, message: 'Không có thay đổi.' };
        }

        // Helper functions
        const updateMaterialQty = db.prepare("UPDATE materials SET quantity = ?, lastUpdated = ? WHERE id = ?");
        const findById = db.prepare("SELECT * FROM materials WHERE id = ? LIMIT 1");
        const findByNameWorkshop = db.prepare("SELECT * FROM materials WHERE name = ? AND workshop = ? LIMIT 1");

        // Update material quantities based on transaction type
        if (tx.type === 'IN') {
            // For IN: increase material quantity by diff
            const mat = findById.get(tx.materialId);
            if (mat) {
                const newQty = roundQty(Number(mat.quantity) + quantityDiff);
                updateMaterialQty.run(newQty, todayISO(), mat.id);
            }
        } else if (tx.type === 'OUT') {
            // For OUT: decrease material quantity by diff
            const mat = findById.get(tx.materialId);
            if (mat) {
                const newQty = roundQty(Number(mat.quantity) - quantityDiff);
                if (newQty < 0) {
                    throw new Error('Số lượng tồn kho không đủ để thực hiện thay đổi này.');
                }
                updateMaterialQty.run(newQty, todayISO(), mat.id);
            }
        } else if (tx.type === 'TRANSFER') {
            // For TRANSFER: adjust both source and destination
            const sourceMat = findById.get(tx.materialId) || findByNameWorkshop.get(tx.materialName, tx.workshop);
            if (sourceMat) {
                const newQty = roundQty(Number(sourceMat.quantity) - quantityDiff);
                if (newQty < 0) {
                    throw new Error('Số lượng tồn kho nguồn không đủ để thực hiện thay đổi này.');
                }
                updateMaterialQty.run(newQty, todayISO(), sourceMat.id);
            }

            const destMat = tx.targetMaterialId
                ? findById.get(tx.targetMaterialId)
                : findByNameWorkshop.get(tx.materialName, tx.targetWorkshop);
            if (destMat) {
                const newQty = roundQty(Number(destMat.quantity) + quantityDiff);
                updateMaterialQty.run(newQty, todayISO(), destMat.id);
            }
        }

        // Update transaction quantity
        db.prepare("UPDATE transactions SET quantity = ? WHERE id = ?").run(newQuantity, id);

        return { success: true, message: 'Cập nhật thành công.' };
    });

    try {
        const result = updateTransaction();
        notifyUpdate();
        res.json(result);
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Cập nhật thất bại' });
    }
});

app.post('/api/budgets/save', verifyToken, (req, res) => {
    const budget = req.body;
    db.prepare(`
        INSERT INTO budgets (id, orderCode, orderName, projectCode, projectName, address, phone, description, status, workshop, items, createdAt, lastUpdated) 
        VALUES (@id, @orderCode, @orderName, @projectCode, @projectName, @address, @phone, @description, @status, @workshop, @items, @createdAt, @lastUpdated) 
        ON CONFLICT(id) DO UPDATE SET 
            orderCode=excluded.orderCode, 
            orderName=excluded.orderName, 
            projectCode=excluded.projectCode,
            projectName=excluded.projectName, 
            address=excluded.address, 
            phone=excluded.phone, 
            description=excluded.description, 
            status=excluded.status, 
            workshop=excluded.workshop, 
            items=excluded.items, 
            lastUpdated=excluded.lastUpdated
    `).run({
        ...budget,
        orderName: budget.orderName || '',
        projectCode: budget.projectCode || '',
        projectName: budget.projectName || '',
        address: budget.address || '',
        phone: budget.phone || '',
        description: budget.description || '',
        status: budget.status || 'Đang thực hiện',
        items: JSON.stringify(budget.items)
    });
    notifyUpdate();
    res.json({ success: true });
});

app.post('/api/budgets/delete', verifyToken, (req, res) => {
    db.prepare('DELETE FROM budgets WHERE id = ?').run(req.body.id);
    notifyUpdate();
    res.json({ success: true });
});

// Merge materials
app.post('/api/materials/merge', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    const { materialIds, mergedMaterial } = req.body;

    if (!materialIds || !Array.isArray(materialIds) || materialIds.length < 2) {
        return res.status(400).json({ success: false, error: 'Vui lòng chọn ít nhất 2 vật tư để hợp nhất.' });
    }

    if (!mergedMaterial || !mergedMaterial.name || !mergedMaterial.unit) {
        return res.status(400).json({ success: false, error: 'Thông tin vật tư hợp nhất không hợp lệ.' });
    }

    const mergeMaterials = db.transaction(() => {
        // Get all selected materials
        const materials = materialIds.map(id => {
            const mat = db.prepare("SELECT * FROM materials WHERE id = ?").get(id);
            if (!mat) throw new Error(`Không tìm thấy vật tư với ID: ${id}`);
            return mat;
        });

        // Validate: all materials must have same workshop
        const workshops = [...new Set(materials.map(m => m.workshop))];
        if (workshops.length > 1) {
            throw new Error('Chỉ có thể hợp nhất vật tư cùng kho.');
        }

        // Validate: all materials must have same unit
        const units = [...new Set(materials.map(m => m.unit))];
        if (units.length > 1) {
            throw new Error('Chỉ có thể hợp nhất vật tư cùng đơn vị.');
        }

        // Create new merged material
        const newMaterialId = `MAT-${Date.now()}`;
        const now = todayISO();

        db.prepare(`
            INSERT INTO materials (id, name, classification, unit, quantity, minThreshold, workshop, origin, note, createdAt, lastUpdated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            newMaterialId,
            mergedMaterial.name,
            mergedMaterial.classification,
            mergedMaterial.unit,
            mergedMaterial.quantity,
            materials[0].minThreshold || 10,
            mergedMaterial.workshop,
            mergedMaterial.origin || '',
            mergedMaterial.note || '',
            now,
            now
        );

        // Update all transactions to point to new material
        const updateTransactionStmt = db.prepare(`
            UPDATE transactions 
            SET materialId = ?, materialName = ? 
            WHERE materialId = ?
        `);

        const updateTargetMaterialStmt = db.prepare(`
            UPDATE transactions 
            SET targetMaterialId = ? 
            WHERE targetMaterialId = ?
        `);

        materialIds.forEach(oldId => {
            updateTransactionStmt.run(newMaterialId, mergedMaterial.name, oldId);
            updateTargetMaterialStmt.run(newMaterialId, oldId);
        });

        // Delete old materials
        const deleteMaterialStmt = db.prepare('DELETE FROM materials WHERE id = ?');
        materialIds.forEach(id => deleteMaterialStmt.run(id));

        return {
            success: true,
            message: 'Hợp nhất vật tư thành công.',
            newMaterialId,
            mergedCount: materialIds.length
        };
    });

    try {
        const result = mergeMaterials();
        notifyUpdate();
        res.json(result);
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Hợp nhất thất bại' });
    }
});

app.post('/api/users/delete', requirePermission('MANAGE_USERS'), (req, res) => {
    const { id } = req.body;
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(id);

    // Prevent deleting ADMIN account
    if (user && user.role === 'ADMIN') {
        return res.status(400).json({
            error: 'Không thể xóa tài khoản Quản trị viên.'
        });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    notifyUpdate();
    res.json({ success: true });
});

app.post('/api/users/save', requirePermission('MANAGE_USERS'), (req, res) => {
    const user = req.body;

    // Enforce single ADMIN account
    if (user.role === 'ADMIN') {
        const existingAdmin = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' AND id != ?").get(user.id || '');
        if (existingAdmin) {
            return res.status(400).json({
                error: 'Chỉ được phép có 1 tài khoản Quản trị viên duy nhất trong hệ thống.'
            });
        }
    }

    // Prevent changing ADMIN to another role
    if (user.id) {
        const existingUser = db.prepare("SELECT role FROM users WHERE id = ?").get(user.id);
        if (existingUser && existingUser.role === 'ADMIN' && user.role !== 'ADMIN') {
            return res.status(400).json({
                error: 'Không thể thay đổi vai trò của tài khoản Quản trị viên duy nhất.'
            });
        }
    }

    const existing = user?.id ? db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) : null;
    let passwordToStore = existing?.password || null;
    if (typeof user.password === 'string' && user.password.trim()) {
        passwordToStore = user.password.startsWith(HASH_PREFIX) ? user.password : hashPassword(user.password);
    }
    if (!passwordToStore) {
        return res.status(400).json({ success: false, error: 'Mật khẩu không hợp lệ.' });
    }

    db.prepare(`
        INSERT INTO users (id, username, password, fullName, email, role, permissions, isActive, createdAt, lastLogin, createdBy) 
        VALUES (@id, @username, @password, @fullName, @email, @role, @permissions, @isActive, @createdAt, @lastLogin, @createdBy)
        ON CONFLICT(id) DO UPDATE SET 
            username=excluded.username, 
            password=excluded.password, 
            fullName=excluded.fullName, 
            email=excluded.email, 
            role=excluded.role, 
            permissions=excluded.permissions, 
            isActive=excluded.isActive, 
            lastLogin=excluded.lastLogin
    `).run({
        email: null,
        lastLogin: null,
        createdBy: null,
        ...user,
        password: passwordToStore,
        permissions: JSON.stringify(user.permissions || []),
        isActive: user.isActive ? 1 : 0
    });
    invalidateUserCache(user.id);
    notifyUpdate();
    res.json({ success: true });
});

app.post('/api/users/update_self', (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { fullName, email, currentPassword, newPassword } = req.body || {};
    const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(userId);
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });

    if (!verifyPassword(currentPassword || '', user.password)) {
        return res.status(400).json({ success: false, error: 'Mật khẩu hiện tại không chính xác.' });
    }

    const nextPassword = (typeof newPassword === 'string' && newPassword.trim())
        ? hashPassword(newPassword.trim())
        : user.password;

    db.prepare(`
        UPDATE users
        SET fullName = ?, email = ?, password = ?
        WHERE id = ?
    `).run(fullName || user.fullName, email ?? user.email, nextPassword, userId);

    invalidateUserCache(userId);
    const updated = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(userId);
    notifyUpdate();
    return res.json({ success: true, user: sanitizeUser(updated) });
});

app.post('/api/activity_logs/save', verifyToken, (req, res) => {
    const log = req.body;
    db.prepare(`
        INSERT INTO activity_logs (id, userId, username, action, entityType, entityId, details, ipAddress, timestamp) 
        VALUES (@id, @userId, @username, @action, @entityType, @entityId, @details, @ipAddress, @timestamp)
    `).run({
        entityId: null,
        details: null,
        ipAddress: null,
        ...log
    });
    res.json({ success: true });
});

app.post('/api/activity_logs/delete', requirePermission('MANAGE_USERS'), (req, res) => {
    db.prepare('DELETE FROM activity_logs WHERE id = ?').run(req.body.id);
    res.json({ success: true });
});

app.post('/api/activity_logs/clear', requirePermission('MANAGE_USERS'), (req, res) => {
    db.prepare('DELETE FROM activity_logs').run();
    res.json({ success: true });
});

// Projects API
app.post('/api/projects/save', verifyToken, (req, res) => {
    const item = req.body;
    db.prepare(`INSERT INTO projects (id, code, name, address, phone, description, createdAt) 
    VALUES (@id, @code, @name, @address, @phone, @description, @createdAt) 
    ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name, address=excluded.address, phone=excluded.phone, description=excluded.description`).run(item);
    notifyUpdate();
    res.json({ success: true });
});

app.post('/api/projects/delete', verifyToken, (req, res) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.body.id);
    notifyUpdate();
    res.json({ success: true });
});



// ============================================
// CUSTOMER CODES API
// ============================================

// Get all customer codes
app.get('/api/customer-codes', verifyToken, (req, res) => {
    try {
        const codes = db.prepare('SELECT * FROM customer_codes ORDER BY code').all();
        res.json(codes);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save customer code (create or update)
app.post('/api/customer-codes/save', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    try {
        const code = req.body;
        const now = new Date().toISOString();

        if (code.id) {
            // Update existing
            db.prepare(`
                UPDATE customer_codes 
                SET code = ?, name = ?, description = ?, updatedAt = ?
                WHERE id = ?
            `).run(code.code, code.name, code.description || null, now, code.id);
        } else {
            // Create new
            const newId = `CC${String(Date.now()).slice(-6)}`;
            db.prepare(`
                INSERT INTO customer_codes (id, code, name, description, createdAt, createdBy)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(newId, code.code, code.name, code.description || null, now, req.user.userId);
        }

        res.json({ success: true });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ success: false, error: 'Mã khách đã tồn tại.' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// Delete customer code
app.post('/api/customer-codes/delete', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    try {
        const { id } = req.body;

        // Check if customer code is being used by any materials
        const materialsUsingCode = db.prepare(
            'SELECT COUNT(*) as count FROM materials WHERE customerCode = (SELECT code FROM customer_codes WHERE id = ?)'
        ).get(id);

        if (materialsUsingCode.count > 0) {
            return res.status(400).json({
                success: false,
                error: `Không thể xóa mã khách này vì đang được sử dụng bởi ${materialsUsingCode.count} vật tư.`
            });
        }

        db.prepare('DELETE FROM customer_codes WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk import customer codes from Excel
app.post('/api/customer-codes/import', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    try {
        const { codes } = req.body; // Array of {code, name, description}

        if (!Array.isArray(codes) || codes.length === 0) {
            return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ.' });
        }

        const now = new Date().toISOString();
        const userId = req.user.userId;

        const insertStmt = db.prepare(`
            INSERT INTO customer_codes (id, code, name, description, createdAt, createdBy)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                updatedAt = ?
        `);

        const transaction = db.transaction((codes) => {
            let imported = 0;
            let updated = 0;

            for (const code of codes) {
                if (!code.code || !code.name) continue; // Skip invalid rows

                const existing = db.prepare('SELECT id FROM customer_codes WHERE code = ?').get(code.code);
                const id = existing ? existing.id : `CC${String(Date.now() + Math.random()).slice(-8)}`;

                insertStmt.run(
                    id,
                    code.code.trim(),
                    code.name.trim(),
                    code.description ? code.description.trim() : null,
                    now,
                    userId,
                    now
                );

                if (existing) updated++;
                else imported++;
            }

            return { imported, updated };
        });

        const result = transaction(codes);
        res.json({
            success: true,
            imported: result.imported,
            updated: result.updated,
            total: result.imported + result.updated
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Merge multiple customer codes into one
app.post('/api/customer-codes/merge', verifyToken, requirePermission('MANAGE_MATERIALS'), (req, res) => {
    try {
        const { supplierIds, primaryCode, primaryName, description } = req.body;

        // Validate input
        if (!Array.isArray(supplierIds) || supplierIds.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng chọn ít nhất 2 NCC để hợp nhất.'
            });
        }

        if (!primaryCode || !primaryName) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng chọn Mã NCC và Tên NCC chính.'
            });
        }

        // Use transaction to ensure atomicity
        const mergeTransaction = db.transaction(() => {
            // Get all selected suppliers
            const suppliers = db.prepare(
                `SELECT * FROM customer_codes WHERE id IN (${supplierIds.map(() => '?').join(',')})`
            ).all(...supplierIds);

            if (suppliers.length !== supplierIds.length) {
                throw new Error('Một số NCC không tồn tại.');
            }

            // Get all supplier codes to update transactions
            const supplierCodes = suppliers.map(s => s.code);

            // Find the primary supplier (the one we'll keep)
            const primarySupplier = suppliers.find(s => s.code === primaryCode);
            if (!primarySupplier) {
                throw new Error('Mã NCC chính không hợp lệ.');
            }

            // Update the primary supplier with new info
            const now = new Date().toISOString();
            db.prepare(`
                UPDATE customer_codes 
                SET name = ?, description = ?, updatedAt = ?
                WHERE id = ?
            `).run(primaryName, description || null, now, primarySupplier.id);

            // Update all transactions that reference the old supplier codes
            // Change their orderCode to the primary code
            const otherCodes = supplierCodes.filter(code => code !== primaryCode);
            if (otherCodes.length > 0) {
                const updateTxStmt = db.prepare(`
                    UPDATE transactions 
                    SET orderCode = ?
                    WHERE orderCode IN (${otherCodes.map(() => '?').join(',')})
                `);
                updateTxStmt.run(primaryCode, ...otherCodes);
            }

            // Delete the other suppliers (keep only the primary one)
            const otherIds = supplierIds.filter(id => id !== primarySupplier.id);
            if (otherIds.length > 0) {
                const deleteStmt = db.prepare(`
                    DELETE FROM customer_codes 
                    WHERE id IN (${otherIds.map(() => '?').join(',')})
                `);
                deleteStmt.run(...otherIds);
            }

            return {
                mergedCount: otherIds.length,
                primaryCode,
                primaryName
            };
        });

        const result = mergeTransaction();
        notifyUpdate();

        res.json({
            success: true,
            message: `Đã hợp nhất ${result.mergedCount} NCC vào ${result.primaryCode} - ${result.primaryName}`,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/backup', requirePermission('EXPORT_DATA'), (req, res) => {
    try {
        const os = require('os');
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupName = `SmartStock_Backup_${timestamp}.db`;
        const backupPath = path.join(desktopPath, backupName);

        const dbPath = path.join(dataDir, 'data.db');
        if (fs.existsSync(dbPath)) {
            // Close DB properly before copy? 
            // Better-sqlite3 has a .backup() method which is safer while the DB is open
            db.backup(backupPath)
                .then(() => {
                    res.json({ success: true, path: backupPath });
                })
                .catch(err => {
                    res.status(500).json({ success: false, error: err.message });
                });
        } else {
            res.status(404).json({ success: false, error: 'Database file not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// Export transaction receipt to Excel template
app.post('/api/export/receipt', verifyToken, async (req, res) => {
    const { receiptId } = req.body;
    if (!receiptId) return res.status(400).json({ success: false, error: 'Thiếu số phiếu.' });

    try {
        const transactions = db.prepare(`
            SELECT t.*, m.unit as mUnit, m.name as mName, m.customerCode as mCustomerCode
            FROM transactions t
            LEFT JOIN materials m ON t.materialId = m.id
            WHERE t.receiptId = ?
            ORDER BY t.transactionTime ASC
        `).all(receiptId);

        if (transactions.length === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy dữ liệu cho số phiếu này.' });
        }

        const workbook = new ExcelJS.Workbook();
        const templatePath = path.join(__dirname, 'Mau nhap xuat.xlsx');

        if (!fs.existsSync(templatePath)) {
            return res.status(500).json({ success: false, error: 'Không tìm thấy file mẫu Mau nhap xuat.xlsx' });
        }

        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.getWorksheet('Phiếu X-N');

        if (!worksheet) {
            return res.status(500).json({ success: false, error: 'Không tìm thấy sheet Phiếu X-N trong file mẫu.' });
        }

        await populateReceiptWorksheet(worksheet, receiptId, transactions, db);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Phieu_${receiptId}.xlsx`);

        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ success: false, error: 'Lỗi xuất file Excel: ' + error.message });
    }
});

// Bulk Receipt Export (Multi-sheet)
app.post('/api/export/receipts/bulk', verifyToken, async (req, res) => {
    const { receiptIds } = req.body;
    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Thiếu danh sách số phiếu.' });
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const templatePath = path.join(__dirname, 'Mau nhap xuat.xlsx');
        if (!fs.existsSync(templatePath)) return res.status(500).json({ success: false, error: 'Thiếu file mẫu.' });

        await workbook.xlsx.readFile(templatePath);
        const baseSheet = workbook.getWorksheet('Phiếu X-N');
        if (!baseSheet) return res.status(500).json({ success: false, error: 'Thiếu sheet thiết kế.' });

        for (const [idx, rId] of receiptIds.entries()) {
            const txs = db.prepare(`
                SELECT t.*, m.unit as mUnit, m.name as mName, m.customerCode as mCustomerCode
                FROM transactions t
                LEFT JOIN materials m ON t.materialId = m.id
                WHERE t.receiptId = ?
                ORDER BY t.transactionTime ASC
            `).all(rId);

            if (txs.length === 0) continue;

            let targetSheet;
            const sheetName = rId.replace(/[\/\\?*:[\]]/g, '_').substring(0, 31);

            if (idx === 0) {
                targetSheet = baseSheet;
                targetSheet.name = sheetName;
            } else {
                targetSheet = workbook.addWorksheet(sheetName, {
                    pageSetup: baseSheet.pageSetup,
                    properties: baseSheet.properties
                });

                baseSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
                    const newRow = targetSheet.getRow(rowNumber);
                    newRow.height = row.height;
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        const newCell = newRow.getCell(colNumber);
                        newCell.value = cell.value;
                        newCell.style = cell.style;
                    });
                });

                targetSheet.columns = baseSheet.columns.map(col => ({ width: col.width }));
                const merges = baseSheet._merges || {};
                Object.values(merges).forEach(m => targetSheet.mergeCells(m.tl, m.br));
            }

            await populateReceiptWorksheet(targetSheet, rId, txs, db);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Phieu_HangLoat_${new Date().getTime()}.xlsx`);
        res.send(await workbook.xlsx.writeBuffer());
    } catch (error) {
        console.error('Bulk Export Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve static
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('Frontend not built.');
});

// Helper to populate a worksheet with transaction data
async function populateReceiptWorksheet(worksheet, receiptsId, transactions, db) {
    if (transactions.length === 0) return;

    const first = transactions[0];
    const date = first.date ? new Date(first.date) : new Date();
    const isInput = first.type === 'IN';

    // 1. Title (A5)
    worksheet.getCell('A5').value = isInput ? "PHIẾU NHẬP KHO VẬT TƯ" : "PHIẾU XUẤT KHO VẬT TƯ";

    // 2. Date (A6)
    worksheet.getCell('A6').value = `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;

    // 3. Receipt Number (A7)
    worksheet.getCell('A7').value = `Số:${receiptsId}`;

    // 4. Recipient (C8 & D50)
    let recipientName = "";
    if (isInput) {
        if (first.workshop === 'OG') recipientName = "Nguyễn Văn Bắc";
        else recipientName = "Bùi Như Hoàn";
    } else if (first.orderCode) {
        const budget = db.prepare("SELECT projectName FROM budgets WHERE orderCode = ? LIMIT 1").get(first.orderCode);
        recipientName = budget ? budget.projectName : (first.note || "");
    } else {
        recipientName = first.note || "";
    }
    worksheet.getCell('C8').value = recipientName;
    worksheet.getCell('D50').value = recipientName;

    // 5. Reason (A9)
    worksheet.getCell('A9').value = `Lý do ${isInput ? 'nhập' : 'xuất'} kho: ${first.note || (isInput ? 'Nhập' : 'Xuất') + ' vật tư'}`;

    // 6. Populate Items
    transactions.forEach((tx, idx) => {
        const rowIdx = 12 + idx;
        worksheet.getCell(`A${rowIdx}`).value = idx + 1;
        worksheet.getCell(`B${rowIdx}`).value = tx.materialId;
        worksheet.getCell(`C${rowIdx}`).value = tx.materialName || tx.mName;
        worksheet.getCell(`E${rowIdx}`).value = tx.mUnit || '';
        worksheet.getCell(`F${rowIdx}`).value = tx.quantity;

        // Column G: customerCode if IN, orderCode if OUT
        worksheet.getCell(`G${rowIdx}`).value = isInput ? (tx.mCustomerCode || "") : (tx.orderCode || "");

        worksheet.getCell(`J${rowIdx}`).value = tx.note || "";
    });
}



function startServer(port = 3000) {
    server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`[SmartStock] Port ${port} is already in use. Assuming backend is running externally or from a previous session.`);
        } else {
            console.error('[SmartStock] Critical Server Error:', err);
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`Backend server running on http://0.0.0.0:${port} with Socket.io`);
    });

    return server;
}
if (!process.versions.electron) startServer();

module.exports = { startServer };
