const { app, BrowserWindow, ipcMain, Menu, Tray, clipboard, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const { globalShortcut } = require('electron');
const fs = require('fs');

// Initialize electron-store
const store = new Store();

// Setup logging to file
const setupLogging = () => {
  const logDir = path.join(app.getPath('userData'), 'logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `superclip-${new Date().toISOString().split('T')[0]}.log`);
  console.log(`Logging to file: ${logFile}`);
  
  // Create write stream
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Override console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Helper to write to both console and file
  const logToFileAndConsole = (type, args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    logStream.write(`[${timestamp}] [${type}] ${message}\n`);
    
    // Call original console method
    return type === 'log' 
      ? originalConsoleLog(...args)
      : type === 'error'
        ? originalConsoleError(...args)
        : originalConsoleWarn(...args);
  };
  
  // Override console methods
  console.log = (...args) => logToFileAndConsole('log', args);
  console.error = (...args) => logToFileAndConsole('error', args);
  console.warn = (...args) => logToFileAndConsole('warn', args);
  
  // Add a shutdown handler to close the log stream
  app.on('will-quit', () => {
    console.log('Application shutting down, closing log stream');
    logStream.end();
  });
  
  return logFile;
};

// Create globals
let mainWindow;
let tray = null;
let logFile = null;

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

  // Open DevTools automatically in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    console.log('DevTools opened automatically in development mode');
  }

  // Show window when it's ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Create a global shortcut to open DevTools
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.toggleDevTools();
      console.log('DevTools toggled with keyboard shortcut');
    }
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
        { type: 'separator' },
        {
          label: 'Open Console Logs Folder',
          click: () => {
            const logDir = path.join(app.getPath('userData'), 'logs');
            shell.openPath(logDir);
          },
        },
        {
          label: 'Open Current Log File',
          click: () => {
            if (logFile) {
              shell.openPath(logFile);
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Log File Not Available',
                message: 'No log file is currently active.'
              });
            }
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

// Setup app when ready
app.whenReady().then(() => {
  // Initialize logging first
  logFile = setupLogging();
  console.log('SuperClip starting up...');
  
  // Create main window
  createWindow();
  
  // Create tray icon
  createTray();
  
  // Add developer menu if in dev mode
  if (isDev) {
    console.log('Running in development mode');
  } else {
    console.log('Running in production mode');
  }
  
  // Log app info
  console.log(`App version: ${app.getVersion()}`);
  console.log(`Electron version: ${process.versions.electron}`);
  console.log(`Chrome version: ${process.versions.chrome}`);
  console.log(`Node version: ${process.versions.node}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`User data path: ${app.getPath('userData')}`);

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

// IPC handlers for logs
ipcMain.handle('get-logs-path', async (event) => {
  return path.join(app.getPath('userData'), 'logs');
});

ipcMain.handle('get-current-log', async (event) => {
  return logFile;
});

ipcMain.handle('read-logs', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading log file:', error);
    return null;
  }
});

// IPC handler for DevTools
ipcMain.on('open-dev-tools', (event) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    console.log('DevTools opened via IPC command');
  }
}); 