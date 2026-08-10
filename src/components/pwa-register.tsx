"use client";

import { useEffect } from "react";
import { useCookieConsentOptional } from "@/components/cookie-consent-provider";
import {
  clearDeferredInstallPrompt,
  setDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

const WARM_PATHS = [
  "/",
  "/vault",
  "/vault/write/local",
  "/~offline",
  "/manifest.json",
];

export function PwaRegister() {
  const consent = useCookieConsentOptional();
  const functional = Boolean(consent?.consent?.functional);

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      clearDeferredInstallPrompt();
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!functional) return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
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
