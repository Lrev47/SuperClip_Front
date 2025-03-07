const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Authentication
  getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
  setAuthToken: (token) => ipcRenderer.invoke('set-auth-token', token),
  clearAuthToken: () => ipcRenderer.invoke('clear-auth-token'),
  
  // Clipboard operations
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard-copy', text),
  readFromClipboard: () => ipcRenderer.invoke('clipboard-read'),
  
  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // External links
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
  
  // Window controls
  windowControl: (action) => ipcRenderer.send('window-control', action),
  isWindowMaximized: () => ipcRenderer.invoke('is-window-maximized'),
  isFullScreen: () => ipcRenderer.invoke('is-full-screen'),
  titleBarDoubleClick: () => ipcRenderer.send('title-bar-double-click'),
  
  // Window snapping - direct methods
  snapWindowLeft: () => ipcRenderer.invoke('snap-window-left'),
  snapWindowRight: () => ipcRenderer.invoke('snap-window-right'),
  snapWindowMaximize: () => ipcRenderer.invoke('snap-window-maximize'),
  
  // Event listeners
  onMaximizeChange: (callback) => {
    // Remove any existing listeners to avoid memory leaks
    ipcRenderer.removeAllListeners('window-maximize-change');
    // Add new listener
    ipcRenderer.on('window-maximize-change', callback);
  },
  
  onFullScreenChange: (callback) => {
    // Remove any existing listeners to avoid memory leaks
    ipcRenderer.removeAllListeners('full-screen-change');
    // Add new listener
    ipcRenderer.on('full-screen-change', callback);
  },
  
  // Navigation
  onNavigate: (callback) => {
    // Remove any existing listeners to avoid memory leaks
    ipcRenderer.removeAllListeners('navigate');
    // Add new listener
    ipcRenderer.on('navigate', (event, path) => callback(path));
  },
  
  // Logging
  getLogsPath: () => ipcRenderer.invoke('get-logs-path'),
  getCurrentLog: () => ipcRenderer.invoke('get-current-log'),
  readLogs: (filePath) => ipcRenderer.invoke('read-logs', filePath),
  
  // Developer Tools
  openDevTools: () => ipcRenderer.send('open-dev-tools'),
}); 