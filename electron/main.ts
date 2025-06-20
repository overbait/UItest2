import { app, BrowserWindow } from 'electron';
import path from 'path';

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

function createBroadcastWindow() {
  const broadcastWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Correct path to compiled preload.js
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    broadcastWindow.loadURL('http://localhost:3000/broadcast/default'); // (updated port)
    // Optionally open dev tools for the broadcast window as well
    // broadcastWindow.webContents.openDevTools();
  } else {
    broadcastWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/broadcast/default', // Use hash routing for SPA
    });
  }
}

// It's good practice to disable hardware acceleration in headless/virtualized environments.
// This must be called before the app is ready.
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createWindow();
  createBroadcastWindow(); // Call the new function

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
