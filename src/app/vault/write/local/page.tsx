"use client";

import { useEffect, useState } from "react";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultEditorView } from "@/components/vault-editor-view";
import {
  createOfflineSong,
  getActiveLocalSongId,
  setActiveLocalSongId,
} from "@/lib/offline-songs";

/** Stable write URL — precached so new songs can open offline. */
export default function LocalWritePage() {
  const [songId, setSongId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      let id = await getActiveLocalSongId();
      if (!id) {
        const created = await createOfflineSong();
        if (created) {
          id = created.id;
          await setActiveLocalSongId(id);
        }
      }
      setSongId(id);
      setReady(true);
    })();
  }, []);

  if (!ready || !songId) {
    return <RapVaultLoading fullScreen label="Opening song studio..." />;
  }

  return <VaultEditorView songId={songId} />;
}
