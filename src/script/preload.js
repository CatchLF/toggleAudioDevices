const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  registerGlobalShortcut: (message) =>
    ipcRenderer.send("register-global-shortcut", message),
  hideWindow: () => {
    ipcRenderer.send("hide-window");
  },
});
