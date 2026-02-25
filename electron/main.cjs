const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Set data path to AppData for persistence
const dataPath = path.join(app.getPath('userData'), 'data');
process.env.ELECTRON_DATA_PATH = dataPath;

let serverProcess;

function createWindow() {
    const win = new BrowserWindow({
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

    win.on('closed', stopServer);
    app.on('before-quit', stopServer);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
