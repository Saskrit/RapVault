"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Download,
  Eye,
  Globe,
  Lock,
  Music2,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BeatPlayerPanel } from "@/components/beat-player-panel";
import { CollaboratorsModal } from "@/components/collaborators-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { LyricRichEditor } from "@/components/lyric-rich-editor";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { ResizableSplit } from "@/components/resizable-split";
import { iconBtn, VaultHeader } from "@/components/vault-header";
import { useOfflineSync } from "@/components/offline-provider";
import { buildTxtExport, downloadPdf, downloadTxt } from "@/lib/export";
import {
  preferenceStorageGet,
  preferenceStorageSet,
} from "@/lib/safe-storage";
import {
  applyPendingToSong,
  cacheSong,
  flushPendingSong,
  getCachedSong,
  getPendingPatch,
  isBrowserOffline,
  queueSongPatch,
  removeCachedSong,
  type SongPatch,
} from "@/lib/offline-songs";
import { calculateLyricStats, formatDuration } from "@/lib/stats";
import type { Song } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "offline" | "error";

type VaultEditorViewProps = {
  songId: string;
};

/** Square icon control — fixed size, no label. */
const toolIcon =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted transition active:scale-95 hover:border-foreground/20 hover:text-foreground sm:h-10 sm:w-10";

/** Chip control — auto width so icon + label never overflow/overlap. */
const toolChip =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-background px-2.5 text-muted transition active:scale-95 hover:border-foreground/20 hover:text-foreground sm:h-10 sm:px-3";

export function VaultEditorView({ songId }: VaultEditorViewProps) {
  const { online, refreshPending } = useOfflineSync();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [spellCheck, setSpellCheck] = useState(false);
  const [beatsOpen, setBeatsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<SongPatch | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const songRef = useRef<Song | null>(null);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    function syncSpellCheck() {
      if (media.matches) {
        setSpellCheck(false);
        return;
      }
      setSpellCheck(preferenceStorageGet("rapvault-spellcheck") !== "false");
    }
    syncSpellCheck();
    media.addEventListener("change", syncSpellCheck);
    return () => media.removeEventListener("change", syncSpellCheck);
  }, []);

  useEffect(() => {
    if (!downloadOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!downloadMenuRef.current?.contains(event.target as Node)) {
        setDownloadOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDownloadOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [downloadOpen]);

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
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setSpellCheck(false);
      return;
    }
    setSpellCheck((prev) => {
      const next = !prev;
      preferenceStorageSet("rapvault-spellcheck", String(next));
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);

      const applyLocal = (base: Song) => applyPendingToSong(base);

      try {
        const res = await fetch(`/api/songs/${songId}`);
        if (cancelled) return;

        if (res.ok) {
          const data = (await res.json()) as { song: Song };
          cacheSong(data.song);
          const merged = applyLocal(data.song);
          setSong(merged);
          setNotFound(false);

          if (getPendingPatch(songId) && !isBrowserOffline()) {
            setSaveState("saving");
            const result = await flushPendingSong(songId);
            refreshPending();
            if (!cancelled) {
              const cached = getCachedSong(songId);
              if (cached) setSong(applyLocal(cached));
              setSaveState(result === "ok" ? "saved" : "offline");
              if (result === "ok") {
                setTimeout(() => {
                  if (!cancelled) setSaveState("idle");
                }, 2000);
              }
            }
          }
        } else {
          const cached = getCachedSong(songId);
          if (cached) {
            setSong(applyLocal(cached));
            setNotFound(false);
            if (getPendingPatch(songId)) setSaveState("offline");
          } else {
            setNotFound(true);
          }
        }
      } catch {
        if (cancelled) return;
        const cached = getCachedSong(songId);
        if (cached) {
          setSong(applyLocal(cached));
          setNotFound(false);
          if (getPendingPatch(songId) || isBrowserOffline()) {
            setSaveState("offline");
          }
        } else {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [songId, refreshPending]);

  // Shared collab songs: poll for the other writer's saves while idle.
  const isSharedCollab =
    Boolean(song?.isCollaborator) ||
    (song?.collaborators?.length ?? 0) > 0;

  useEffect(() => {
    if (!isSharedCollab || !songId) return;

    let cancelled = false;

    async function pullRemote() {
      if (cancelled || document.visibilityState === "hidden") return;
      if (isBrowserOffline()) return;
      if (pendingPatch.current || getPendingPatch(songId) || saveTimer.current) {
        return;
      }

      try {
        const res = await fetch(`/api/songs/${songId}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { song: Song };
        const remote = data.song;
        const local = songRef.current;
        if (!local) return;
        if (remote.updatedAt <= local.updatedAt) return;
        if (pendingPatch.current || getPendingPatch(songId)) return;

        cacheSong(remote);
        setSong(applyPendingToSong(remote));
        setSaveState("saved");
        window.setTimeout(() => {
          if (!cancelled) setSaveState("idle");
        }, 1500);
      } catch {
        // ignore
      }
    }

    const interval = window.setInterval(() => void pullRemote(), 3500);
    function onVisible() {
      if (document.visibilityState === "visible") void pullRemote();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [songId, isSharedCollab]);

  const persistSong = useCallback(
    async (id: string) => {
      if (isBrowserOffline()) {
        setSaveState("offline");
        refreshPending();
        return;
      }

      setSaveState("saving");
      const result = await flushPendingSong(id);
      refreshPending();

      if (result === "fail") {
        setSaveState("offline");
        return;
      }

      const cached = getCachedSong(id);
      if (cached) {
        setSong((prev) => {
          if (!prev) return applyPendingToSong(cached);
          return {
            ...applyPendingToSong(cached),
            content: prev.content,
            title: prev.title,
            beatUrl: prev.beatUrl,
          };
        });
      }

      if (getPendingPatch(id)) {
        setSaveState("offline");
        return;
      }

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    },
    [refreshPending],
  );

  const scheduleSave = useCallback(
    (patch: SongPatch) => {
      const current = songRef.current;
      if (!current) return;
      const id = current.id;

      pendingPatch.current = { ...pendingPatch.current, ...patch };
      setSong((prev) => (prev ? { ...prev, ...patch } : prev));
      queueSongPatch(id, patch);
      refreshPending();

      if (isBrowserOffline()) {
        setSaveState("offline");
      }

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        pendingPatch.current = null;
        void persistSong(id);
      }, 2000);
    },
    [persistSong, refreshPending],
  );

  // When connectivity returns, push any queued edits.
  useEffect(() => {
    if (!online || !songId) return;
    if (!getPendingPatch(songId)) return;
    void persistSong(songId);
  }, [online, songId, persistSong]);

  // Flush debounce early if the user leaves the page.
  useEffect(() => {
    function flushNow() {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (pendingPatch.current || getPendingPatch(songId)) {
        pendingPatch.current = null;
        void flushPendingSong(songId);
      }
    }
    window.addEventListener("pagehide", flushNow);
    return () => window.removeEventListener("pagehide", flushNow);
  }, [songId]);

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
        removeCachedSong(song.id);
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
    setDownloadOpen(false);
  }

  async function handleExportPdf() {
    const payload = exportPayload();
    if (!payload) return;
    await downloadPdf(payload.title, payload);
    setDownloadOpen(false);
  }

  const stats = song
    ? calculateLyricStats(song.content)
    : { words: 0, lines: 0, estimatedSeconds: 0 };

  const isOwner = song?.isOwner !== false;

  async function refreshSongMeta() {
    try {
      const res = await fetch(`/api/songs/${songId}`);
      if (res.ok) {
        const data = (await res.json()) as { song: Song };
        cacheSong(data.song);
        setSong((prev) =>
          prev
            ? {
                ...applyPendingToSong(data.song),
                content: prev.content,
                title: prev.title,
                beatUrl: prev.beatUrl,
              }
            : applyPendingToSong(data.song),
        );
      }
    } catch {
      // Keep local state when offline.
    }
  }

  if (loading) {
    return <RapVaultLoading fullScreen label="Loading..." />;
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
          className={`${iconBtn} shrink-0`}
          aria-label="Back to library"
          title="Library"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
        </Link>
      </VaultHeader>

      <div className="shrink-0 border-b border-border bg-card/50 px-2 py-2 sm:px-3 sm:py-3 lg:px-4">
        <div className="grid w-full grid-cols-1 gap-2 lg:grid-cols-[minmax(0,55%)_minmax(0,45%)] lg:items-center lg:gap-3">
          <input
            id="song-title"
            type="text"
            value={song.title}
            onChange={(e) => scheduleSave({ title: e.target.value })}
            spellCheck={spellCheck}
            className="box-border min-w-0 w-full max-w-full justify-self-stretch rounded-xl border border-border bg-background px-3 py-2 text-base font-semibold tracking-tight text-foreground outline-none transition placeholder:font-medium placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:px-3.5 sm:py-2.5 sm:text-lg lg:text-xl xl:text-2xl"
            placeholder="Untitled track"
          />

          <div className="flex min-w-0 w-full max-w-full items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center justify-start gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:justify-end lg:pb-0 [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setBeatsOpen((open) => !open)}
                className={`${toolIcon} lg:hidden ${
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
                onClick={() => setShowCollabModal(true)}
                className={`${toolChip} max-w-[10rem] xl:max-w-[14rem]`}
                aria-label="Collaborators"
                title={
                  (song.collaborators?.length || 0) > 0
                    ? `With ${song.collaborators!
                        .map((c) => c.artist.displayName)
                        .join(", ")}`
                    : "Collaborators"
                }
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden min-w-0 truncate text-sm lg:inline">
                  {(song.collaborators?.length || 0) > 0
                    ? song.collaborators!.length === 1
                      ? song.collaborators![0]!.artist.displayName
                      : `${song.collaborators!.length} collabs`
                    : "Collab"}
                </span>
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => scheduleSave({ isFavorite: !song.isFavorite })}
                  className={toolIcon}
                  aria-label="Toggle favorite"
                  title="Favorite"
                >
                  <Star
                    className={`h-4 w-4 ${
                      song.isFavorite
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted"
                    }`}
                  />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  scheduleSave({
                    status: song.status === "finished" ? "draft" : "finished",
                  })
                }
                className={`${toolChip} ${
                  song.status === "finished"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:border-emerald-500/60 hover:text-emerald-400"
                    : ""
                }`}
                aria-label={
                  song.status === "finished"
                    ? "Finished — click to mark as draft"
                    : "Draft — click to mark as finished"
                }
                title={
                  song.status === "finished"
                    ? "Finished — click to mark as draft"
                    : "Draft — click to mark as finished"
                }
              >
                {song.status === "finished" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <CircleDashed className="h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="hidden text-sm lg:inline">
                  {song.status === "finished" ? "Finished" : "Draft"}
                </span>
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={() =>
                    scheduleSave({ isPublic: !Boolean(song.isPublic) })
                  }
                  className={`${toolChip} ${
                    song.isPublic
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:border-emerald-500/60 hover:text-emerald-400"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:border-amber-500/60 hover:text-amber-400"
                  }`}
                  aria-label={
                    song.isPublic
                      ? "Public — click to make personal"
                      : "Personal — click to make public"
                  }
                  title={
                    song.isPublic
                      ? "Public — click to make personal"
                      : "Personal — click to make public"
                  }
                >
                  {song.isPublic ? (
                    <Globe className="h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <span className="hidden text-sm lg:inline">
                    {song.isPublic ? "Public" : "Personal"}
                  </span>
                </button>
              )}

              {song.isPublic && (
                <Link
                  href={`/vault/s/${song.id}`}
                  className={toolChip}
                  title="Public view"
                  aria-label="Open public view"
                >
                  <Eye className="h-4 w-4 shrink-0" />
                  <span className="hidden text-sm lg:inline">View</span>
                </Link>
              )}

              {!isOwner && song.owner && (
                <p className="hidden max-w-[10rem] truncate text-xs text-muted xl:inline">
                  with {song.owner.displayName}
                </p>
              )}

              <div ref={downloadMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setDownloadOpen((open) => !open)}
                  className={`${toolChip} ${
                    downloadOpen
                      ? "border-accent bg-accent/10 text-accent hover:border-accent hover:text-accent"
                      : ""
                  }`}
                  title="Download"
                  aria-label="Download"
                  aria-haspopup="menu"
                  aria-expanded={downloadOpen}
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="hidden text-sm lg:inline">Download</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition ${downloadOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {downloadOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-40 mt-1.5 min-w-[9.5rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleExportTxt}
                      className="flex w-full items-center px-3.5 py-2.5 text-left text-sm text-foreground transition hover:bg-background"
                    >
                      Download TXT
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleExportPdf}
                      className="flex w-full items-center px-3.5 py-2.5 text-left text-sm text-foreground transition hover:bg-background"
                    >
                      Download PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className={`${toolIcon} shrink-0 hover:border-red-500/50 hover:text-red-400`}
                aria-label="Delete song"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
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
              onSpellCheckChange={toggleSpellCheck}
              canChooseWriterColor={Boolean(song.isCollaborator)}
              writerLabel={
                song.isCollaborator
                  ? null
                  : (song.collaborators?.length ?? 0) > 0
                    ? "Colored text = collaborator · Yours = default"
                    : null
              }
              toolbarStats={
                <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted sm:text-xs">
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
                            : saveState === "offline"
                              ? "text-amber-500"
                              : ""
                    }
                  >
                    {saveState === "saving"
                      ? "Saving..."
                      : saveState === "saved"
                        ? "Saved"
                        : saveState === "offline"
                          ? "Saved offline"
                          : saveState === "error"
                            ? "Save failed"
                            : "Ready"}
                  </span>
                </div>
              }
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
        title="Delete this song?"
        description={`Are you sure you want to move "${song.title || "this song"}" to the Recycle Bin? You can restore it later.`}
        confirmLabel="Yes"
        cancelLabel="No"
        destructive
        loading={deleting}
      />

      <CollaboratorsModal
        open={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        songId={song.id}
        isOwner={isOwner}
        onChanged={refreshSongMeta}
      />
    </div>
  );
}
