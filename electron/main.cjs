const { app, BrowserWindow, ipcMain, Menu, nativeTheme, Notification, Tray, globalShortcut, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;

// Set App ID for Windows Taskbar/Tray integration
const appId = 'com.todolist.app';
app.setAppUserModelId(appId);

// Handle single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createTray() {
  try {
    // In dev, use public/vite.svg. In prod, Vite copies public to dist.
    const iconPath = process.env.NODE_ENV === 'development' 
      ? path.join(__dirname, '../public/vite.svg')
      : path.join(__dirname, '../dist/vite.svg');
    
    let trayIcon;
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      // Fallback
      const altPath = path.join(__dirname, 'vite.svg');
      if (fs.existsSync(altPath)) {
        trayIcon = nativeImage.createFromPath(altPath);
      } else {
        // Last resort empty image to avoid crash
        trayIcon = nativeImage.createEmpty();
      }
    }

    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'TaskFlow Dashboard', click: () => { mainWindow.show(); mainWindow.webContents.send('navigate', 'hub'); } },
      { label: 'To Do List', click: () => { mainWindow.show(); mainWindow.webContents.send('navigate', 'todo'); } },
      { type: 'separator' },
      { label: 'Quick Glance (Today)', click: () => { mainWindow.show(); mainWindow.webContents.send('navigate', 'calendar'); } },
      { type: 'separator' },
      { label: 'Quit TaskFlow', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    
    tray.setToolTip('TaskFlow Productivity');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
          mainWindow.focus();
        } else {
          mainWindow.hide();
        }
      } else {
        mainWindow.show();
        mainWindow.restore();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error('Failed to create tray:', err);
  }
}

function createWindow() {
  // Remove default menu
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      backgroundThrottling: false, // Prevent background process categorization
    },
    backgroundColor: '#050505',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window close (redirect to tray)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Hide to Tray on Minimize
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  // Ensure window is shown in taskbar when restored
  mainWindow.on('show', () => {
    mainWindow.setSkipTaskbar(false);
  });

  mainWindow.on('hide', () => {
    mainWindow.setSkipTaskbar(true);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    
    // Register Global Hotkey: Alt+Shift+N for Quick Entry
    globalShortcut.register('Alt+Shift+N', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('global-new-task');
      }
    });

    // Defer update check to avoid blocking startup
    if (process.env.NODE_ENV !== 'development') {
      const { autoUpdater } = require('electron-updater');
      
      autoUpdater.logger = require('electron-log');
      autoUpdater.logger.transports.file.level = 'info';
      
      // Explicitly set feed URL to override any baked-in generic providers from old builds
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 's4nby',
        repo: 'TaskFlow'
      });
      
      autoUpdater.autoDownload = false; // Keep false to control download trigger
      autoUpdater.allowDowngrade = false;

      // Ensure full silent update
      autoUpdater.autoInstallOnAppQuit = true;

      const checkUpdates = () => {
        autoUpdater.checkForUpdates().catch(err => {
          console.error('Update metadata check failed:', err);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-error', err.message);
          }
        });
      };

      autoUpdater.on('update-available', (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-available', info.version);
        }
      });

      autoUpdater.on('download-progress', (progressObj) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-progress', progressObj);
        }
      });

      autoUpdater.on('update-not-available', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-not-available');
        }
      });

      autoUpdater.on('update-downloaded', (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-downloaded');
        }
        
        // IMMEDIATELY QUIT AND INSTALL SILENTLY ONCE DOWNLOADED
        // This achieves the "Discord-style" flow where clicking download icon eventually leads to auto-restart
      });

      autoUpdater.on('error', (err) => {
        console.error('AutoUpdater Error:', err);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-error', err.message);
        }
      });

      // IPC to trigger download/install
      ipcMain.on('check-for-updates', () => {
        checkUpdates();
      });

      ipcMain.on('start-update', () => {
        autoUpdater.downloadUpdate();
      });

      ipcMain.on('install-update', () => {
        // isSilent: true, isForceRunAfter: true
        autoUpdater.quitAndInstall(true, true);
      });

      // Check on startup after 3 seconds, then every hour
      setTimeout(checkUpdates, 3000);
      setInterval(checkUpdates, 60 * 60 * 1000);
    }
  });

  // Window control IPC handlers
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
  ipcMain.on('window-close', () => mainWindow.close());

  // Theme IPC handlers
  ipcMain.handle('get-system-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  });

  // Export Logic IPC
  ipcMain.handle('export-to-markdown', async (event, data) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Tasks to Markdown',
      defaultPath: 'TaskFlow_Export.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, data);
      return true;
    }
    return false;
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
