"use client";

import Link from "next/link";
import { LogOut, MessageSquare, Search, Settings, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo, BrandWordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

type VaultHeaderProps = {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  mobileSearchOpen?: boolean;
  onMobileSearchOpen?: (open: boolean) => void;
  centerLabel?: string;
  children?: React.ReactNode;
};

const iconBtn =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted transition active:scale-95 hover:border-foreground/20 hover:text-foreground";

export function VaultHeader({
  searchQuery = "",
  onSearchChange,
  mobileSearchOpen = false,
  onMobileSearchOpen,
  centerLabel,
  children,
}: VaultHeaderProps) {
  const showSearch = onSearchChange !== undefined;
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) return;
        setLabel(
          data.user.username
            ? `@${data.user.username}`
            : data.user.displayName || data.user.email,
        );
      })
      .catch(() => {});
  }, []);

  return (
    <header className="shrink-0 border-b border-border bg-card pt-[max(0.625rem,env(safe-area-inset-top))]">
      {showSearch && mobileSearchOpen && (
        <div className="flex items-center gap-2 px-3 py-2.5 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search songs..."
              className="w-full min-h-11 rounded-2xl border border-border bg-background py-2.5 pl-11 pr-4 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            type="button"
            onClick={() => onMobileSearchOpen?.(false)}
            className={iconBtn}
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={`items-center gap-2.5 px-3 py-3 lg:gap-3 lg:px-5 ${
          showSearch && mobileSearchOpen ? "hidden" : "flex"
        }`}
      >
        {children}

        <div className="flex min-w-0 items-center gap-2.5">
          <Logo size={34} href="/vault" priority />
          <BrandWordmark height={18} className="hidden sm:inline-flex" href="/vault" priority />
        </div>

        <nav className="ml-1 hidden items-center gap-1 md:flex">
          <Link
            href="/vault/artists"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
          >
            <Users className="h-4 w-4" />
            Artists
          </Link>
          <Link
            href="/vault/messages"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
          >
            <MessageSquare className="h-4 w-4" />
            Messages
          </Link>
        </nav>

        {showSearch && (
          <div className="relative mx-auto hidden min-w-0 max-w-lg flex-1 lg:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search title, lyrics, tags..."
              className="w-full min-h-10 rounded-2xl border border-border bg-background py-2 pl-11 pr-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
        )}

        {centerLabel && (
          <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground lg:hidden">
            {centerLabel}
          </p>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Link
            href="/vault/artists"
            className={`${iconBtn} md:hidden`}
            aria-label="Artists"
            title="Artists"
          >
            <Users className="h-4 w-4" />
          </Link>
          <Link
            href="/vault/messages"
            className={`${iconBtn} md:hidden`}
            aria-label="Messages"
            title="Messages"
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
          {showSearch && (
            <button
              type="button"
              onClick={() => onMobileSearchOpen?.(true)}
              className={`${iconBtn} lg:hidden`}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          {label && (
            <Link
              href="/vault/settings"
              className="hidden max-w-[12rem] items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs text-muted transition hover:border-foreground/20 hover:text-foreground xl:flex"
              title="Profile & settings"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )}
          <Link
            href="/vault/settings"
            className={`${iconBtn} xl:hidden`}
            aria-label="Profile & settings"
            title="Profile & settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className={`${iconBtn} hover:border-red-500/40 hover:text-red-400`}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export { iconBtn };
