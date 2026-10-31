import { app, type IpcMainInvokeEvent } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isFrameTrusted } from "./frame-trust";

export { isFrameTrusted };

function senderUrl(event: IpcMainInvokeEvent): string | undefined {
  return event.senderFrame?.url;
}

/**
 * Exact offline.html shown by showOffline() — path match, query ignored.
 * Arbitrary file: URLs are not trusted.
 */
export function isOfflinePageSender(event: IpcMainInvokeEvent): boolean {
  const url = senderUrl(event);
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "file:") {
      return false;
    }
    const senderPath = path.normalize(fileURLToPath(parsed));
    const offlinePath = path.normalize(
      path.join(app.getAppPath(), "static", "offline.html")
    );
    return senderPath === offlinePath;
  } catch {
    return false;
  }
}

/** reload: proven Bendo frame, or the packaged offline retry page only. */
export function isTrustedReloadSender(event: IpcMainInvokeEvent): boolean {
  return isFrameTrusted(event) || isOfflinePageSender(event);
}
