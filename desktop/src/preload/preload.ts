/**
 * Preload: keep the bridge narrow. Never expose DSH secrets, service role, or Node APIs.
 */
import { contextBridge, ipcRenderer } from "electron";

export type DesktopModelConfig = {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
};

contextBridge.exposeInMainWorld("bendoDesktop", {
  platform: process.platform,
  getAppUrl: (): Promise<string> => ipcRenderer.invoke("bendo:get-url"),
  reloadBendo: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("bendo:reload"),
  saveModelConfig: (
    config: DesktopModelConfig
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke("bendo:model-config:save", config),
  loadModelConfig: (): Promise<
    | { ok: true; config: DesktopModelConfig }
    | { ok: true; config: null }
    | { ok: false; error: string }
  > => ipcRenderer.invoke("bendo:model-config:load"),
});
