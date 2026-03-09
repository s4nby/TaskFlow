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
      setTimeout(() => {
        try {
          const { autoUpdater } = require('electron-updater');
          
          autoUpdater.on('update-available', (info) => {
            new Notification({
              title: 'TaskFlow Update Available',
              body: `Version ${info.version} is available and downloading.`
            }).show();
          });

          autoUpdater.on('update-downloaded', (info) => {
            new Notification({
              title: 'Update Ready',
              body: 'Restart TaskFlow to apply the latest updates.'
            }).show();
          });

          autoUpdater.checkForUpdatesAndNotify();
        } catch (err) {
          console.error('Failed to initialize auto-updater:', err);
        }
      }, 3000);
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
