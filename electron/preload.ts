const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any functions you want to expose to the renderer process here
  // Example: send a message to the main process
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  // Example: receive a message from the main process
  onMessage: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  openBroadcastWindow: (canvasId: string) => ipcRenderer.send('open-broadcast-window', canvasId),
});

console.log('Preload script loaded.');
