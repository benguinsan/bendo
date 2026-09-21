/**
 * Preload: keep the bridge narrow. Never expose DSH secrets, service role, or Node APIs.
 * Later milestones may add version / window helpers only.
 */
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("bendoDesktop", {
  platform: process.platform,
});
