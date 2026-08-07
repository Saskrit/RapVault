"use client";

import { useCallback, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { BrandWordmark, Logo } from "@/components/logo";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    function sync() {
      setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const retry = useCallback(async () => {
    setChecking(true);
    try {
      // Lightweight reachability check (cache-bust) — navigator.onLine alone can lie.
      await fetch(`/favicon.ico?offline-check=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
      });
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  }, []);

  if (!online) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Logo size={56} href={null} priority />
          <BrandWordmark height={22} href={null} priority />
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-muted">
          <WifiOff className="h-5 w-5" />
        </div>
        <div className="max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight">
            No internet connection
          </h1>
          <p className="mt-2 text-sm text-muted">
            RapVault needs a connection to load your vault, sync lyrics, and
            update your profile. Check your network and try again.
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          disabled={checking}
          className="min-h-11 rounded-xl bg-accent px-6 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {checking ? "Checking..." : "Try again"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
