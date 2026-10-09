const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('xiaoyuFiles', {
  reveal: filename => ipcRenderer.invoke('xiaoyu:reveal-file', filename)
});
