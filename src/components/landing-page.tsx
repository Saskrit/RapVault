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
} from "lucide-react";
import Link from "next/link";
import { Logo, BrandWordmark } from "@/components/logo";
import { SiteCredit } from "@/components/site-credit";
import { ThemeToggle } from "@/components/theme-toggle";

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

export function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-violet-600/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <header className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <Logo size={40} href="/" priority />
            <BrandWordmark height={20} href="/" priority />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link
                href="/vault"
                className="inline-flex min-h-10 items-center rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98] sm:px-4"
              >
                My Vault
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden min-h-10 items-center rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:text-foreground sm:inline-flex md:px-4"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-10 items-center rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98] sm:px-4"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16 md:pt-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-accent">
            <Cloud className="h-3.5 w-3.5" />
            Private lyrics cloud
          </p>
          <div className="grid items-stretch gap-10 sm:gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-8 xl:gap-10">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                Your bars.
                <br />
                <span className="bg-gradient-to-r from-accent to-accent-muted bg-clip-text text-transparent">
                  Locked in the vault.
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
                RapVault is a private notebook built for hooks, punchlines,
                freestyles, and unfinished verses. Write to beats, organize fast,
                and never lose a line.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-4">
                {isLoggedIn ? (
                  <Link
                    href="/vault"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-violet-500 active:scale-[0.98] sm:w-auto"
                  >
                    My Vault
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-violet-500 active:scale-[0.98] sm:w-auto"
                    >
                      Start writing free
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card/50 px-7 py-3.5 text-sm font-semibold transition hover:border-accent hover:text-accent active:scale-[0.98] sm:w-auto"
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-auto flex flex-wrap gap-6 pt-10 text-sm text-muted">
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
                  Google + email login
                </span>
              </div>
            </div>

            <div className="relative flex min-h-[26rem] w-full lg:min-h-full">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent/20 to-transparent blur-2xl" />
              <div className="relative flex min-h-[26rem] w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:min-h-0">
                <div className="flex shrink-0 items-center gap-2 border-b border-border bg-sidebar px-4 py-3.5 sm:px-5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-sm text-muted">Midnight Freestyle — Draft</span>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_7.5rem] sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <div className="flex min-h-0 flex-col border-r border-border bg-editor p-5 font-mono text-[15px] leading-relaxed sm:p-6 sm:text-base">
                    <p className="text-accent/80">[Verse 1]</p>
                    <p className="mt-3 text-foreground">
                      Started with a vision, pen hit the pad
                    </p>
                    <p className="text-foreground">
                      Lines in the vault, never lookin&apos; back...
                    </p>
                    <p className="mt-5 text-accent/80">[Hook]</p>
                    <p className="mt-2 text-foreground">Locked in, never fold</p>
                    <p className="mt-auto pt-6 text-accent/60">|</p>
                  </div>
                  <div className="flex min-h-0 flex-col bg-sidebar">
                    <div className="shrink-0 border-b border-border px-2 py-2 text-[10px] font-medium text-muted sm:text-xs">
                      Beat
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-black/90 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
                        <Music2 className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-center text-[10px] text-muted sm:text-xs">YouTube beat</p>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3 text-xs text-muted sm:px-5 sm:text-sm">
                  <span>847 words · ~3m 24s</span>
                  <span className="text-green-400">Saved</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/30 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Built for the writing session
              </h2>
              <p className="mt-3 text-muted">
                Everything you need to capture ideas, finish songs, and keep your
                catalog clean — without the clutter.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border bg-card/60 p-6 transition hover:border-accent/40 hover:bg-card"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3 text-accent transition group-hover:bg-accent/20">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Ready to fill the vault?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted">
              Create your private notebook in seconds. No distractions — just you
              and the bars.
            </p>
            <Link
              href={isLoggedIn ? "/vault" : "/register"}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-violet-500 active:scale-[0.98] sm:mt-8"
            >
              {isLoggedIn ? "My Vault" : "Create your vault"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 sm:px-6">
          <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Logo size={28} href="/" />
              <BrandWordmark height={16} href="/" />
              <span className="text-sm text-muted">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6 text-sm text-muted">
              {isLoggedIn ? (
                <Link href="/vault" className="transition hover:text-foreground">
                  My Vault
                </Link>
              ) : (
                <>
                  <Link href="/login" className="transition hover:text-foreground">
                    Sign in
                  </Link>
                  <Link href="/register" className="transition hover:text-foreground">
                    Register
                  </Link>
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
