"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000'); // Vite dev server URL (updated port)
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
}
function createBroadcastWindow() {
    const broadcastWindow = new electron_1.BrowserWindow({
        width: 1920,
        height: 1080,
        transparent: true,
        frame: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'), // Correct path to compiled preload.js
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (process.env.NODE_ENV === 'development') {
        broadcastWindow.loadURL('http://localhost:3000/broadcast/default'); // (updated port)
        // Optionally open dev tools for the broadcast window as well
        // broadcastWindow.webContents.openDevTools();
    }
    else {
        broadcastWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'), {
            hash: '/broadcast/default', // Use hash routing for SPA
        });
    }
}
// It's good practice to disable hardware acceleration in headless/virtualized environments.
// This must be called before the app is ready.
electron_1.app.disableHardwareAcceleration();
electron_1.app.whenReady().then(() => {
    createWindow();
    createBroadcastWindow(); // Call the new function
    electron_1.app.on('activate', function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
//# sourceMappingURL=main.js.map