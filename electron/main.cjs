const { app, BrowserWindow, ipcMain, Menu, nativeTheme, Notification } = require('electron');
const path = require('path');

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
    
    // Defer update check to avoid blocking startup
    if (process.env.NODE_ENV !== 'development') {
      const { autoUpdater } = require('electron-updater');
      
      autoUpdater.logger = require('electron-log');
      autoUpdater.logger.transports.file.level = 'info';
      
      autoUpdater.autoDownload = false; // DISABLE AUTOMATIC DOWNLOAD
      autoUpdater.allowDowngrade = false;

      const checkUpdates = () => {
        // Only check for metadata, don't download
        autoUpdater.checkForUpdates().catch(err => {
          console.error('Update metadata check failed:', err);
        });
      };

      autoUpdater.on('update-available', (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-available', info.version);
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
        autoUpdater.downloadUpdate(); // EXPLICIT DOWNLOAD TRIGGER
      });

      ipcMain.on('install-update', () => {
        autoUpdater.quitAndInstall(); // EXPLICIT INSTALL TRIGGER
      });

      // Only check once on startup after 3 seconds
      setTimeout(checkUpdates, 3000);
      
      // REMOVED: Background polling Interval
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
