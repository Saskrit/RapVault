"use client";

import { LogOut, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
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
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition active:scale-95 hover:border-accent hover:text-accent";

export function VaultHeader({
  searchQuery = "",
  onSearchChange,
  mobileSearchOpen = false,
  onMobileSearchOpen,
  centerLabel,
  children,
}: VaultHeaderProps) {
  const showSearch = onSearchChange !== undefined;
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-xl pt-[max(0.625rem,env(safe-area-inset-top))]">
      {showSearch && mobileSearchOpen && (
        <div className="flex items-center gap-2 px-3 py-2.5 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full min-h-11 rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-base outline-none focus:border-accent"
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
        className={`items-center gap-2 px-3 py-2.5 lg:gap-3 lg:px-4 lg:py-3 ${
          showSearch && mobileSearchOpen ? "hidden" : "flex"
        }`}
      >
        {children}

        <Logo size={32} href={null} priority />

        {showSearch && (
          <div className="relative mx-auto hidden min-w-0 max-w-md flex-1 lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search title, lyrics, tags..."
              className="w-full min-h-10 rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-accent"
            />
          </div>
        )}

        {centerLabel && (
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted lg:hidden">
            {centerLabel}
          </p>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:gap-2">
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
          {userEmail && (
            <span
              className="max-w-[7rem] truncate text-xs text-muted sm:max-w-[10rem] lg:max-w-[14rem] lg:text-sm"
              title={userEmail}
            >
              {userEmail}
            </span>
          )}
          <ThemeToggle />
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className={`${iconBtn} hover:border-red-500/50 hover:text-red-400`}
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
