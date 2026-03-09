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
      
      // Configure verbose logging for debugging update comparison
      autoUpdater.logger = require('electron-log');
      autoUpdater.logger.transports.file.level = 'info';
      
      // Explicitly allow version downgrades if needed for testing or recovery
      autoUpdater.allowDowngrade = false;

      const checkUpdates = () => {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
          console.error('Manual update check failed:', err);
        });
      };

      autoUpdater.on('update-available', (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-available', info.version);
        }
        new Notification({
          title: 'TaskFlow Update Available',
          body: `Version ${info.version} is available and downloading.`
        }).show();
      });

      autoUpdater.on('update-downloaded', (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-downloaded');
        }
        new Notification({
          title: 'Update Ready',
          body: 'Restart TaskFlow to apply the latest updates.'
        }).show();
      });

      autoUpdater.on('error', (err) => {
        console.error('AutoUpdater Error:', err);
      });

      // IPC to trigger download/install
      ipcMain.on('start-update', () => {
        autoUpdater.downloadUpdate();
      });

      ipcMain.on('install-update', () => {
        autoUpdater.quitAndInstall();
      });

      // Initial check after 3 seconds
      setTimeout(checkUpdates, 3000);

      // Background polling: Check every 4 hours
      setInterval(checkUpdates, 1000 * 60 * 60 * 4);
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
