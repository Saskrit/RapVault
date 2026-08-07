"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie, Shield, SlidersHorizontal, Wifi } from "lucide-react";
import { useCookieConsent } from "@/components/cookie-consent-provider";

export function CookieBanner() {
  const {
    ready,
    consent,
    showBanner,
    acceptAll,
    rejectOptional,
    saveCustom,
    closePreferences,
  } = useCookieConsent();
  const [customize, setCustomize] = useState(false);
  const [preferences, setPreferences] = useState(true);
  const [functional, setFunctional] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!showBanner) {
      setCustomize(false);
      return;
    }
    if (consent) {
      setPreferences(consent.preferences);
      setFunctional(consent.functional);
      setCustomize(true);
    } else {
      setPreferences(true);
      setFunctional(true);
    }
  }, [showBanner, consent]);

  if (!ready || !showBanner) return null;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20">
        <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Cookie className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="cookie-consent-title"
              className="text-sm font-semibold tracking-tight sm:text-base"
            >
              Cookies &amp; local storage
            </h2>
            <p
              id="cookie-consent-desc"
              className="mt-1 text-xs leading-relaxed text-muted sm:text-sm"
            >
              We use essential cookies to keep you signed in. Optional storage
              powers theme prefs, offline editing, and the installable app cache.
              You choose what to allow.{" "}
              <Link
                href="/cookies"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Learn more
              </Link>
            </p>
          </div>
        </div>

        {customize && (
          <div className="space-y-3 border-b border-border px-4 py-3.5 sm:px-5">
            <label className="flex cursor-not-allowed items-start gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5 opacity-90">
              <input
                type="checkbox"
                checked
                disabled
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Shield className="h-3.5 w-3.5 text-accent" />
                  Essential
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Sign-in session, Google OAuth, and saving this consent choice.
                  Always on.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition hover:border-accent/40">
              <input
                type="checkbox"
                checked={preferences}
                onChange={(e) => setPreferences(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                  Preferences
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Remember theme, sidebar, font size, and editor layout on this
                  device.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition hover:border-accent/40">
              <input
                type="checkbox"
                checked={functional}
                onChange={(e) => setFunctional(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Wifi className="h-3.5 w-3.5 text-accent" />
                  Offline &amp; app cache
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Cache lyrics for offline use, queue edits when offline, and
                  register the service worker. Turn off to clear that cache.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-2">
            {!customize ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setCustomize(true)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-3.5 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
              >
                Customize
              </button>
            ) : consent ? (
              <button
                type="button"
                disabled={busy}
                onClick={closePreferences}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-3.5 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {customize ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(() => saveCustom({ preferences, functional }))
                }
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50 sm:flex-none"
              >
                {busy ? "Saving…" : "Save choices"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(rejectOptional)}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium transition hover:border-foreground/20 disabled:opacity-50 sm:flex-none"
                >
                  Essential only
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(acceptAll)}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50 sm:flex-none"
                >
                  Accept all
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
