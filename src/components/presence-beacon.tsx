"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 30_000;

/** Pings presence while the tab is open so others see this user as online. */
export function PresenceBeacon() {
  useEffect(() => {
    let cancelled = false;

    async function beat() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }
      try {
        await fetch("/api/presence/heartbeat", { method: "POST" });
      } catch {
        // ignore offline / unauthenticated
      }
    }

    void beat();
    const interval = window.setInterval(beat, HEARTBEAT_MS);

    function onVisible() {
      if (document.visibilityState === "visible") void beat();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", beat);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", beat);
    };
  }, []);

  return null;
}
