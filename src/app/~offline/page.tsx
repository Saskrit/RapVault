"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { WifiOff } from "lucide-react";
import { BrandWordmark, Logo } from "@/components/logo";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultSongsView } from "@/components/vault-songs-view";
import { getCachedSongs, isBrowserOffline } from "@/lib/offline-songs";

function OfflineVaultGate() {
  const [ready, setReady] = useState(false);
  const [hasVault, setHasVault] = useState(false);

  useEffect(() => {
    const cached = getCachedSongs().filter((song) => !song.deletedAt);
    setHasVault(cached.length > 0);
    setReady(true);
  }, []);

  if (!ready) {
    return <RapVaultLoading fullScreen label="Loading..." />;
  }

  if (hasVault) {
    return (
      <Suspense fallback={<RapVaultLoading fullScreen label="Loading vault..." />}>
        <VaultSongsView />
      </Suspense>
    );
  }

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
        <h1 className="text-xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-muted">
          {isBrowserOffline()
            ? "No songs are saved on this device yet. Connect once, open your vault, then your lyrics will be available offline."
            : "Open your vault while online once to save songs on this device for offline use."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/vault"
          className="min-h-11 rounded-xl bg-accent px-6 text-sm font-semibold leading-[2.75rem] text-white transition hover:bg-accent/90"
        >
          Try vault
        </Link>
        <Link
          href="/"
          className="min-h-11 rounded-xl border border-border px-6 text-sm font-semibold leading-[2.75rem] text-foreground transition hover:border-foreground/25"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

export default function OfflineFallbackPage() {
  return <OfflineVaultGate />;
}
