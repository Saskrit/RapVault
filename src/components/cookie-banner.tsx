"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  Cookie,
  HardDrive,
  Palette,
  Shield,
  SlidersHorizontal,
  Wifi,
} from "lucide-react";
import { Logo } from "@/components/logo";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  /** First visit — must choose; reopening prefs can cancel. */
  const mustChoose = consent === null;

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
      setCustomize(false);
    }
  }, [showBanner, consent]);

  useEffect(() => {
    if (!showBanner) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showBanner]);

  useEffect(() => {
    if (!showBanner) return;
    const node = panelRef.current;
    const focusable = node?.querySelector<HTMLElement>(
      "button:not([disabled]), a[href], input:not([disabled])",
    );
    focusable?.focus();
  }, [showBanner, customize]);

  useEffect(() => {
    if (!showBanner) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (mustChoose) {
        event.preventDefault();
        return;
      }
      closePreferences();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showBanner, mustChoose, closePreferences]);

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
      className="cookie-consent-overlay fixed inset-0 z-[100] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px] dark:bg-black/55"
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="cookie-consent-panel relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/25"
      >
        <div className="relative shrink-0 overflow-hidden border-b border-border px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl"
            aria-hidden
          />

          <div className="relative flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
              <Cookie className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="mb-2 flex items-center gap-2">
                <Logo size={22} href={null} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Privacy choice
                </span>
              </div>
              <h2
                id={titleId}
                className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              >
                {mustChoose
                  ? "Before you continue"
                  : "Cookie preferences"}
              </h2>
              <p
                id={descId}
                className="mt-2 text-sm leading-relaxed text-muted"
              >
                {mustChoose
                  ? "RapVault needs your storage choice to keep you signed in, remember prefs, and enable offline lyrics. Pick once — you can change this later in Settings."
                  : "Update what RapVault may store on this device. Essential sign-in cookies stay on."}{" "}
                <Link
                  href="/cookies"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  Cookie policy
                </Link>
              </p>
            </div>
          </div>

          {!customize && mustChoose && (
            <ul className="relative mt-5 grid gap-2 sm:grid-cols-3">
              {[
                {
                  icon: Shield,
                  label: "Sign-in",
                  detail: "Essential session",
                },
                {
                  icon: Palette,
                  label: "Prefs",
                  detail: "Theme & layout",
                },
                {
                  icon: HardDrive,
                  label: "Offline",
                  detail: "Lyrics on device",
                },
              ].map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-2xl border border-border bg-background/70 px-3 py-2.5"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {item.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {customize && (
            <div className="space-y-2.5 px-5 py-4 sm:px-6">
              <label className="flex cursor-not-allowed items-start gap-3 rounded-2xl border border-border bg-background/50 px-3.5 py-3 opacity-95">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Shield className="h-3.5 w-3.5 text-accent" aria-hidden />
                    Essential
                    <span className="rounded-md bg-sidebar px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                      Always on
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Sign-in session, Google OAuth, and saving this consent choice.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background px-3.5 py-3 transition hover:border-accent/35">
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <SlidersHorizontal
                      className="h-3.5 w-3.5 text-accent"
                      aria-hidden
                    />
                    Preferences
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Remember theme, sidebar, font size, and editor layout on this
                    device.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-accent/30 bg-accent/[0.04] px-3.5 py-3 transition hover:border-accent/50">
                <input
                  type="checkbox"
                  checked={functional}
                  onChange={(e) => setFunctional(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Wifi className="h-3.5 w-3.5 text-accent" aria-hidden />
                    Offline &amp; app cache
                    <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                      Recommended
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Keep lyrics in IndexedDB, queue edits offline, and install the
                    app shell. Needed for fully offline writing after login.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-2.5 border-t border-border bg-card px-5 py-4 sm:px-6">
          {!customize ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(acceptAll)}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Accept all"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCustomize(true)}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:border-foreground/25 disabled:opacity-50"
                >
                  Customize
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(rejectOptional)}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background px-3 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                >
                  Essential only
                </button>
              </div>
              {mustChoose && (
                <p className="text-center text-[11px] leading-relaxed text-muted">
                  This window stays open until you choose. Offline writing needs
                  &ldquo;Accept all&rdquo; or Offline &amp; app cache.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(() => saveCustom({ preferences, functional }))
                }
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50 sm:flex-none sm:min-w-[10rem]"
              >
                {busy ? "Saving…" : "Save choices"}
              </button>
              {mustChoose ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCustomize(false)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50 sm:flex-none"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={closePreferences}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50 sm:flex-none"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
