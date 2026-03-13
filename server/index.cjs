'use strict';
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
global.io = io;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ===== IMPORT ROUTES & MIDDLEWARE =====
const { authMiddleware } = require('./middleware/auth.cjs');
const authRoutes = require('./routes/auth.cjs');
const { router: systemRouter } = require('./routes/system.cjs');
const materialsRouter = require('./routes/materials.cjs');
const { router: transactionsRouter, setIo: txSetIo } = require('./routes/transactions.cjs');
const { router: approvalRouter, setIo: approvalSetIo } = require('./routes/approval.cjs');
const usersRouter = require('./routes/users.cjs');
const { router: suppliersRouter, setIo: suppliersSetIo } = require('./routes/suppliers.cjs');
const { router: backupsRouter, performBackup, setIo: backupsSetIo } = require('./routes/backups.cjs');

// Pass io to routes that need it
txSetIo(io);
approvalSetIo(io);
suppliersSetIo(io);
backupsSetIo(io);

// ===== PUBLIC ROUTES (no auth) =====
app.post('/api/auth/login', loginLimiter, authRoutes);
app.post('/api/auth/logout', (req, res) => res.json({ success: true }));
app.get('/api/system-info', (req, res) => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let fallbacks = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            const isIPv4 = net.family === 'IPv4' || net.family === 4;
            if (isIPv4 && !net.internal) {
                const isPrivate = net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.');
                if (isPrivate) return res.json({ ip: net.address });
                fallbacks.push(net.address);
            }
        }
    }
    return res.json({ ip: fallbacks[0] || '127.0.0.1' });
});

// ===== AUTH MIDDLEWARE for all /api routes below =====
app.use('/api', authMiddleware);

// ===== PROTECTED ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', systemRouter);
app.use('/api/activity_logs', systemRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/approval', approvalRouter);
app.use('/api/users', usersRouter);
app.use('/api/budgets', usersRouter);
app.use('/api/projects', usersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/customer-codes', suppliersRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/backup', backupsRouter);
app.use('/api/download-db', backupsRouter);
app.use('/api/inventory-checks', backupsRouter);

// ===== STATIC FRONTEND =====
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('Frontend not built.');
});

// ===== WEBSOCKET =====
io.on('connection', (socket) => {
    socket.on('disconnect', () => { });
});

// ===== AUTO BACKUP CRON =====
const cron = require('node-cron');
cron.schedule('0 8,20 * * *', () => {
    console.log('[SmartStock] Running scheduled backup...');
    performBackup();
});

// ===== START SERVER =====
function startServer(port = PORT) {
    server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`[SmartStock] Port ${port} already in use.`);
        } else {
            console.error('[SmartStock] Server error:', err);
        }
    });
    server.listen(port, '0.0.0.0', () => {
        console.log(`[SmartStock] Backend running on http://0.0.0.0:${port}`);
    });
    return server;
}

if (!process.versions.electron) startServer();

module.exports = { startServer };