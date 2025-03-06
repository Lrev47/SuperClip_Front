const { app, BrowserWindow, ipcMain, Menu, Tray, clipboard, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store');

// Initialize electron-store
const store = new Store();

let mainWindow;
let tray = null;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    // Set the background color to a dark theme color to match the dark mode UI
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hidden',
    frame: false,
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3001'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when it's ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create the application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            mainWindow.webContents.send('navigate', '/settings');
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SuperClip',
          click: () => {
            mainWindow.webContents.send('navigate', '/about');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Create system tray icon
function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show SuperClip',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('SuperClip');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

// App ready event
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Re-create window if it's closed and user clicks on dock/taskbar icon (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC communication handlers
// Copy content to clipboard
ipcMain.handle('clipboard-copy', async (event, text) => {
  clipboard.writeText(text);
  return true;
});

// Read from clipboard
ipcMain.handle('clipboard-read', async (event) => {
  return clipboard.readText();
});

// Get auth token from secure storage
ipcMain.handle('get-auth-token', async (event) => {
  return store.get('authToken');
});

// Save auth token to secure storage
ipcMain.handle('set-auth-token', async (event, token) => {
  if (token === null || token === undefined) {
    // Use delete instead of setting to null/undefined
    store.delete('authToken');
  } else {
    store.set('authToken', token);
  }
  return true;
});

// Clear auth token from secure storage
ipcMain.handle('clear-auth-token', async (event) => {
  store.delete('authToken');
  return true;
});

// Show save dialog for CSV export
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Prompts',
    defaultPath: options.defaultPath || 'prompts-export.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  
  return result;
});

// Open external links in browser
ipcMain.handle('open-external-link', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

// Handle window controls
ipcMain.on('window-control', (event, action) => {
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
  }
}); 