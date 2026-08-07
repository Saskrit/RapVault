"use client";

import {
  Cloud,
  CloudOff,
  Download,
  Flame,
  FolderOpen,
  Globe,
  MessageSquare,
  Music2,
  Search,
  Shield,
  Sparkles,
  Timer,
  Users,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type ReactNode,
} from "react";
import { HeroAuthForm } from "@/components/hero-auth-form";
import { HeroWritePreview } from "@/components/hero-write-preview";
import { Logo, BrandWordmark } from "@/components/logo";
import { SiteCredit } from "@/components/site-credit";
import { ThemeToggle } from "@/components/theme-toggle";
import type { HeroPreviewSong } from "@/lib/hero-preview-song";

type AuthMode = "login" | "register";
type AuthPhase = "closed" | "open" | "closing";

const shellPad = "px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20";

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? "landing-reveal" : "landing-reveal-pending"}`}
      style={visible && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function LandingPage({
  isLoggedIn = false,
  previewSong = null,
}: {
  isLoggedIn?: boolean;
  previewSong?: HeroPreviewSong | null;
}) {
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
                    <HeroWritePreview song={previewSong} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="relative z-10">
        {/* Write session */}
        <section className="border-t border-border/60 py-16 sm:py-20 lg:py-24">
          <div className={`mx-auto w-full max-w-[84rem] ${shellPad}`}>
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 xl:gap-20">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  The session
                </p>
                <h2 className="mt-3 type-h2 max-w-lg">
                  Write to the beat. Tools that stay out of the way.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                  Paste a YouTube beat, drag the split, and write. Structure tags,
                  syllable counts, and rhyme highlights kick in when you need them —
                  not before.
                </p>
                <ul className="mt-8 space-y-5">
                  {[
                    {
                      icon: Music2,
                      title: "YouTube beat player",
                      body: "Saved per song, synced across devices.",
                    },
                    {
                      icon: Sparkles,
                      title: "Rap tools",
                      body: "Verse, Hook, Bridge — plus syllables and rhymes.",
                    },
                    {
                      icon: Timer,
                      title: "Auto-save",
                      body: "Every edit lands. No “did I save?” at 3 AM.",
                    },
                  ].map((item) => (
                    <li key={item.title} className="flex gap-3.5">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold tracking-tight">{item.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{item.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={120} className="relative">
                <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-accent/8 blur-3xl" />
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                  <div className="flex items-center gap-2 border-b border-border bg-sidebar px-4 py-2.5">
                    <span className="h-2 w-2 rounded-full bg-red-500/70" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                    <span className="h-2 w-2 rounded-full bg-green-500/70" />
                    <span className="ml-2 text-xs text-muted">write · Midnight Freestyle</span>
                  </div>
                  <div className="grid grid-cols-[1fr_7.5rem] sm:grid-cols-[1fr_9rem]">
                    <div className="min-h-[14rem] border-r border-border bg-editor p-4 font-mono text-[12px] leading-relaxed sm:min-h-[16rem] sm:p-5 sm:text-[13px]">
                      <p className="text-accent/90">[Verse 1]</p>
                      <p className="mt-2 text-foreground">Started with a vision, pen hit the pad</p>
                      <p className="text-foreground">Lines in the vault, never lookin&apos; back</p>
                      <p className="mt-3 text-accent/90">[Hook]</p>
                      <p className="mt-2 text-foreground">Locked in, never fold</p>
                      <p className="text-muted">
                        Bars on ice
                        <span className="hero-type-caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[1px] bg-accent align-text-bottom" />
                      </p>
                    </div>
                    <div className="flex flex-col bg-sidebar">
                      <div className="border-b border-border px-2.5 py-2 text-[9px] font-semibold uppercase tracking-wide text-muted">
                        Beat
                      </div>
                      <div className="relative flex-1 bg-black">
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-red-600">
                            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
                            <Music2 className="relative h-4 w-4 text-white" />
                          </div>
                          <p className="text-[9px] text-muted">YouTube</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 border-t border-border px-2.5 py-3">
                        <div className="h-1 overflow-hidden rounded-full bg-border">
                          <div className="hero-beat-bar h-full w-2/5 rounded-full bg-accent" />
                        </div>
                        <p className="text-[9px] tabular-nums text-muted">0:42 / 2:18</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section className="relative overflow-hidden border-t border-border/60 bg-card/35 py-16 sm:py-20 lg:py-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
          </div>
          <div className={`relative mx-auto w-full max-w-[84rem] ${shellPad}`}>
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 xl:gap-20">
              <Reveal className="order-2 lg:order-1">
                <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Search className="h-3.5 w-3.5 text-muted" />
                    <span className="text-xs text-muted">Search title, lyrics, tags…</span>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8rem_1fr]">
                    <div className="space-y-1 border-r border-border bg-sidebar p-3 text-[11px]">
                      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-muted">
                        Folders
                      </p>
                      {["All songs", "Finished", "WIP", "Hooks", "Freestyles"].map(
                        (name, i) => (
                          <p
                            key={name}
                            className={`rounded-lg px-2 py-1.5 ${
                              i === 0
                                ? "bg-accent/15 font-medium text-accent"
                                : "text-muted"
                            }`}
                          >
                            {name}
                          </p>
                        ),
                      )}
                    </div>
                    <div className="divide-y divide-border p-1 sm:p-2">
                      {[
                        { title: "Midnight Freestyle", meta: "Draft · 148 words", star: true },
                        { title: "City Lights Hook", meta: "Finished · Hook", star: false },
                        { title: "Punchline Bank", meta: "Ideas · 32 lines", star: true },
                        { title: "Cold Open", meta: "WIP · Collab", star: false },
                      ].map((song) => (
                        <div
                          key={song.title}
                          className="flex items-center justify-between gap-2 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{song.title}</p>
                            <p className="text-[11px] text-muted">{song.meta}</p>
                          </div>
                          {song.star && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={100} className="order-1 lg:order-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  The vault
                </p>
                <h2 className="mt-3 type-h2 max-w-lg">
                  A catalog that stays searchable — not a pile of notes.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                  Folders for hooks and freestyles. Tags for mood and genre.
                  Favorites, drafts, finished tracks — find any line in seconds.
                </p>
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  {[
                    {
                      icon: FolderOpen,
                      title: "Folders",
                      body: "Finished, WIP, Hooks, Punchlines — plus your own.",
                    },
                    {
                      icon: Search,
                      title: "Deep search",
                      body: "Title, lyrics, tags, genre. Instant.",
                    },
                    {
                      icon: Download,
                      title: "TXT & PDF",
                      body: "Export clean lyrics from phone or desktop.",
                    },
                    {
                      icon: Shield,
                      title: "Private by default",
                      body: "Email or Google. Your vault, locked.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold tracking-tight">{item.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Network */}
        <section className="border-t border-border/60 py-16 sm:py-20 lg:py-24">
          <div className={`mx-auto w-full max-w-[84rem] ${shellPad}`}>
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Beyond the booth
              </p>
              <h2 className="mt-3 type-h2">
                Collab, publish, and stay connected.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted">
                Invite artists into a song, drop public tracks with beats and fire
                reactions, or keep it personal. Your network lives in the same vault.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-8 sm:gap-10 md:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Co-write",
                  body: "Invite connected artists. Shared songs, real collabs.",
                  delay: 0,
                },
                {
                  icon: Globe,
                  title: "Go public",
                  body: "Publish with beat playback, views, and fire reactions.",
                  delay: 80,
                },
                {
                  icon: MessageSquare,
                  title: "Messages & artists",
                  body: "Profiles, connections, and DMs — build your circle.",
                  delay: 160,
                },
              ].map((item) => (
                <Reveal key={item.title} delay={item.delay}>
                  <div className="border-t border-accent/40 pt-6">
                    <item.icon className="h-5 w-5 text-accent" />
                    <h3 className="mt-4 text-lg font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={100} className="mt-14 overflow-hidden rounded-2xl border border-border bg-sidebar">
              <div className="grid sm:grid-cols-3">
                {[
                  { label: "Public track", value: "City Lights Hook", icon: Flame },
                  { label: "Views", value: "1.2k", icon: Globe },
                  { label: "Network", value: "24 connections", icon: Users },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className={`flex items-center gap-3 px-5 py-5 sm:px-6 ${
                      i > 0 ? "border-t border-border sm:border-t-0 sm:border-l" : ""
                    }`}
                  >
                    <stat.icon className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-muted">
                        {stat.label}
                      </p>
                      <p className="truncate text-sm font-semibold">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Offline */}
        <section className="relative overflow-hidden border-t border-border/60 bg-card/35 py-16 sm:py-20 lg:py-24">
          <div className={`mx-auto w-full max-w-[84rem] ${shellPad}`}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Always with you
                </p>
                <h2 className="mt-3 type-h2 max-w-md">
                  Offline writing that syncs when you&apos;re back.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                  Install RapVault. Keep editing on the train, in the studio, or
                  anywhere the signal drops. Pending saves queue up and sync
                  automatically.
                </p>
                <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-2">
                    <CloudOff className="h-4 w-4 text-accent" />
                    Edit offline
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-accent" />
                    Auto-sync
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-accent" />
                    Installable PWA
                  </span>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="relative mx-auto max-w-sm">
                  <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-accent/10 blur-2xl" />
                  <div className="relative space-y-3 rounded-2xl border border-border bg-background p-5 shadow-xl sm:p-6">
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      <CloudOff className="h-3.5 w-3.5 shrink-0" />
                      You&apos;re offline — edits will sync
                    </div>
                    <div className="rounded-xl border border-border bg-editor px-4 py-3 font-mono text-xs leading-relaxed">
                      <p className="text-accent/85">[Bridge]</p>
                      <p className="mt-1.5">Signal weak but the bars still land</p>
                      <p className="text-muted">
                        Queue it up —
                        <span className="hero-type-caret ml-0.5 inline-block h-[1em] w-[2px] bg-accent align-text-bottom" />
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="text-amber-600 dark:text-amber-400">Saved offline</span>
                      <span>2 pending</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t border-border/60 py-16 sm:py-20 lg:py-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[90px]" />
          </div>
          <div className={`relative mx-auto max-w-2xl text-center ${shellPad}`}>
            <Reveal>
              <h2 className="type-h2">Ready to fill the vault?</h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted">
                Free to start. Private by default. Built for the writing session —
                and everything after.
              </p>
              {isLoggedIn ? (
                <Link
                  href="/vault"
                  className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-8 text-[0.95rem] font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-violet-500 active:scale-[0.98]"
                >
                  Open My Vault
                </Link>
              ) : (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => openAuth("register")}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-8 text-[0.95rem] font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-violet-500 active:scale-[0.98]"
                  >
                    Create your vault
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card/60 px-7 text-[0.95rem] font-semibold transition hover:border-accent hover:text-accent active:scale-[0.98]"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div
          className={`mx-auto flex w-full max-w-[84rem] flex-col items-center gap-5 ${shellPad}`}
        >
          <div className="flex w-full flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Logo size={26} href="/" />
              <BrandWordmark height={15} href="/" />
              <span className="text-sm text-muted">
                © {new Date().getFullYear()}
              </span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
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
              <Link href="/cookies" className="transition hover:text-foreground">
                Cookies
              </Link>
            </nav>
          </div>
          <p className="text-center text-xs text-muted">
            Private lyrics cloud · Write to beats · Collab · Offline sync
          </p>
          <SiteCredit />
        </div>
      </footer>
    </div>
  );
}
