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
    // icon_16x16.png in newicons/ folder
    let iconPath = process.env.NODE_ENV === 'development' 
      ? path.join(__dirname, '../newicons/icon_16x16.png')
      : path.join(__dirname, '../newicons/icon_16x16.png');
    
    // Fallback chain
    if (!fs.existsSync(iconPath)) {
      // Try 32x32 from newicons
      const fallbackPath = path.join(__dirname, '../newicons/icon_32x32.png');
      
      if (fs.existsSync(fallbackPath)) {
        iconPath = fallbackPath;
      } else if (process.platform === 'win32') {
        // Ultimate Windows fallback: Use the icon embedded in the .exe
        iconPath = process.execPath;
      }
    }

    let trayIcon = nativeImage.createFromPath(iconPath);
    
    // On Windows, if we're using the EXE fallback, we don't need to resize 
    // as much, but for PNG/SVG we should ensure it fits 16x16
    if (!iconPath.endsWith('.exe')) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
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
    
    tray.setToolTip('TaskFlow');
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

  const windowIconPath = path.join(__dirname, '../newicons/icon_256x256.png');
  const windowIcon = fs.existsSync(windowIconPath)
    ? nativeImage.createFromPath(windowIconPath)
    : undefined;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    icon: windowIcon,
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

  // Minimize behavior is standard (to taskbar). 
  // No custom logic needed for 'minimize' event to achieve normal behavior.

  // Ensure window is shown in taskbar when restored
  mainWindow.on('show', () => {
    mainWindow.setSkipTaskbar(false);
  });

  // Note: We removed the mainWindow.on('hide') taskbar hiding logic 
  // so the app remains visible in the taskbar even if minimized or hidden.

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
      const log = require('electron-log');
      
      autoUpdater.logger = log;
      autoUpdater.logger.transports.file.level = 'info';
      
      log.info('[Updater] Initializing autoUpdater. App version:', app.getVersion());

      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 's4nby',
        repo: 'TaskFlow'
      });
      
      autoUpdater.autoDownload = false; 
      autoUpdater.allowDowngrade = false;
      autoUpdater.autoInstallOnAppQuit = true;

      const checkUpdates = () => {
        log.info('[Updater] checkUpdates() explicitly called');
        autoUpdater.checkForUpdates().then((result) => {
          log.info('[Updater] checkForUpdates promise resolved. UpdateInfo:', result ? result.updateInfo.version : 'null');
        }).catch(err => {
          log.error('[Updater] checkForUpdates error:', err);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-error', err.message);
          }
        });
      };

      autoUpdater.on('checking-for-update', () => {
        log.info('[Updater] Event: checking-for-update');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-checking');
        }
      });

      autoUpdater.on('update-available', (info) => {
        log.info('[Updater] Event: update-available. New version:', info.version);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-available', info.version);
        }
      });

      autoUpdater.on('download-progress', (progressObj) => {
        log.info(`[Updater] Event: download-progress: ${progressObj.percent}%`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-progress', progressObj);
        }
      });

      autoUpdater.on('update-not-available', (info) => {
        log.info('[Updater] Event: update-not-available. Latest is:', info ? info.version : 'unknown');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-not-available');
        }
      });

      autoUpdater.on('update-downloaded', (info) => {
        log.info('[Updater] Event: update-downloaded. Version:', info.version);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-downloaded');
        }
      });

      autoUpdater.on('error', (err) => {
        log.error('[Updater] Event: error. Details:', err);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-error', err.message);
        }
      });

      // IPC to trigger download/install
      ipcMain.on('check-for-updates', () => {
        log.info('[Updater] IPC received: check-for-updates');
        checkUpdates();
      });

      ipcMain.on('start-update', () => {
        autoUpdater.downloadUpdate();
      });

      ipcMain.on('install-update', () => {
        // CRITICAL: Set isQuitting to true so the window close event 
        // isn't intercepted and redirected to tray.
        app.isQuitting = true;
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
