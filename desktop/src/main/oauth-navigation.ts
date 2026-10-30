import type { BrowserWindow } from "electron";

import { getBendoAppUrl } from "./bendo-url";
import { openExternalUrl } from "./open-external";

/**
 * Hosts that must not take over the Bendo BrowserWindow.
 * Discord Connect + Clerk Google/OAuth complete in the OS browser instead.
 * Local Bendo (127.0.0.1 / localhost) and the offline file page stay in-window.
 */
export function isIdentityOAuthHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (
    host === "discord.com" ||
    host.endsWith(".discord.com") ||
    host === "discordapp.com" ||
    host.endsWith(".discordapp.com")
  ) {
    return true;
  }

  if (
    host === "accounts.google.com" ||
    host === "oauth2.googleapis.com" ||
    host.endsWith(".googleusercontent.com")
  ) {
    return true;
  }

  // Clerk Frontend API / Account Portal hosts (path-filtered in shouldOpenOAuthExternally).
  if (
    host === "clerk.com" ||
    host.endsWith(".clerk.com") ||
    host.endsWith(".clerk.accounts.dev") ||
    host.endsWith(".accounts.dev")
  ) {
    return true;
  }

  return false;
}

function isClerkOAuthPath(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();
  return (
    path.includes("/oauth") ||
    path.includes("oauth") ||
    search.includes("oauth") ||
    search.includes("strategy=oauth")
  );
}

export function isBendoAppUrl(url: string): boolean {
  try {
    const target = new URL(url);
    const app = new URL(getBendoAppUrl());
    if (target.origin === app.origin) {
      return true;
    }
    // Packaged/dev may use localhost vs 127.0.0.1 interchangeably.
    const loopback =
      (target.hostname === "127.0.0.1" || target.hostname === "localhost") &&
      (app.hostname === "127.0.0.1" || app.hostname === "localhost");
    return loopback && target.port === app.port;
  } catch {
    return false;
  }
}

/** True when this navigation should open in the OS browser instead of Electron. */
export function shouldOpenOAuthExternally(url: string): boolean {
  if (url.startsWith("file:")) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  if (isBendoAppUrl(url)) {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (!isIdentityOAuthHost(host)) {
    return false;
  }

  // Discord + Google accounts: always external.
  if (
    host.includes("discord") ||
    host === "accounts.google.com" ||
    host === "oauth2.googleapis.com" ||
    host.endsWith(".googleusercontent.com")
  ) {
    return true;
  }

  // Clerk: only OAuth authorize hops (avoid forcing every Account Portal page out).
  return isClerkOAuthPath(parsed);
}

/**
 * Keep product UI on Bendo; send Discord / Google / Clerk OAuth to the OS browser.
 */
export function attachOAuthExternalNavigation(win: BrowserWindow): void {
  const contents = win.webContents;

  contents.setWindowOpenHandler(({ url }) => {
    if (shouldOpenOAuthExternally(url)) {
      void openExternalUrl(url);
      return { action: "deny" };
    }
    if (isBendoAppUrl(url)) {
      return { action: "allow" };
    }
    // Unknown external popups: open in OS browser rather than a second Electron window.
    if (url.startsWith("https:") || url.startsWith("http:")) {
      void openExternalUrl(url);
      return { action: "deny" };
    }
    return { action: "deny" };
  });

  const guardInWindowNavigation = (event: { preventDefault: () => void }, url: string) => {
    if (shouldOpenOAuthExternally(url)) {
      event.preventDefault();
      void openExternalUrl(url);
      return;
    }
    // Block random https sites from taking over the shell; identity hosts stay
    // in-window so non-OAuth Clerk/account pages can complete without bouncing out.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return;
      }
      if (isBendoAppUrl(url) || isIdentityOAuthHost(parsed.hostname)) {
        return;
      }
      event.preventDefault();
      void openExternalUrl(url);
    } catch {
      // Invalid URL — leave Electron's default handling alone.
    }
  };

  contents.on("will-navigate", (event, url) => {
    guardInWindowNavigation(event, url);
  });

  // Some Clerk/Google hops use will-redirect instead of will-navigate.
  contents.on("will-redirect", (event, url) => {
    guardInWindowNavigation(event, url);
  });
}
