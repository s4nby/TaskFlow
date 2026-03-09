const { app, BrowserWindow, ipcMain, Menu, nativeTheme, Notification, Tray, globalShortcut, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

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
    },
    backgroundColor: '#050505',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Register Global Hotkey: Alt+Shift+N for Quick Entry
    globalShortcut.register('Alt+Shift+N', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.webContents.send('global-new-task');
      }
    });

    // Create System Tray
    try {
      const iconPath = path.join(__dirname, '../public/vite.svg'); // Placeholder
      tray = new Tray(iconPath);
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
      tray.on('click', () => mainWindow.show());
    } catch (err) {
      console.error('Failed to create tray:', err);
    }

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

      // Only check once on startup after 3 seconds
      setTimeout(checkUpdates, 3000);
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

app.whenReady().then(createWindow);

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
