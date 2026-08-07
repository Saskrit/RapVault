"use client";

import {
  Cloud,
  Columns2,
  FileText,
  FolderOpen,
  Music2,
  Search,
  Shield,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type AnimationEvent } from "react";
import { HeroAuthForm } from "@/components/hero-auth-form";
import { HeroWritePreview } from "@/components/hero-write-preview";
import { Logo, BrandWordmark } from "@/components/logo";
import { SiteCredit } from "@/components/site-credit";
import { ThemeToggle } from "@/components/theme-toggle";

type AuthMode = "login" | "register";
type AuthPhase = "closed" | "open" | "closing";

const FEATURES = [
  {
    icon: Music2,
    title: "Beat player",
    description:
      "Paste a YouTube beat and play it while you write. Saved to each song on every device.",
  },
  {
    icon: Columns2,
    title: "Resizable split",
    description:
      "Drag the divider — lyrics on the left, beat on the right, exactly how you like it.",
  },
  {
    icon: Timer,
    title: "Auto-save",
    description: "Every bar saves as you type. No lost verses at 3 AM.",
  },
  {
    icon: Sparkles,
    title: "Rap writing tools",
    description:
      "One-tap Verse, Hook, and Bridge labels plus syllable counts and rhyme highlighting.",
  },
  {
    icon: Search,
    title: "Search",
    description: "Find any song by title, lyrics, tags, or genre instantly.",
  },
  {
    icon: FolderOpen,
    title: "Folders",
    description: "Hooks, freestyles, punchlines — keep your catalog organized.",
  },
  {
    icon: FileText,
    title: "TXT & PDF export",
    description: "Download clean lyrics from desktop or phone whenever you need them.",
  },
  {
    icon: Shield,
    title: "Private vault",
    description: "Your lyrics stay yours. Sign in with email or Google.",
  },
];

const shellPad = "px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20";

export function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>("closed");
  const [authHighlight, setAuthHighlight] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authBoxRef = useRef<HTMLDivElement>(null);
  const authOpen = authPhase === "open" || authPhase === "closing";

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function finishClose() {
    clearCloseTimer();
    setAuthMode(null);
    setAuthPhase("closed");
    setAuthHighlight(false);
  }

  function focusAuthBox() {
    // Keep the site header visible — never scroll it off-screen.
    window.scrollTo({ top: 0, behavior: "smooth" });
    setAuthHighlight(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setAuthHighlight(false), 1600);
  }

  function openAuth(mode: AuthMode) {
    clearCloseTimer();
    setAuthMode(mode);
    setAuthPhase("open");
    focusAuthBox();
  }

  function closeAuth() {
    if (authPhase === "closing" || authPhase === "closed") return;
    setAuthPhase("closing");
    setAuthHighlight(false);
    clearCloseTimer();
    closeTimerRef.current = setTimeout(finishClose, 400);
  }

  function handleAuthAnimEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (authPhase === "closing") finishClose();
  }

  function switchAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    if (authPhase !== "open") setAuthPhase("open");
  }

  return (
    <div className="relative overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" />
        <div className="absolute -right-24 top-1/4 h-64 w-64 rounded-full bg-violet-600/10 blur-[90px]" />
      </div>

      {/* Sticky header — stays visible when opening Sign in / Register */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div
            className={`mx-auto flex w-full max-w-[84rem] items-center justify-between py-2.5 sm:py-3 ${shellPad}`}
        >
          <div className="flex items-center gap-2">
            <Logo size={34} href="/" priority />
            <BrandWordmark height={18} href="/" priority />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link
                href="/vault"
                className="inline-flex min-h-9 items-center rounded-xl bg-accent px-3.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98]"
              >
                My Vault
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  className="hidden min-h-9 items-center rounded-xl px-3 text-sm font-medium text-muted transition hover:text-foreground sm:inline-flex"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("register")}
                  className="inline-flex min-h-9 items-center rounded-xl bg-accent px-3.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98]"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* First viewport under the sticky header */}
      <div className="relative z-10 flex min-h-[calc(100dvh-3.75rem)] flex-col">
        <section
          className={`mx-auto flex min-h-0 w-full max-w-[84rem] flex-1 flex-col pt-4 pb-6 sm:pt-5 sm:pb-7 lg:pt-6 lg:pb-9 ${shellPad}`}
        >
          {/* Left copy + right box — lightly centered in the viewport */}
          <div className="flex min-h-0 flex-1 items-center py-4 sm:py-5 lg:py-6">
            <div className="grid w-full grid-cols-1 items-stretch gap-5 sm:gap-6 lg:grid-cols-[0.9fr_1.15fr] lg:gap-0 xl:gap-1">
              <div className="flex min-h-[34rem] flex-col justify-center gap-7 sm:gap-8 lg:pr-0">
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-widest text-accent sm:text-xs">
                  <Cloud className="h-3.5 w-3.5" />
                  Private lyrics cloud
                </p>

                <h1 className="text-[clamp(2.25rem,5vw,3.55rem)] font-semibold leading-[1.1] tracking-tight">
                  Your bars.
                  <br />
                  <span className="text-accent">Locked in the vault.</span>
                </h1>

                <p className="max-w-md text-base leading-relaxed text-muted sm:text-[1.075rem] lg:text-[1.125rem] lg:leading-relaxed">
                  A private notebook for hooks, punchlines, freestyles, and
                  unfinished verses. Write to beats, organize fast, never lose a
                  line.
                </p>

                <div className="flex flex-wrap gap-3 sm:gap-3.5">
                  {isLoggedIn ? (
                    <Link
                      href="/vault"
                      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 text-[0.95rem] font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-violet-500 active:scale-[0.98]"
                    >
                      My Vault
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openAuth("register")}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 text-[0.95rem] font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-violet-500 active:scale-[0.98]"
                      >
                        Start writing free
                      </button>
                      <button
                        type="button"
                        onClick={() => openAuth("login")}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card/50 px-7 text-[0.95rem] font-semibold transition hover:border-accent hover:text-accent active:scale-[0.98]"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-[0.95rem] text-muted">
                  <span className="flex items-center gap-2">
                    <Music2 className="h-4 w-4 text-accent" />
                    Write to beats
                  </span>
                  <span className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-accent" />
                    Auto-save
                  </span>
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    Google + email
                  </span>
                </div>
              </div>

              <div
                ref={authBoxRef}
                id="auth-box"
                className="relative flex min-h-[34rem] w-full"
              >
                <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-accent/12 blur-2xl" />
                <div
                  className={`relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl transition-[box-shadow,border-color] duration-500 ${
                    authHighlight
                      ? "border-accent shadow-[0_0_0_3px_rgba(139,92,246,0.35)]"
                      : "border-border"
                  }`}
                >
                  {authOpen ? (
                    <>
                      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-sidebar px-4 py-3 sm:px-5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                        <span className="ml-1.5 min-w-0 flex-1 truncate text-xs text-muted sm:text-sm">
                          {authMode === "login" ? "Sign in" : "Get started"}
                        </span>
                        <button
                          type="button"
                          onClick={closeAuth}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:border-foreground/20 hover:text-foreground"
                          aria-label="Close"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="relative min-h-0 flex-1 bg-editor">
                        {authMode && (
                          <div
                            key={
                              authPhase === "closing"
                                ? "auth-exit"
                                : `auth-${authMode}`
                            }
                            className={`absolute inset-0 ${
                              authPhase === "closing"
                                ? "hero-auth-exit"
                                : "hero-auth-enter"
                            }`}
                            onAnimationEnd={handleAuthAnimEnd}
                          >
                            <HeroAuthForm
                              mode={authMode}
                              onSwitchMode={switchAuthMode}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted sm:px-5 sm:text-xs">
                        <span>
                          {authMode === "login"
                            ? "Welcome back"
                            : "Your bars. Locked in."}
                        </span>
                        <button
                          type="button"
                          onClick={closeAuth}
                          className="font-medium text-accent transition hover:underline"
                        >
                          Back
                        </button>
                      </div>
                    </>
                  ) : (
                    <HeroWritePreview />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="relative z-10">
        <section className="border-t border-border/60 bg-card/30 py-12 sm:py-16">
          <div className={`mx-auto w-full max-w-[84rem] ${shellPad}`}>
            <div className="mb-8 max-w-2xl sm:mb-10">
              <h2 className="type-h2">Built for the writing session</h2>
              <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
                Everything you need to capture ideas, finish songs, and keep your
                catalog clean — without the clutter.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border bg-card/60 p-5 transition hover:border-accent/40 hover:bg-card"
                >
                  <div className="mb-3 inline-flex rounded-xl bg-accent/10 p-2.5 text-accent transition group-hover:bg-accent/20">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="type-h3">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className={`mx-auto max-w-3xl text-center ${shellPad}`}>
            <h2 className="type-h2">Ready to fill the vault?</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted sm:text-base">
              Create your private notebook in seconds. No distractions — just you
              and the bars.
            </p>
            {isLoggedIn ? (
              <Link
                href="/vault"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-7 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-violet-500 active:scale-[0.98]"
              >
                My Vault
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("register")}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-7 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-violet-500 active:scale-[0.98]"
              >
                Create your vault
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-7 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <div
          className={`mx-auto flex w-full max-w-[84rem] flex-col items-center gap-4 ${shellPad}`}
        >
          <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Logo size={26} href="/" />
              <BrandWordmark height={15} href="/" />
              <span className="text-sm text-muted">
                © {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted">
              {isLoggedIn ? (
                <Link href="/vault" className="transition hover:text-foreground">
                  My Vault
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="transition hover:text-foreground"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("register")}
                    className="transition hover:text-foreground"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
          <SiteCredit />
        </div>
      </footer>
    </div>
  );
}
