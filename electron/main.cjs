const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Set data path to AppData for persistence
const dataPath = path.join(app.getPath('userData'), 'data');
process.env.ELECTRON_DATA_PATH = dataPath;

let serverProcess;
let win = null;
let tray = null;
let isQuitting = false;

function createWindow() {
    win = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "SmartStock",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Force clear cache to ensure new UI loads
    win.webContents.session.clearCache().catch(err => console.error("Failed to clear cache:", err));

    // Start Backend Server
    try {
        const { dialog } = require('electron');

        // Luôn nạp server.cjs từ trong gói ứng dụng (bundle)
        // __dirname là /electron, nên .. là thư mục gốc của app
        const serverPath = path.join(__dirname, '..', 'server.cjs');

        if (!fs.existsSync(serverPath)) {
            // Thử dự phòng nếu cấu hình thay đổi
            const altPath = path.join(process.resourcesPath, 'app.asar', 'server.cjs');
            if (fs.existsSync(altPath)) {
                loadAndStartServer(altPath);
            } else {
                dialog.showErrorBox('Lỗi hệ thống', `Không tìm thấy file backend tại: ${serverPath}`);
            }
        } else {
            loadAndStartServer(serverPath);
        }

        function loadAndStartServer(serverFilePath) {
            const { startServer } = require(serverFilePath);
            serverProcess = startServer(3000);

            // Console tự động để kiểm tra
            // win.webContents.openDevTools();

            const loadURL = () => {
                const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

                if (process.env.NODE_ENV === 'development') {
                    win.loadURL('http://localhost:5173').catch(() => {
                        console.error('Frontend dev server not running.');
                    });
                } else {
                    if (fs.existsSync(indexPath)) {
                        win.loadFile(indexPath).catch(err => {
                            console.error('Failed to load file:', err);
                        });
                    } else {
                        console.error('dist/index.html not found, please build first.');
                    }
                }
            };
            loadURL();
        }

        // IPC to get local IP
        const { ipcMain } = require('electron');
        ipcMain.handle('get-local-ip', () => {
            const { networkInterfaces } = require('os');
            const nets = networkInterfaces();
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    // Check for IPv4 and non-internal (not 127.0.0.1)
                    if (net.family === 'IPv4' && !net.internal) {
                        return net.address;
                    }
                }
            }
            return '127.0.0.1';
        });

    } catch (err) {
        const { dialog } = require('electron');
        dialog.showErrorBox('Lỗi khởi động máy chủ', err.stack || err.message);
    }

    const stopServer = () => {
        if (serverProcess) {
            try {
                serverProcess.close();
                serverProcess = null;
            } catch (e) { /* ignore */ }
        }
    };

    win.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            win.hide();
            
            // Show notification on first hide
            if (!app.firstHideDone) {
                new Notification({
                    title: 'SmartStock đang chạy ngầm',
                    body: 'Ứng dụng đã được thu nhỏ xuống khay hệ thống (System Tray). Server vẫn xử lý kết nối từ máy trạm.'
                }).show();
                app.firstHideDone = true;
            }
        }
    });

    app.on('before-quit', stopServer);
}

function setupTray() {
    // Attempt to load logo from public if available, else use empty image
    let icon;
    const publicLogo = path.join(__dirname, '..', 'public', 'logo.png');
    if (fs.existsSync(publicLogo)) {
        icon = nativeImage.createFromPath(publicLogo);
    } else {
        // Just create an empty/dummy icon if no logo found
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);

    const updateMenu = () => {
        let clientCount = 0;
        if (global.io && global.io.engine) {
            clientCount = global.io.engine.clientsCount;
        }

        const contextMenu = Menu.buildFromTemplate([
            { label: '📊 Mở SmartStock', click: () => { if (win) win.show(); } },
            { type: 'separator' },
            { label: `🔄 Trạng thái Server: Đang chạy (${clientCount} client)`, enabled: false },
            { type: 'separator' },
            { 
                label: '❌ Thoát hoàn toàn', 
                click: async () => {
                    const { response } = await dialog.showMessageBox({
                        type: 'question',
                        buttons: ['Hủy', 'Thoát'],
                        title: 'Xác nhận thoát',
                        message: 'Bạn có chắc chắn muốn thoát hoàn toàn Server SmartStock? Các máy trạm sẽ mất kết nối ngay lập tức.',
                        defaultId: 1,
                        cancelId: 0
                    });
                    if (response === 1) {
                        isQuitting = true;
                        app.quit();
                    }
                } 
            }
        ]);
        
        tray.setToolTip(`SmartStock Server (${clientCount} connections)`);
        tray.setContextMenu(contextMenu);
    };

    updateMenu();
    // Update tooltip and client count every 5 seconds
    setInterval(updateMenu, 5000);

    tray.on('double-click', () => {
        if (win) {
            win.show();
        }
    });
}

app.whenReady().then(() => {
    createWindow();
    setupTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && isQuitting) {
        app.quit();
    }
});
