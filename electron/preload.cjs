const { contextBridge, ipcRenderer } = require('electron');

const SEND_CHANNELS = [
  'window-minimize',
  'window-maximize',
  'window-close',
  'check-for-updates',
  'start-update',
  'install-update',
];

const RECEIVE_CHANNELS = [
  'global-new-task',
  'navigate',
  'update-available',
  'update-not-available',
  'update-progress',
  'update-downloaded',
  'update-error',
  'update-checking',
  'system-theme-updated',
];

const INVOKE_CHANNELS = [
  'get-system-theme',
];

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, ...args) => {
    if (SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  on: (channel, callback) => {
    if (RECEIVE_CHANNELS.includes(channel)) {
      const wrapped = (_event, ...args) => callback(...args);
      ipcRenderer.on(channel, wrapped);
      return wrapped;
    }
  },
  removeListener: (channel, callback) => {
    if (RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  invoke: (channel, ...args) => {
    if (INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Unauthorized channel: ${channel}`));
  },
});
