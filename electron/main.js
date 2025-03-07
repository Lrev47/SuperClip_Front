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
let windowBounds = null; // Store window bounds before maximizing

// Create the main application window
function createWindow() {
  // Get primary display dimensions
  const { width: screenWidth, height: screenHeight } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  
  // Debug output screen dimensions
  console.log('Primary display work area:', require('electron').screen.getPrimaryDisplay().workArea);
  console.log('Primary display bounds:', require('electron').screen.getPrimaryDisplay().bounds);
  
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
    useContentSize: true, // Use content size for better sizing
    center: true, // Center the window
    // IMPORTANT: Enable Windows snapping support natively
    thickFrame: true, // Use Windows thick frame for native snapping
    autoHideMenuBar: true, // Hide menu bar for cleaner look
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

  // Add window snapping functionality
  let isMoving = false;
  let moveTimeout = null;
  let isSnapped = false;
  let snapPosition = null;
  let previousBounds = null;
  let snapStartTime = 0;

  // Get all available displays for multi-monitor support
  const getAllDisplays = () => {
    return require('electron').screen.getAllDisplays();
  };

  // Find which display the window is currently on
  const getCurrentDisplay = (winBounds) => {
    const center = {
      x: winBounds.x + winBounds.width / 2,
      y: winBounds.y + winBounds.height / 2
    };
    
    const displays = getAllDisplays();
    return displays.find(display => {
      const bounds = display.bounds;
      return center.x >= bounds.x && center.x < bounds.x + bounds.width &&
             center.y >= bounds.y && center.y < bounds.y + bounds.height;
    }) || require('electron').screen.getPrimaryDisplay();
  };

  // Add a direct method to snap windows using the Windows-native approach
  const snapWindowToSide = (side) => {
    console.log(`Snapping window to ${side} using keyboard shortcut method`);
    
    const currentDisplay = getCurrentDisplay(mainWindow.getBounds());
    const workArea = currentDisplay.workArea;
    
    // Use direct setBounds for more control and consistency across platforms
    if (side === 'left') {
      mainWindow.setBounds({
        x: workArea.x,
        y: workArea.y,
        width: Math.floor(workArea.width / 2),
        height: workArea.height
      });
    } else if (side === 'right') {
      mainWindow.setBounds({
        x: workArea.x + Math.floor(workArea.width / 2),
        y: workArea.y, 
        width: Math.floor(workArea.width / 2),
        height: workArea.height
      });
    } else if (side === 'maximize') {
      mainWindow.maximize();
    }
    
    // Directly set the size after position to prevent any issues
    if (side === 'left' || side === 'right') {
      setTimeout(() => {
        if (side === 'left') {
          mainWindow.setPosition(workArea.x, workArea.y);
        } else if (side === 'right') {
          mainWindow.setPosition(workArea.x + Math.floor(workArea.width / 2), workArea.y);
        }
        
        mainWindow.setSize(Math.floor(workArea.width / 2), workArea.height);
      }, 50);
    }
  };

  // Add IPC handlers for side snapping
  ipcMain.handle('snap-window-left', () => {
    snapWindowToSide('left');
    return true;
  });
  
  ipcMain.handle('snap-window-right', () => {
    snapWindowToSide('right');
    return true;
  });
  
  ipcMain.handle('snap-window-maximize', () => {
    snapWindowToSide('maximize');
    return true;
  });

  // Listen for window move events
  mainWindow.on('move', () => {
    // If we're already tracking movement, clear the previous timeout
    if (moveTimeout) {
      clearTimeout(moveTimeout);
    }
    
    // Mark that we're moving
    if (!isMoving) {
      isMoving = true;
      snapStartTime = Date.now();
    }
    
    // Check window position for snapping
    const currentPosition = mainWindow.getBounds();
    
    // Get the current display the window is on
    const currentDisplay = getCurrentDisplay(currentPosition);
    const workArea = currentDisplay.workArea;
    
    // Calculate snap dimensions for the current display
    const snapThreshold = 20; // Distance in pixels to trigger snap
    const snapWidth = Math.floor(workArea.width / 2);
    const snapHeight = workArea.height;
    const quarterWidth = Math.floor(workArea.width / 2);
    const quarterHeight = Math.floor(workArea.height / 2);
    
    // Calculate relative position to the current display
    const relativeX = currentPosition.x - workArea.x;
    const relativeY = currentPosition.y - workArea.y;
    const rightEdge = workArea.x + workArea.width;
    const bottomEdge = workArea.y + workArea.height;
    
    // IMPORTANT: Debug output for display metrics
    console.log('Current display work area:', workArea);
    console.log('Current bounds:', currentPosition);
    
    // Set timeout to allow for detecting end of move
    moveTimeout = setTimeout(() => {
      // How long the window has been moving
      const moveDuration = Date.now() - snapStartTime;
      
      // Only consider snapping if we've been moving for a short time and then paused
      // This prevents accidental snaps during normal movement
      if (moveDuration > 200) {
        // Don't snap if we're just moving across the screen
        isMoving = false;
        return;
      }

      // Check if we're near any edges of the current display
      const nearLeftEdge = relativeX < snapThreshold;
      const nearRightEdge = (rightEdge - (currentPosition.x + currentPosition.width)) < snapThreshold;
      const nearTopEdge = relativeY < snapThreshold;
      const nearBottomEdge = (bottomEdge - (currentPosition.y + currentPosition.height)) < snapThreshold;
      
      // Check for corner snapping first (when clearly in a corner region)
      // We add a stricter threshold for corners to make side-snapping easier
      const cornerThreshold = snapThreshold * 0.7; // Make corner detection more precise
      const strictNearTopEdge = relativeY < cornerThreshold;
      const strictNearBottomEdge = (bottomEdge - (currentPosition.y + currentPosition.height)) < cornerThreshold;
      
      const isTopLeftCorner = nearLeftEdge && strictNearTopEdge;
      const isTopRightCorner = nearRightEdge && strictNearTopEdge;
      const isBottomLeftCorner = nearLeftEdge && strictNearBottomEdge;
      const isBottomRightCorner = nearRightEdge && strictNearBottomEdge;
      
      // Only snap if we're moving
      if (!isMoving) {
        return;
      }
      
      // Calculate half/full screen dimensions
      // Full height of the current display's work area
      const fullHeight = workArea.height;
      // Half width of the current display's work area
      const halfWidth = Math.floor(workArea.width / 2);
      
      // Explicitly log the dimensions that will be used for side snapping
      console.log('Side snapping dimensions:', {
        halfWidth,
        fullHeight,
        workAreaHeight: workArea.height,
        workAreaY: workArea.y
      });
      
      // Define helper function to log and perform snap
      const performSnap = (position, bounds) => {
        console.log(`Snapping to ${position} on display:`, currentDisplay.id);
        console.log('Snap bounds:', bounds);
        previousBounds = { ...currentPosition };
        
        // First set the position
        mainWindow.setBounds(bounds);
        
        // Force a specific size and position to ensure it applies correctly
        if (position === 'left' || position === 'right') {
          console.log('Forcing window resize for side snapping');
          // Wait a tiny bit for the window manager to process the initial sizing
          setTimeout(() => {
            // Set exact width and height directly, starting with position to avoid jumps
            mainWindow.setPosition(bounds.x, bounds.y);
            mainWindow.setSize(bounds.width, bounds.height);
            
            // Double-check the final bounds
            setTimeout(() => {
              const finalBounds = mainWindow.getBounds();
              console.log('Final window bounds:', finalBounds);
            }, 50);
          }, 10);
        }
        
        isSnapped = true;
        snapPosition = position;
      };
      
      // Top-left corner snap
      if (isTopLeftCorner) {
        performSnap('corner-top-left', {
          x: workArea.x,
          y: workArea.y,
          width: quarterWidth,
          height: quarterHeight
        });
      }
      // Top-right corner snap
      else if (isTopRightCorner) {
        performSnap('corner-top-right', {
          x: workArea.x + workArea.width - quarterWidth,
          y: workArea.y,
          width: quarterWidth,
          height: quarterHeight
        });
      }
      // Bottom-left corner snap
      else if (isBottomLeftCorner) {
        performSnap('corner-bottom-left', {
          x: workArea.x,
          y: workArea.y + workArea.height - quarterHeight,
          width: quarterWidth,
          height: quarterHeight
        });
      }
      // Bottom-right corner snap
      else if (isBottomRightCorner) {
        performSnap('corner-bottom-right', {
          x: workArea.x + workArea.width - quarterWidth,
          y: workArea.y + workArea.height - quarterHeight,
          width: quarterWidth,
          height: quarterHeight
        });
      }
      // Top edge snap (maximize)
      else if (nearTopEdge) {
        windowBounds = { ...currentPosition };
        previousBounds = { ...currentPosition };
        performSnap('top', {
          x: workArea.x,
          y: workArea.y,
          width: workArea.width,
          height: workArea.height
        });
      }
      // Left edge snap - FULL HEIGHT, half width
      else if (nearLeftEdge) {
        // Create the bounds directly using the work area values
        const leftSnapBounds = {
          x: workArea.x,
          y: workArea.y,
          width: halfWidth,
          height: workArea.height  // Use workArea.height directly
        };
        console.log('Left snap bounds:', leftSnapBounds);
        performSnap('left', leftSnapBounds);
      }
      // Right edge snap - FULL HEIGHT, half width
      else if (nearRightEdge) {
        // Create the bounds directly using the work area values
        const rightSnapBounds = {
          x: workArea.x + workArea.width - halfWidth,
          y: workArea.y,
          width: halfWidth,
          height: workArea.height  // Use workArea.height directly
        };
        console.log('Right snap bounds:', rightSnapBounds);
        performSnap('right', rightSnapBounds);
      }
      
      // Reset the moving flag
      isMoving = false;
    }, 150); // Small delay to check if window has stopped at an edge
  });

  // Set up window state change listeners
  mainWindow.on('maximize', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('window-maximize-change', true);
    }
  });
  
  mainWindow.on('unmaximize', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('window-maximize-change', false);
    }
  });
  
  // Add fullscreen event handlers
  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('full-screen-change', true);
    }
  });
  
  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('full-screen-change', false);
    }
  });

  // Store window bounds before resizing
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized() && !mainWindow.isFullScreen()) {
      windowBounds = mainWindow.getBounds();
    }
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
  if (!mainWindow) return;
  
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      // Store bounds before changing window state
      if (!mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
        windowBounds = mainWindow.getBounds();
      }
      
      if (mainWindow.isMaximized() || mainWindow.isFullScreen()) {
        // Restore previous state
        if (windowBounds) {
          mainWindow.setBounds(windowBounds);
        } else {
          mainWindow.unmaximize();
        }
        mainWindow.setFullScreen(false);
        mainWindow.webContents.send('window-maximize-change', false);
      } else {
        // For WSL/Windows environment, use a special approach
        const isWSL = process.env.WSL_DISTRO_NAME || 
                      (process.env.PATH && process.env.PATH.includes('wsl'));
        
        if (isWSL || process.platform === 'win32') {
          // Use fullScreen mode for WSL which provides better coverage
          mainWindow.setFullScreen(true);
          
          // Give the renderer a moment to update its state
          setTimeout(() => {
            mainWindow.webContents.send('window-maximize-change', true);
          }, 100);
        } else {
          // For other platforms, use regular maximize
          mainWindow.maximize();
        }
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

// Handle check if window is maximized
ipcMain.handle('is-window-maximized', (event) => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Handle check if window is in fullscreen
ipcMain.handle('is-full-screen', (event) => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// Double-click on title bar to maximize/restore
ipcMain.on('title-bar-double-click', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
}); 