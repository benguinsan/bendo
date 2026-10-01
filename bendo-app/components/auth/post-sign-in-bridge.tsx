"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { type ReactNode, useEffect, useRef, useState } from "react";

const MAX_ATTEMPTS_BEFORE_HINT = 20;
const POLL_INTERVAL_MS = 250;

async function isServerSessionReady(): Promise<boolean> {
  try {
    const response = await fetch("/api/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * After Clerk client reports signed-in, wait until the server can read the
 * session (cookie → /api/me, possibly via Vercel proxy) before leaving /sign-in.
 * Avoids / ↔ /sign-in reload loops when RSC requireUser races the cookie write.
 */
function SessionHandoff() {
  const [message, setMessage] = useState("Finishing sign-in…");
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (cancelled) {
        return;
      }

      attemptsRef.current += 1;
      const ready = await isServerSessionReady();
      if (cancelled) {
        return;
      }

      if (ready) {
        window.location.replace("/");
        return;
      }

      if (attemptsRef.current >= MAX_ATTEMPTS_BEFORE_HINT) {
        setMessage("Still syncing your session…");
        attemptsRef.current = 0;
      }

      timer = setTimeout(() => {
        void poll();
      }, POLL_INTERVAL_MS);
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <output className="text-muted-foreground block text-center text-sm">
      {message}
    </output>
  );
}

export function PostSignInBridge({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <SignedOut>{children}</SignedOut>
      <SignedIn>
        <SessionHandoff />
      </SignedIn>
    </>
  );
}
