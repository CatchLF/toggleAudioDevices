const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  registerGlobalShortcut: (message) =>
    ipcRenderer.send("register-global-shortcut", message),
  save: (message) => {
    ipcRenderer.send("save", message);
  },
  hideWindow: () => {
    ipcRenderer.send("hide-window");
  },
  changeVolume: (message) => {
    ipcRenderer.send("change-volume", message);
  },
});
