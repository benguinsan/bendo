"use client";

import { useEffect, useRef } from "react";

const MIN_REFRESH_GAP_MS = 1500;

/**
 * After OAuth in the OS browser, refresh when the user returns to Electron.
 * Debounced so focus/visibility storms do not spam reload.
 */
export function useDesktopFocusRefresh(onRefresh: () => void): void {
  const onRefreshRef = useRef(onRefresh);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.bendoDesktop) {
      return;
    }

    function maybeRefresh() {
      if (document.visibilityState === "hidden") {
        return;
      }
      const now = Date.now();
      if (now - lastRefreshRef.current < MIN_REFRESH_GAP_MS) {
        return;
      }
      lastRefreshRef.current = now;
      onRefreshRef.current();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        maybeRefresh();
      }
    }

    window.addEventListener("focus", maybeRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", maybeRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
