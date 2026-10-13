"use client";

import { useEffect } from "react";

import {
  buildBendoProtocolCallbackUrl,
  buildHandoffCallbackTargetHttpUrl,
  DESKTOP_HANDOFF_PATH,
} from "@/lib/desktop/desktop-handoff";

function buildHandoffProtocolUrl():
  | { ok: true; protocolUrl: string }
  | { ok: false; error: string } {
  try {
    const targetHttp = buildHandoffCallbackTargetHttpUrl(window.location.href);
    return {
      ok: true,
      protocolUrl: buildBendoProtocolCallbackUrl(targetHttp),
    };
  } catch {
    return {
      ok: false,
      error: "Could not open Bendo. Return to the desktop app and try again.",
    };
  }
}

function openBendoApp(): void {
  const result = buildHandoffProtocolUrl();
  if (result.ok) {
    window.location.href = result.protocolUrl;
  }
}

/**
 * Local http landing after Clerk OAuth in the system browser.
 * SSR + first client paint share the same markup (stable Open link shell).
 * After mount, jump to bendo://; click handler builds the real deep link.
 *
 * Clerk Dashboard must allow http://127.0.0.1:<port>/auth/desktop-handoff.
 */
export default function DesktopHandoffPage() {
  useEffect(() => {
    const result = buildHandoffProtocolUrl();
    if (result.ok) {
      window.location.replace(result.protocolUrl);
    }
  }, []);

  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-heading text-lg font-medium">Opening Bendo…</h1>
      <p className="text-muted-foreground max-w-sm text-center text-sm">
        If the app does not open, use the link below or switch to the Bendo
        window.
      </p>
      <a
        className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        href="#open-bendo"
        onClick={(event) => {
          event.preventDefault();
          openBendoApp();
        }}
      >
        Open Bendo
      </a>
      <p className="text-muted-foreground text-xs">{DESKTOP_HANDOFF_PATH}</p>
    </main>
  );
}
