"use client";

import { useEffect, useState } from "react";

const NOW_REFRESH_MS = 60_000;

export function useNow(initialNowIso: string): Date {
  const [liveNow, setLiveNow] = useState<Date | null>(null);

  useEffect(() => {
    function refreshNow() {
      setLiveNow(new Date());
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshNow();
      }
    }

    const intervalId = window.setInterval(refreshNow, NOW_REFRESH_MS);
    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return liveNow ?? new Date(initialNowIso);
}
