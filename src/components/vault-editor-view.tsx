"use client";

import { ArrowLeft, Download, SpellCheck, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { iconBtn, VaultHeader } from "@/components/vault-header";
import { buildTxtExport, downloadTxt } from "@/lib/export";
import { calculateLyricStats, formatDuration } from "@/lib/stats";
import type { Song } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";

type VaultEditorViewProps = {
  songId: string;
};

export function VaultEditorView({ songId }: VaultEditorViewProps) {
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [spellCheck, setSpellCheck] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Partial<Song> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("rapvault-spellcheck");
    if (saved === "false") setSpellCheck(false);
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
        setSong(data.song);
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
    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
      if (res.ok) {
        setShowDeleteModal(false);
        router.push("/vault");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleExport() {
    if (!song) return;
    const txt = buildTxtExport({
      title: song.title,
      content: song.content,
      genre: song.genre,
      moodTags: song.moodTags,
      status: song.status,
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
    });
    downloadTxt(song.title, txt);
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
      <VaultHeader centerLabel={song.title}>
        <Link
          href="/vault"
          className={`${iconBtn} flex w-auto items-center gap-1.5 px-3 text-sm font-medium`}
          aria-label="Back to library"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Library</span>
        </Link>
      </VaultHeader>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border px-4 py-3 lg:px-8 lg:py-4">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <input
              type="text"
              value={song.title}
              onChange={(e) => scheduleSave({ title: e.target.value })}
              spellCheck={spellCheck}
              className="min-w-0 w-full bg-transparent text-xl font-bold outline-none placeholder:text-muted sm:flex-1 lg:text-2xl"
              placeholder="Song title"
            />
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={toggleSpellCheck}
                className={`${iconBtn} ${spellCheck ? "border-accent/50 text-accent" : ""}`}
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
                onClick={handleExport}
                className={`${iconBtn} w-auto gap-1.5 px-3`}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span className="text-sm">TXT</span>
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

          <div className="mx-auto mt-3 flex w-full max-w-4xl flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{stats.words} words</span>
            <span>{stats.lines} lines</span>
            <span>~{formatDuration(stats.estimatedSeconds)}</span>
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
                    : ""}
            </span>
          </div>
        </div>

        <textarea
          value={song.content}
          onChange={(e) => scheduleSave({ content: e.target.value })}
          placeholder="Drop your bars here..."
          className="mx-auto min-h-0 w-full max-w-4xl flex-1 resize-none bg-editor px-4 py-4 font-mono text-base leading-relaxed text-foreground outline-none placeholder:text-muted lg:px-8 lg:py-5"
          spellCheck={spellCheck}
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
