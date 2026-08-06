"use client";

import { ArrowLeft, Download, Music2, SpellCheck, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BeatPlayerPanel } from "@/components/beat-player-panel";
import { ConfirmModal } from "@/components/confirm-modal";
import { LyricRichEditor } from "@/components/lyric-rich-editor";
import { ResizableSplit } from "@/components/resizable-split";
import { iconBtn, VaultHeader } from "@/components/vault-header";
import { buildTxtExport, downloadPdf, downloadTxt } from "@/lib/export";
import { calculateLyricStats, formatDuration } from "@/lib/stats";
import type { Song } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";

type VaultEditorViewProps = {
  songId: string;
};

export function VaultEditorView({ songId }: VaultEditorViewProps) {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [spellCheck, setSpellCheck] = useState(true);
  const [beatsOpen, setBeatsOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Partial<Song> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("rapvault-spellcheck");
    if (saved === "false") setSpellCheck(false);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (media.matches) setBeatsOpen(true);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (song?.beatUrl) setBeatsOpen(true);
  }, [song?.beatUrl]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function toggleSpellCheck() {
    setSpellCheck((prev) => {
      const next = !prev;
      localStorage.setItem("rapvault-spellcheck", String(next));
      return next;
    });
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/songs/${songId}`);
      if (res.ok) {
        const data = await res.json();
        setSong(data.song);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
  }, [songId]);

  const persistSong = useCallback(
    async (id: string, patch: Partial<Song>) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/songs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        setSong((prev) => {
          if (!prev) return data.song;
          // Keep live editor text if the user kept typing while the save was in flight.
          return {
            ...data.song,
            content: prev.content,
            title: prev.title,
            beatUrl: prev.beatUrl,
          };
        });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("error");
      }
    },
    [],
  );

  const scheduleSave = useCallback(
    (patch: Partial<Song>) => {
      if (!song) return;
      const id = song.id;
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      setSong((prev) => (prev ? { ...prev, ...patch } : prev));

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (pendingPatch.current) {
          const toSave = pendingPatch.current;
          pendingPatch.current = null;
          persistSong(id, toSave);
        }
      }, 2000);
    },
    [song, persistSong],
  );

  async function confirmDeleteSong() {
    if (!song) return;
    setDeleting(true);

    // Cancel any pending autosave so we don't PATCH a deleted song mid-navigation.
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pendingPatch.current = null;

    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
      if (res.ok) {
        setShowDeleteModal(false);
        // Hard navigate: soft router.push + refresh can fail after unmounting the
        // YouTube beat player and leave an empty "page couldn't load" state.
        window.location.assign("/vault");
        return;
      }
    } finally {
      setDeleting(false);
    }
  }

  function exportPayload() {
    if (!song) return null;
    return {
      title: song.title,
      content: song.content,
      genre: song.genre,
      moodTags: song.moodTags,
      status: song.status,
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
    };
  }

  function handleExportTxt() {
    const payload = exportPayload();
    if (!payload) return;
    downloadTxt(payload.title, buildTxtExport(payload));
  }

  async function handleExportPdf() {
    const payload = exportPayload();
    if (!payload) return;
    await downloadPdf(payload.title, payload);
  }

  const stats = song
    ? calculateLyricStats(song.content)
    : { words: 0, lines: 0, estimatedSeconds: 0 };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted">
        Loading...
      </div>
    );
  }

  if (notFound || !song) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-6 text-muted">
        <p>Song not found.</p>
        <Link
          href="/vault"
          className="min-h-11 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white"
        >
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <VaultHeader>
        <Link
          href="/vault"
          className={`${iconBtn} flex w-auto items-center gap-1.5 px-3 text-sm font-medium`}
          aria-label="Back to library"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Library</span>
        </Link>
      </VaultHeader>

      <div className="shrink-0 border-b border-border bg-card/50 px-3 py-2 lg:px-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <input
            type="text"
            value={song.title}
            onChange={(e) => scheduleSave({ title: e.target.value })}
            spellCheck={spellCheck}
            className="min-w-0 flex-1 basis-40 bg-transparent text-base font-bold outline-none placeholder:text-muted sm:text-lg lg:min-w-[12rem] lg:text-xl"
            placeholder="Song title"
          />

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted sm:text-xs">
            <span>{stats.words} words</span>
            <span className="text-border">·</span>
            <span>{stats.lines} lines</span>
            <span className="text-border">·</span>
            <span>~{formatDuration(stats.estimatedSeconds)}</span>
            <span className="text-border">·</span>
            <span
              className={
                saveState === "error"
                  ? "text-red-400"
                  : saveState === "saving"
                    ? "text-accent"
                    : saveState === "saved"
                      ? "text-green-400"
                      : ""
              }
            >
              {saveState === "saving"
                ? "Saving..."
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? "Save failed"
                    : "Ready"}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBeatsOpen((open) => !open)}
              className={`${iconBtn} lg:hidden ${
                beatsOpen
                  ? "border-accent bg-accent/10 text-accent hover:border-accent hover:text-accent"
                  : ""
              }`}
              aria-label={beatsOpen ? "Hide beat player" : "Show beat player"}
              title={beatsOpen ? "Hide beats" : "Show beats"}
            >
              <Music2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleSpellCheck}
              className={`${iconBtn} ${
                spellCheck
                  ? "border-accent bg-accent/10 text-accent hover:border-accent hover:text-accent"
                  : ""
              }`}
              aria-label={spellCheck ? "Disable spell check" : "Enable spell check"}
              title={spellCheck ? "Spell check on" : "Spell check off"}
            >
              <SpellCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scheduleSave({ isFavorite: !song.isFavorite })}
              className={iconBtn}
              aria-label="Toggle favorite"
            >
              <Star
                className={`h-4 w-4 ${
                  song.isFavorite
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={handleExportTxt}
              className={`${iconBtn} w-auto gap-1.5 px-2.5 sm:px-3`}
              title="Export TXT"
              aria-label="Export TXT"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm sm:inline">TXT</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className={`${iconBtn} w-auto gap-1.5 px-2.5 sm:px-3`}
              title="Export PDF"
              aria-label="Export PDF"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm sm:inline">PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className={`${iconBtn} hover:border-red-500/50 hover:text-red-400`}
              aria-label="Delete song"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ResizableSplit
          secondaryVisible={beatsOpen}
          storageKey="rapvault-editor-split"
          defaultSecondarySize={360}
          primary={
            <LyricRichEditor
              key={song.id}
              value={song.content}
              onChange={(content) => scheduleSave({ content })}
              spellCheck={spellCheck}
            />
          }
          secondary={
            <BeatPlayerPanel
              beatUrl={song.beatUrl}
              onBeatUrlChange={(beatUrl) => scheduleSave({ beatUrl })}
              onClose={() => setBeatsOpen(false)}
            />
          }
        />
      </main>

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        onConfirm={confirmDeleteSong}
        title="Delete song?"
        description={`"${song.title || "This song"}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}
