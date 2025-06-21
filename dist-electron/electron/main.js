"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron"); // Added ipcMain
const path_1 = __importDefault(require("path"));
// Manager for broadcast windows
const broadcastWindows = new Map();
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
// The old createBroadcastWindow function is removed as its logic is now in the IPC handler.
// It's good practice to disable hardware acceleration in headless/virtualized environments.
// This must be called before the app is ready.
electron_1.app.disableHardwareAcceleration();
electron_1.app.whenReady().then(() => {
    createWindow();
    // Temporary IPC simulation for testing
    if (process.env.NODE_ENV === 'development') { // Only run simulation in dev
        setTimeout(() => {
            console.log('[TEST_SIM] Simulating IPC: open-broadcast-window for default');
            electron_1.ipcMain.emit('open-broadcast-window', {}, 'default'); // {} is a placeholder for event
        }, 5000); // Delay to allow main window to load a bit
        setTimeout(() => {
            console.log('[TEST_SIM] Simulating IPC: open-broadcast-window for default (again to test focus)');
            electron_1.ipcMain.emit('open-broadcast-window', {}, 'default');
        }, 10000);
        setTimeout(() => {
            console.log('[TEST_SIM] Simulating IPC: open-broadcast-window for canvas-2');
            electron_1.ipcMain.emit('open-broadcast-window', {}, 'canvas-2');
        }, 15000);
    }
    electron_1.app.on('activate', function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// IPC Handler for opening broadcast windows
electron_1.ipcMain.on('open-broadcast-window', (event, canvasId) => {
    if (!canvasId) {
        console.error('IPC event "open-broadcast-window" received without canvasId');
        return;
    }
    if (broadcastWindows.has(canvasId)) {
        const existingWindow = broadcastWindows.get(canvasId);
        if (existingWindow && !existingWindow.isDestroyed()) {
            existingWindow.focus();
            return;
        }
        else {
            // Window was in map but destroyed, remove it before creating a new one
            broadcastWindows.delete(canvasId);
        }
    }
    // Create a new broadcast window
    const newBroadcastWindow = new electron_1.BrowserWindow({
        width: 1920,
        height: 1080,
        transparent: true,
        frame: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'), // Ensure this path is correct
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    const devServerUrl = 'http://localhost:3000'; // Ensure this matches your Vite dev server port
    if (process.env.NODE_ENV === 'development') {
        newBroadcastWindow.loadURL(`${devServerUrl}/broadcast/${canvasId}`);
        // newBroadcastWindow.webContents.openDevTools(); // Optional: for debugging broadcast window
    }
    else {
        newBroadcastWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'), {
            hash: `/broadcast/${canvasId}`,
        });
    }
    broadcastWindows.set(canvasId, newBroadcastWindow);
    newBroadcastWindow.on('closed', () => {
        broadcastWindows.delete(canvasId);
        console.log(`Broadcast window for canvasId ${canvasId} closed and removed from manager.`);
    });
    console.log(`Broadcast window for canvasId ${canvasId} created.`);
});
//# sourceMappingURL=main.js.map