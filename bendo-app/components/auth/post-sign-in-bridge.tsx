"use client";

import { Show, useClerk } from "@clerk/nextjs";
import { type ReactNode, useEffect, useRef, useState } from "react";

/** Cap total polls so a stuck handoff cannot spin forever. */
const MAX_ATTEMPTS = 24;
/** Initial delay for the first poll. */
const INITIAL_DELAY_MS = 250;
/** Maximum delay between polls. */
const MAX_DELAY_MS = 2000;

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

function delayForAttempt(attempt: number): number {
  // attempt 1 → 250ms, then doubles, capped
  const delay = INITIAL_DELAY_MS * 2 ** Math.max(0, attempt - 1);
  return Math.min(delay, MAX_DELAY_MS);
}

/**
 * After Clerk client reports signed-in, wait until the server can read the
 * session (cookie → /api/me, possibly via Vercel proxy) before leaving /sign-in.
 * Avoids / ↔ /sign-in reload loops when RSC requireUser races the cookie write.
 */
function SessionHandoff() {
  const { signOut } = useClerk();
  const [message, setMessage] = useState("Finishing sign-in…");
  const [failed, setFailed] = useState(false);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (failed) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (cancelled) {
        return;
      }

      attemptsRef.current += 1;
      const attempt = attemptsRef.current;
      const ready = await isServerSessionReady();
      if (cancelled) {
        return;
      }

      if (ready) {
        window.location.replace("/");
        return;
      }

      if (attempt >= MAX_ATTEMPTS) {
        setFailed(true);
        setMessage(
          "Could not sync your session with the server. Sign out and try again."
        );
        return;
      }

      if (attempt >= 8) {
        setMessage("Still syncing your session…");
      }

      timer = setTimeout(() => {
        void poll();
      }, delayForAttempt(attempt));
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [failed]);

  return (
    <div className="flex flex-col items-center gap-3">
      <output className="text-muted-foreground block text-center text-sm">
        {message}
      </output>
      {failed ? (
        <button
          type="button"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          onClick={() => {
            void signOut({ redirectUrl: "/sign-in" });
          }}
        >
          Sign out
        </button>
      ) : null}
    </div>
  );
}

export function PostSignInBridge({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <Show when="signed-out">{children}</Show>
      {/* If user is signed in, wait until the server can read the session (cookie → /api/me, possibly via Vercel proxy) before leaving /sign-in. */}
      {/* Avoids / ↔ /sign-in reload loops when RSC requireUser races the cookie write. */}
      {/* Clerk client (signed-in) and Server (requireUser) race to set the session cookie.*/}
      <Show when="signed-in">
        <SessionHandoff />
      </Show>
    </>
  );
}
