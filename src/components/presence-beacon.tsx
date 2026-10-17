"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_MS = 30_000;

/** Pings presence while the tab is open so others see this user as online. */
export function PresenceBeacon() {
  const stoppedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reset on each effect run (React Strict Mode remounts effects).
    stoppedRef.current = false;

    function stop() {
      stoppedRef.current = true;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    async function beat() {
      if (cancelled || stoppedRef.current) return;
      if (document.visibilityState === "hidden") return;
      if (navigator.onLine === false) return;

      try {
        const res = await fetch("/api/presence/heartbeat", { method: "POST" });
        // Guest / expired session — stop polling (no console error spam).
        if (res.status === 204 || res.status === 401 || res.status === 403) {
          stop();
        }
      } catch {
        // ignore offline
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void beat();
    }

    function onOnline() {
      void beat();
    }

    void beat();
    intervalRef.current = setInterval(() => void beat(), HEARTBEAT_MS);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
