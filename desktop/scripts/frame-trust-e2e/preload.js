const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("t", {
  check: () => ipcRenderer.invoke("t:check"),
});
