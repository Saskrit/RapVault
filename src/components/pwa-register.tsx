"use client";

import { useEffect } from "react";
import { useCookieConsentOptional } from "@/components/cookie-consent-provider";

const WARM_PATHS = ["/", "/vault", "/~offline", "/manifest.json"];

export function PwaRegister() {
  const consent = useCookieConsentOptional();
  const functional = Boolean(consent?.consent?.functional);

  useEffect(() => {
    if (!functional) return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        // Register in production builds; also allow explicit opt-in for testing.
        if (
          process.env.NODE_ENV !== "production" &&
          process.env.NEXT_PUBLIC_PWA_DEV !== "1"
        ) {
          return;
        }

        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        await navigator.serviceWorker.ready;

        // Warm HTML routes while online so /vault can reopen offline.
        if (navigator.onLine) {
          await Promise.all(
            WARM_PATHS.map((path) =>
              fetch(path, {
                credentials: "same-origin",
                cache: "no-cache",
              }).catch(() => null),
            ),
          );
        }

        // Capture the current document into the page cache via SW.
        if (reg.active && navigator.onLine) {
          reg.active.postMessage("rapvault-skip-waiting");
        }
      } catch {
        // Ignore insecure-origin / private-mode failures.
      }
    };

    void register();
  }, [functional]);

  return null;
}
