"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import {
  buildDesktopHandoffUrl,
  resolveDesktopAppOrigin,
} from "@/lib/desktop/desktop-handoff";

/**
 * Resolve absolute handoff URL after mount (Electron only).
 * First paint always matches SSR — never branch on window.bendoDesktop during render.
 */
function useDesktopHandoffRedirect(nextPath: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const origin = await resolveDesktopAppOrigin();
      if (cancelled || !origin) {
        return;
      }
      setUrl(buildDesktopHandoffUrl(origin, nextPath));
    })();
    return () => {
      cancelled = true;
    };
  }, [nextPath]);

  return url;
}

export function DesktopAwareSignIn() {
  const handoff = useDesktopHandoffRedirect("/");

  // Same <SignIn /> on server + first client paint. After mount on Electron,
  // remount with forceRedirectUrl so OAuth returns to local handoff → bendo://.
  if (handoff) {
    return (
      <SignIn
        key={handoff}
        forceRedirectUrl={handoff}
        fallbackRedirectUrl={handoff}
        signUpForceRedirectUrl={handoff}
        signUpFallbackRedirectUrl={handoff}
      />
    );
  }

  return <SignIn />;
}

export function DesktopAwareSignUp() {
  const handoff = useDesktopHandoffRedirect("/");

  if (handoff) {
    return (
      <SignUp
        key={handoff}
        forceRedirectUrl={handoff}
        fallbackRedirectUrl={handoff}
        signInForceRedirectUrl={handoff}
        signInFallbackRedirectUrl={handoff}
      />
    );
  }

  return <SignUp />;
}
