"use client";

import {
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  Globe,
  Lock,
  MoreVertical,
  Music2,
  Pencil,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddAnnotationModal } from "@/components/add-annotation-modal";
import { BeatPlayerPanel } from "@/components/beat-player-panel";
import { CollaboratorsModal } from "@/components/collaborators-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { LyricRichEditor } from "@/components/lyric-rich-editor";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { ResizableSplit } from "@/components/resizable-split";
import { VaultHeader } from "@/components/vault-header";
import { useOfflineSync } from "@/components/offline-provider";
import {
  type Annotation,
  type AnnotationColor,
  getReferenceDemoAnnotations,
  parseAnnotations,
  serializeAnnotations,
  unwrapLyricAnnotation,
  wrapLyricWithAnnotation,
} from "@/lib/annotations";
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
  isOfflineSongId,
  queueSongPatch,
  removeCachedSong,
  setActiveLocalSongId,
  SONG_ID_REMAP_EVENT,
  type SongPatch,
} from "@/lib/offline-songs";
import { calculateLyricStats, formatDuration } from "@/lib/stats";
import type { Song } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "offline" | "error";

type VaultEditorViewProps = {
  songId: string;
};

export function VaultEditorView({ songId }: VaultEditorViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { online, refreshPending } = useOfflineSync();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabInitialTab, setCollabInitialTab] = useState<"active" | "requests">(
    "active",
  );
  const [deleting, setDeleting] = useState(false);
  const [spellCheck, setSpellCheck] = useState(false);
  const [beatsOpen, setBeatsOpen] = useState(true);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Annotation states
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null,
  );
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [selectedLyricText, setSelectedLyricText] = useState("");
  const [editingAnnotation, setEditingAnnotation] =
    useState<Annotation | null>(null);
  const [currentBeatTime, setCurrentBeatTime] = useState<number | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<SongPatch | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const songRef = useRef<Song | null>(null);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  useEffect(() => {
    if (searchParams.get("collab") === "requests") {
      setCollabInitialTab("requests");
      setShowCollabModal(true);
    }
  }, [searchParams]);

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

  // Close menus on outside click
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (statusMenuOpen && !statusMenuRef.current?.contains(target)) {
        setStatusMenuOpen(false);
      }
      if (moreMenuOpen && !moreMenuRef.current?.contains(target)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [statusMenuOpen, moreMenuOpen]);

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

      if (isOfflineSongId(songId)) {
        const cached = await getCachedSong(songId);
        if (cancelled) return;
        if (cached) {
          setSong(await applyPendingToSong(cached));
          setNotFound(false);
          setSaveState("offline");
        } else {
          setNotFound(true);
        }
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/songs/${songId}`);
        if (cancelled) return;

        if (res.ok) {
          const data = (await res.json()) as { song: Song };
          await cacheSong(data.song);
          const merged = await applyPendingToSong(data.song);
          setSong(merged);
          setNotFound(false);

          const pending = await getPendingPatch(songId);
          if (pending && !isBrowserOffline()) {
            setSaveState("saving");
            const result = await flushPendingSong(songId);
            refreshPending();
            if (!cancelled) {
              const cached = await getCachedSong(songId);
              if (cached) setSong(await applyPendingToSong(cached));
              setSaveState(result === "ok" ? "saved" : "offline");
              if (result === "ok") {
                setTimeout(() => {
                  if (!cancelled) setSaveState("idle");
                }, 2000);
              }
            }
          }
        } else {
          const cached = await getCachedSong(songId);
          if (cached) {
            setSong(await applyPendingToSong(cached));
            setNotFound(false);
            if (await getPendingPatch(songId)) setSaveState("offline");
          } else {
            setNotFound(true);
          }
        }
      } catch {
        if (cancelled) return;
        const cached = await getCachedSong(songId);
        if (cached) {
          setSong(await applyPendingToSong(cached));
          setNotFound(false);
          if ((await getPendingPatch(songId)) || isBrowserOffline()) {
            setSaveState("offline");
          }
        } else {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [songId, refreshPending]);

  useEffect(() => {
    function onRemap(event: Event) {
      const detail = (event as CustomEvent<{ from: string; to: string }>).detail;
      if (!detail || detail.from !== songId) return;
      void setActiveLocalSongId(detail.to);
      router.replace(`/vault/write/${detail.to}`);
    }
    window.addEventListener(SONG_ID_REMAP_EVENT, onRemap);
    return () => window.removeEventListener(SONG_ID_REMAP_EVENT, onRemap);
  }, [songId, router]);

  const isSharedCollab =
    Boolean(song?.isCollaborator) ||
    (song?.collaborators?.length ?? 0) > 0;

  useEffect(() => {
    if (!isSharedCollab || !songId) return;
    let cancelled = false;

    async function pullRemote() {
      if (cancelled || document.visibilityState === "hidden") return;
      if (isBrowserOffline()) return;
      if (
        pendingPatch.current ||
        (await getPendingPatch(songId)) ||
        saveTimer.current
      ) {
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
        if (pendingPatch.current || (await getPendingPatch(songId))) return;

        await cacheSong(remote);
        setSong(await applyPendingToSong(remote));
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

      const cached = await getCachedSong(id);
      if (cached) {
        const merged = await applyPendingToSong(cached);
        setSong((prev) => {
          if (!prev) return merged;
          return {
            ...merged,
            content: prev.content,
            title: prev.title,
            beatUrl: prev.beatUrl,
            annotations: prev.annotations,
          };
        });
      }

      if (await getPendingPatch(id)) {
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
      void queueSongPatch(id, patch);
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

  useEffect(() => {
    if (!online || !songId) return;
    void (async () => {
      if (!(await getPendingPatch(songId))) return;
      await persistSong(songId);
    })();
  }, [online, songId, persistSong]);

  useEffect(() => {
    function flushNow() {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      void (async () => {
        if (pendingPatch.current || (await getPendingPatch(songId))) {
          pendingPatch.current = null;
          await flushPendingSong(songId);
        }
      })();
    }
    window.addEventListener("pagehide", flushNow);
    return () => window.removeEventListener("pagehide", flushNow);
  }, [songId]);

  // Seed sample reference annotations if demo lyrics are present and annotations are empty
  useEffect(() => {
    if (!song) return;
    const currentAnn = parseAnnotations(song.annotations);
    if (
      currentAnn.length === 0 &&
      song.content.includes("satya music taste kati lai")
    ) {
      const demo = getReferenceDemoAnnotations();
      let updatedContent = song.content;
      for (const d of demo) {
        updatedContent = wrapLyricWithAnnotation(updatedContent, d);
      }
      scheduleSave({
        annotations: serializeAnnotations(demo),
        content: updatedContent,
      });
    }
  }, [song?.content, song?.annotations, scheduleSave]);

  const annotations: Annotation[] = useMemo(() => {
    return parseAnnotations(song?.annotations);
  }, [song?.annotations]);

  function handleSaveAnnotation(data: {
    id?: string;
    text: string;
    explanation: string;
    timestamp?: string;
    color: AnnotationColor;
    commentsCount?: number;
  }) {
    if (!song) return;

    let nextAnnotations: Annotation[];
    let targetAnnotation: Annotation;

    if (data.id) {
      targetAnnotation = {
        id: data.id,
        text: data.text,
        explanation: data.explanation,
        timestamp: data.timestamp,
        color: data.color,
        authorName: "@saskreet",
        createdAt:
          annotations.find((a) => a.id === data.id)?.createdAt ||
          new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        commentsCount: data.commentsCount ?? 1,
      };
      nextAnnotations = annotations.map((a) =>
        a.id === data.id ? targetAnnotation : a,
      );
    } else {
      const newId = `ann-${Date.now()}`;
      targetAnnotation = {
        id: newId,
        text: data.text,
        explanation: data.explanation,
        timestamp: data.timestamp,
        color: data.color,
        authorName: "@saskreet",
        createdAt: new Date().toISOString(),
        commentsCount: 1,
      };
      nextAnnotations = [...annotations, targetAnnotation];
    }

    const nextContent = wrapLyricWithAnnotation(song.content, targetAnnotation);
    const serialized = serializeAnnotations(nextAnnotations);

    scheduleSave({
      annotations: serialized,
      content: nextContent,
    });
    setActiveAnnotationId(targetAnnotation.id);
  }

  function handleDeleteAnnotation(id: string) {
    if (!song) return;
    const nextAnnotations = annotations.filter((a) => a.id !== id);
    const nextContent = unwrapLyricAnnotation(song.content, id);
    const serialized = serializeAnnotations(nextAnnotations);

    scheduleSave({
      annotations: serialized,
      content: nextContent,
    });
    if (activeAnnotationId === id) {
      setActiveAnnotationId(null);
    }
  }

  async function confirmDeleteSong() {
    if (!song) return;
    setDeleting(true);

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pendingPatch.current = null;

    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
      if (res.ok) {
        await removeCachedSong(song.id);
        setShowDeleteModal(false);
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

  const isOwner = song?.isOwner !== false;

  async function refreshSongMeta() {
    try {
      const res = await fetch(`/api/songs/${songId}`);
      if (res.ok) {
        const data = (await res.json()) as { song: Song };
        await cacheSong(data.song);
        const merged = await applyPendingToSong(data.song);
        setSong((prev) =>
          prev
            ? {
                ...merged,
                content: prev.content,
                title: prev.title,
                beatUrl: prev.beatUrl,
                annotations: prev.annotations,
              }
            : merged,
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f7f6f4] text-foreground dark:bg-[#121214]">
      {/* Top Navbar matching screenshot */}
      <VaultHeader variant="writing" />

      {/* Main Split Body: Dual Card Layout */}
      <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden p-2.5 sm:p-3 lg:p-4">
        <ResizableSplit
          secondaryVisible={beatsOpen}
          storageKey="rapvault-editor-split"
          defaultSecondarySize={480}
          primary={
            /* Left Card: Document Header + Rich Lyric Editor + Footer */
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              {/* Document Header matching screenshot */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={titleInputRef}
                      id="song-title"
                      type="text"
                      value={song.title}
                      onChange={(e) => scheduleSave({ title: e.target.value })}
                      placeholder="Untitled"
                      spellCheck={spellCheck}
                      className="bg-transparent text-xl font-bold tracking-tight text-foreground outline-none transition placeholder:text-muted focus:underline sm:text-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => titleInputRef.current?.focus()}
                      className="rounded-lg p-1 text-muted transition hover:bg-sidebar hover:text-foreground"
                      title="Rename track"
                      aria-label="Rename track"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Saved just now • {stats.words} words • {stats.lines} lines
                  </p>
                </div>

                {/* Right controls in document header: Status, Publish, More */}
                <div className="flex items-center gap-2">
                  {/* Status Dropdown: Draft v */}
                  <div className="relative" ref={statusMenuRef}>
                    <button
                      type="button"
                      onClick={() => setStatusMenuOpen((o) => !o)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-sidebar"
                    >
                      <span>
                        {song.status === "finished" ? "Finished" : "Draft"}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted" />
                    </button>
                    {statusMenuOpen && (
                      <div className="absolute right-0 top-full z-30 mt-1 min-w-[7.5rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            scheduleSave({ status: "draft" });
                            setStatusMenuOpen(false);
                          }}
                          className="flex w-full items-center px-3 py-1.5 text-xs hover:bg-sidebar"
                        >
                          Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            scheduleSave({ status: "finished" });
                            setStatusMenuOpen(false);
                          }}
                          className="flex w-full items-center px-3 py-1.5 text-xs hover:bg-sidebar"
                        >
                          Finished
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Publish Button in warm bronze */}
                  <button
                    type="button"
                    onClick={() =>
                      scheduleSave({ isPublic: !Boolean(song.isPublic) })
                    }
                    className="rap-btn-bronze inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95"
                  >
                    {song.isPublic ? "Published" : "Publish"}
                  </button>

                  {/* More options menu: ⋮ */}
                  <div className="relative" ref={moreMenuRef}>
                    <button
                      type="button"
                      onClick={() => setMoreMenuOpen((o) => !o)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted transition hover:bg-sidebar hover:text-foreground"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {moreMenuOpen && (
                      <div className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] overflow-hidden rounded-2xl border border-border bg-card py-1.5 text-xs shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            scheduleSave({ isFavorite: !song.isFavorite });
                            setMoreMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3.5 py-2 transition hover:bg-sidebar"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              song.isFavorite
                                ? "fill-amber-400 text-amber-400"
                                : ""
                            }`}
                          />
                          <span>
                            {song.isFavorite
                              ? "Favorited"
                              : "Add to favorites"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCollabInitialTab("active");
                            setShowCollabModal(true);
                            setMoreMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3.5 py-2 transition hover:bg-sidebar"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Collaborators</span>
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          type="button"
                          onClick={() => {
                            handleExportTxt();
                            setMoreMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3.5 py-2 transition hover:bg-sidebar"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download TXT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleExportPdf();
                            setMoreMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3.5 py-2 transition hover:bg-sidebar"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download PDF</span>
                        </button>
                        {isOwner && (
                          <>
                            <div className="my-1 border-t border-border" />
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteModal(true);
                                setMoreMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2 px-3.5 py-2 text-red-500 transition hover:bg-sidebar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete song</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rich Lyric Editor */}
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
                activeAnnotationId={activeAnnotationId}
                onAnnotationClick={(id) => setActiveAnnotationId(id)}
                onTriggerAnnotate={(selected) => {
                  setSelectedLyricText(selected);
                  setEditingAnnotation(null);
                  setAnnotationModalOpen(true);
                }}
                footerStats={
                  <>
                    <div className="flex flex-nowrap items-center gap-x-2 text-xs text-muted">
                      <span className="tabular-nums">{stats.words} words</span>
                      <span className="text-border">·</span>
                      <span className="tabular-nums">{stats.lines} lines</span>
                      <span className="text-border">·</span>
                      <span className="tabular-nums">
                        ~{formatDuration(stats.estimatedSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {saveState === "saving" ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          Saving...
                        </span>
                      ) : saveState === "offline" ? (
                        <span className="font-medium text-amber-600">
                          Saved offline
                        </span>
                      ) : saveState === "error" ? (
                        <span className="font-medium text-red-500">
                          Save failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-muted">
                          <span>Last saved just now</span>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </span>
                      )}
                    </div>
                  </>
                }
              />
            </div>
          }
          secondary={
            /* Right Card: Beats & Annotations Panel */
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              <BeatPlayerPanel
                beatUrl={song.beatUrl}
                onBeatUrlChange={(beatUrl) => scheduleSave({ beatUrl })}
                onClose={() => setBeatsOpen(false)}
                annotations={annotations}
                activeAnnotationId={activeAnnotationId}
                onSelectAnnotation={(id) => setActiveAnnotationId(id)}
                onAddAnnotation={() => {
                  setSelectedLyricText("");
                  setEditingAnnotation(null);
                  setAnnotationModalOpen(true);
                }}
                onEditAnnotation={(item) => {
                  setEditingAnnotation(item);
                  setSelectedLyricText(item.text);
                  setAnnotationModalOpen(true);
                }}
                onDeleteAnnotation={handleDeleteAnnotation}
                onTimeUpdate={(t) => setCurrentBeatTime(t)}
                onSetCurrentLineTime={(timeStr) => {
                  // If annotation modal is open, or can append timestamp
                  if (activeAnnotationId) {
                    const ann = annotations.find(
                      (a) => a.id === activeAnnotationId,
                    );
                    if (ann) {
                      handleSaveAnnotation({
                        ...ann,
                        timestamp: timeStr,
                      });
                    }
                  }
                }}
              />
            </div>
          }
        />
      </main>

      {/* Add / Edit Annotation Modal */}
      <AddAnnotationModal
        open={annotationModalOpen}
        onClose={() => {
          setAnnotationModalOpen(false);
          setEditingAnnotation(null);
          setSelectedLyricText("");
        }}
        onSave={handleSaveAnnotation}
        initialData={editingAnnotation}
        selectedText={selectedLyricText}
        currentVideoTime={currentBeatTime}
      />

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
        onClose={() => {
          setShowCollabModal(false);
          setCollabInitialTab("active");
          if (searchParams.get("collab") === "requests") {
            router.replace(`/vault/write/${song.id}`, { scroll: false });
          }
        }}
        songId={song.id}
        isOwner={isOwner}
        onChanged={refreshSongMeta}
        initialTab={collabInitialTab}
      />
    </div>
  );
}
