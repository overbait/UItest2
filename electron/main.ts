import { app, BrowserWindow, ipcMain } from 'electron'; // Added ipcMain
import path from 'path';

// Manager for broadcast windows
const broadcastWindows = new Map<string, BrowserWindow>();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000'); // Vite dev server URL (updated port)
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// The old createBroadcastWindow function is removed as its logic is now in the IPC handler.

// It's good practice to disable hardware acceleration in headless/virtualized environments.
// This must be called before the app is ready.
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createWindow();

  // Temporary IPC simulation for testing was here - REMOVED

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for opening broadcast windows
ipcMain.on('open-broadcast-window', (event, canvasId: string) => {
  if (!canvasId) {
    console.error('IPC event "open-broadcast-window" received without canvasId');
    return;
  }

  if (broadcastWindows.has(canvasId)) {
    const existingWindow = broadcastWindows.get(canvasId);
    if (existingWindow && !existingWindow.isDestroyed()) {
      console.log(`Focusing existing broadcast window for canvasId ${canvasId}.`); // Added log for focusing
      existingWindow.focus();
      return;
    } else {
      // Window was in map but destroyed, remove it before creating a new one
      broadcastWindows.delete(canvasId);
    }
  }

  // Create a new broadcast window
  const newBroadcastWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Ensure this path is correct
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = 'http://localhost:3000'; // Ensure this matches your Vite dev server port

  if (process.env.NODE_ENV === 'development') {
    newBroadcastWindow.loadURL(`${devServerUrl}/broadcast/${canvasId}`);
    // newBroadcastWindow.webContents.openDevTools(); // Optional: for debugging broadcast window
  } else {
    newBroadcastWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
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
