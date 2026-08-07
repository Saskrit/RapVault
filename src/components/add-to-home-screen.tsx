"use client";

import Image from "next/image";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** CTA above the footer — install / Add to Home Screen. */
export function AddToHomeScreen() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosDevice());
    setPromptEvent(getDeferredInstallPrompt());

    const unsubscribe = subscribeInstallPrompt(() => {
      setPromptEvent(getDeferredInstallPrompt());
    });

    function onInstalled() {
      setInstalled(true);
      clearDeferredInstallPrompt();
      setShowIosHelp(false);
    }

    window.addEventListener("appinstalled", onInstalled);
    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    const event = promptEvent ?? getDeferredInstallPrompt();
    if (event) {
      setBusy(true);
      try {
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
        clearDeferredInstallPrompt();
        setPromptEvent(null);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (ios) {
      setShowIosHelp((open) => !open);
      return;
    }

    setShowIosHelp((open) => !open);
  }

  return (
    <section className="relative z-10 border-t border-border/60 bg-card/40">
      <div className="mx-auto flex w-full max-w-[84rem] flex-col items-center gap-4 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-3xl border border-border bg-card px-5 py-6 text-center shadow-sm sm:px-8 sm:py-7">
          <div className="flex items-center gap-3">
            <Image
              src="/apple-touch-icon.png?v=4"
              alt="RapVault"
              width={56}
              height={56}
              className="rounded-2xl border border-border bg-white shadow-sm"
              unoptimized
            />
            <div className="text-left">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                RapVault app
              </p>
              <p className="text-xs text-muted">Add to your home screen</p>
            </div>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-muted">
            Install RapVault like an app — one tap from your home screen, faster
            open, and a cleaner full-screen writing space.
          </p>

          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={busy}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[0.95rem] font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60 sm:w-auto"
          >
            <Download className="h-4 w-4 shrink-0" />
            {busy
              ? "Opening…"
              : promptEvent
                ? "Add to home screen"
                : ios
                  ? "How to add on iPhone"
                  : "Add to home screen"}
          </button>

          {showIosHelp && (
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-background px-4 py-4 text-left text-sm text-muted">
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {ios ? (
                <ol className="space-y-2 pr-8">
                  <li className="flex gap-2">
                    <span className="font-semibold text-foreground">1.</span>
                    <span>
                      Tap the{" "}
                      <Share className="mx-0.5 inline h-3.5 w-3.5 text-accent" />{" "}
                      <span className="font-medium text-foreground">Share</span>{" "}
                      button in Safari.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-foreground">2.</span>
                    <span>
                      Scroll and tap{" "}
                      <span className="font-medium text-foreground">
                        Add to Home Screen
                      </span>
                      .
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-foreground">3.</span>
                    <span>Confirm with Add — RapVault appears on your home screen.</span>
                  </li>
                </ol>
              ) : (
                <p className="pr-8">
                  Open your browser menu and choose{" "}
                  <span className="font-medium text-foreground">
                    Install app
                  </span>{" "}
                  or{" "}
                  <span className="font-medium text-foreground">
                    Add to Home Screen
                  </span>
                  . If you don&apos;t see it yet, visit again after the page
                  finishes loading.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
