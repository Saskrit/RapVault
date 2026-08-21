"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultEditorView } from "@/components/vault-editor-view";
import { getActiveLocalSongId } from "@/lib/offline-songs";

/** Stable write URL — precached so new songs can open offline. */
export default function LocalWritePage() {
  const [songId, setSongId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getActiveLocalSongId().then((id) => {
      setSongId(id);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <RapVaultLoading fullScreen label="Opening song..." />;
  }

  if (!songId) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <h1 className="text-xl font-semibold tracking-tight">No local draft</h1>
        <p className="max-w-sm text-sm text-muted">
          This offline editor has nothing queued. Create a new song from your
          vault, or open one you already saved on this device.
        </p>
        <Link
          href="/vault"
          className="min-h-11 rounded-xl bg-accent px-6 text-sm font-semibold leading-[2.75rem] text-white transition hover:bg-accent/90"
        >
          Back to vault
        </Link>
      </div>
    );
  }

  return <VaultEditorView songId={songId} />;
}
