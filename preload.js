const { contextBridge, ipcRenderer } = require('electron');

// Minimal, safe API surface
contextBridge.exposeInMainWorld('api', {
  catalog: {
    get: (reload = false) => ipcRenderer.invoke('catalog:get', { reload })
  },
  app: {
    version: () => ipcRenderer.sendSync('app:getVersion')
  }
});
