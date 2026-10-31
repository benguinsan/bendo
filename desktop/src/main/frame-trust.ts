import {
  app,
  session,
  type IpcMainInvokeEvent,
  type OnBeforeSendHeadersListenerDetails,
  type OnHeadersReceivedListenerDetails,
  type WebContents,
} from "electron";

import { canonicalAppOrigin } from "./canonical-origin";
import {
  getSessionSecret,
  newNonce,
  verifyProof,
} from "./session-secret";

type TrustEntry = {
  origin: string;
};

const trustByWebContentsId = new Map<number, TrustEntry>();
const pendingNonces = new Map<
  number,
  { nonce: string; webContentsId: number }
>();

let installed = false;

function headerValue(
  headers: Record<string, string | string[]> | undefined,
  name: string
): string | undefined {
  if (!headers) {
    return undefined;
  }
  const want = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== want) {
      continue;
    }
    if (typeof value === "string") {
      return value;
    }
    return value[0];
  }
  return undefined;
}

function clearTrust(webContentsId: number): void {
  trustByWebContentsId.delete(webContentsId);
}

function dropPendingForWebContents(webContentsId: number): void {
  for (const [requestId, entry] of pendingNonces) {
    if (entry.webContentsId === webContentsId) {
      pendingNonces.delete(requestId);
    }
  }
}

function forgetPending(requestId: number): void {
  pendingNonces.delete(requestId);
}

function attachWebContentsLifecycle(contents: WebContents): void {
  contents.on("did-start-navigation", (details) => {
    if (!details.isMainFrame || details.isSameDocument) {
      return;
    }
    clearTrust(contents.id);
    dropPendingForWebContents(contents.id);
  });

  const forget = () => {
    clearTrust(contents.id);
    dropPendingForWebContents(contents.id);
  };
  contents.on("destroyed", forget);
  contents.on("render-process-gone", forget);
}

function originOfUrl(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function onBeforeSendHeaders(
  details: OnBeforeSendHeadersListenerDetails,
  callback: (response: {
    requestHeaders?: Record<string, string>;
  }) => void
): void {
  const origin = canonicalAppOrigin();
  const requestOrigin = originOfUrl(details.url);
  if (
    details.resourceType !== "mainFrame" ||
    requestOrigin !== origin ||
    details.webContentsId == null
  ) {
    callback({});
    return;
  }

  const nonce = newNonce();
  pendingNonces.set(details.id, {
    nonce,
    webContentsId: details.webContentsId,
  });

  callback({
    requestHeaders: {
      ...details.requestHeaders,
      "x-bendo-desktop-nonce": nonce,
    },
  });
}

function onHeadersReceived(
  details: OnHeadersReceivedListenerDetails,
  callback: (response: Record<string, never>) => void
): void {
  const pending = pendingNonces.get(details.id);
  // Always pass through; never mutate response headers.
  callback({});

  if (!pending) {
    return;
  }

  if (details.statusCode >= 300 && details.statusCode < 400) {
    return;
  }

  forgetPending(details.id);

  const proof = headerValue(
    details.responseHeaders,
    "x-bendo-desktop-proof"
  );
  if (!proof) {
    return;
  }

  const secret = getSessionSecret(app.isPackaged);
  if (!verifyProof(secret, pending.nonce, proof)) {
    return;
  }

  const requestOrigin = originOfUrl(details.url);
  if (!requestOrigin || requestOrigin !== canonicalAppOrigin()) {
    return;
  }

  if (details.webContentsId == null) {
    return;
  }

  // Stale response after a newer main-frame navigation started.
  if (pending.webContentsId !== details.webContentsId) {
    return;
  }

  // Do not store details.frame processId/routingId: cross-site navigations
  // swap the RenderFrameHost, so webRequest's frame ids differ from the
  // committed senderFrame and a legitimate page would be denied (E2E-verified).
  trustByWebContentsId.set(details.webContentsId, {
    origin: requestOrigin,
  });
}

/**
 * Install webRequest + webContents lifecycle hooks once, before any loadURL.
 */
export function installFrameTrustHooks(): void {
  if (installed) {
    return;
  }
  installed = true;

  const origin = canonicalAppOrigin();
  const filter = {
    urls: [`${origin}/*`, `${origin}/`],
    types: ["mainFrame" as const],
  };

  const webRequest = session.defaultSession.webRequest;
  webRequest.onBeforeSendHeaders(filter, onBeforeSendHeaders);
  webRequest.onHeadersReceived(filter, onHeadersReceived);
  webRequest.onCompleted(filter, (details) => forgetPending(details.id));
  webRequest.onErrorOccurred(filter, (details) => forgetPending(details.id));

  app.on("web-contents-created", (_event, contents) => {
    attachWebContentsLifecycle(contents);
  });
}

/**
 * I2: privileged IPC only for a proven main-frame document on the canonical origin.
 */
export function isFrameTrusted(event: IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame;
  if (!frame || frame.isDestroyed()) {
    return false;
  }

  const main = event.sender.mainFrame;
  if (
    frame.processId !== main.processId ||
    frame.routingId !== main.routingId
  ) {
    return false;
  }

  const expectedOrigin = canonicalAppOrigin();
  let senderOrigin: string;
  try {
    senderOrigin = new URL(frame.url).origin;
  } catch {
    return false;
  }
  if (senderOrigin !== expectedOrigin) {
    return false;
  }

  const trust = trustByWebContentsId.get(event.sender.id);
  if (!trust || trust.origin !== expectedOrigin) {
    return false;
  }

  return true;
}
