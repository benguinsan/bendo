/**
 * Preload: keep the bridge narrow. Never expose DSH secrets, service role, or Node APIs.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("bendoDesktop", {
  platform: process.platform,
  getAppUrl: (): Promise<string> => ipcRenderer.invoke("bendo:get-url"),
  reloadBendo: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("bendo:reload"),
});
