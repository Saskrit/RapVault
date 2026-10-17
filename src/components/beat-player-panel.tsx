"use client";

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Music2,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnnotationsPanel } from "@/components/annotations-panel";
import type { Annotation } from "@/lib/annotations";
import { loadYouTubeIframeApi } from "@/lib/youtube-iframe-api";
import {
  formatVideoTime,
  parseTimeString,
  parseYouTubeVideoId,
  youTubeWatchUrl,
} from "@/lib/youtube";

const MAX_BEATS = 5;

export const MARK_PRESETS = [
  "Hook",
  "Verse 1",
  "Verse 2",
  "Chorus",
  "Intro",
  "Bridge",
  "Outro",
  "Drop",
] as const;

export type BeatMarker = {
  id: string;
  label: string;
  time: number;
};

export type BeatPlaylist = {
  urls: string[];
  active: number;
  markers?: Record<string, BeatMarker[]>;
};

type BeatPlayerPanelProps = {
  beatUrl: string;
  onBeatUrlChange: (beatUrl: string) => void;
  onClose?: () => void;
  readOnly?: boolean;
  annotations?: Annotation[];
  activeAnnotationId?: string | null;
  onSelectAnnotation?: (id: string | null) => void;
  onAddAnnotation?: () => void;
  onEditAnnotation?: (annotation: Annotation) => void;
  onDeleteAnnotation?: (id: string) => void;
  onTimeUpdate?: (currentTime: number) => void;
  activeTab?: "beats" | "annotations";
  onTabChange?: (tab: "beats" | "annotations") => void;
};

function clampActive(active: number, length: number) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(active, length - 1));
}

/** Parse legacy single URL or multi-beat JSON playlist with markers. */
export function parseBeatPlaylist(raw: string): BeatPlaylist {
  const value = raw.trim();
  if (!value) return { urls: [], active: 0, markers: {} };

  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as
        | {
            urls?: unknown;
            active?: unknown;
            markers?: Record<string, BeatMarker[]>;
          }
        | string[];
      if (Array.isArray(parsed)) {
        const urls = parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, MAX_BEATS);
        return { urls, active: 0, markers: {} };
      }
      const urls = Array.isArray(parsed.urls)
        ? parsed.urls
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, MAX_BEATS)
        : [];
      const active =
        typeof parsed.active === "number" && Number.isFinite(parsed.active)
          ? clampActive(Math.floor(parsed.active), urls.length)
          : 0;
      const markers =
        parsed.markers && typeof parsed.markers === "object"
          ? (parsed.markers as Record<string, BeatMarker[]>)
          : {};
      return { urls, active, markers };
    } catch {
      // Fall through to single-URL parsing.
    }
  }

  return { urls: [value], active: 0, markers: {} };
}

/** Keep single-URL strings for one beat without markers (backward compatible). */
export function serializeBeatPlaylist(playlist: BeatPlaylist): string {
  const urls = playlist.urls
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, MAX_BEATS);
  const markers = playlist.markers || {};
  const hasMarkers = Object.values(markers).some(
    (arr) => Array.isArray(arr) && arr.length > 0,
  );

  if (urls.length === 0 && !hasMarkers) return "";
  if (urls.length === 1 && !hasMarkers) return urls[0]!;

  return JSON.stringify({
    urls,
    active: clampActive(playlist.active, urls.length),
    markers,
  });
}

export function BeatPlayerPanel({
  beatUrl,
  onBeatUrlChange,
  onClose,
  readOnly = false,
  annotations = [],
  activeAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  onTimeUpdate,
  activeTab: controlledTab,
  onTabChange,
}: BeatPlayerPanelProps) {
  const [internalTab, setInternalTab] = useState<"beats" | "annotations">("beats");
  const activeTab = controlledTab ?? internalTab;

  function setActiveTab(tab: "beats" | "annotations") {
    setInternalTab(tab);
    onTabChange?.(tab);
  }

  const [playlist, setPlaylist] = useState<BeatPlaylist>(() =>
    parseBeatPlaylist(beatUrl),
  );
  const activeUrl = playlist.urls[playlist.active] ?? "";
  const [urlInput, setUrlInput] = useState(activeUrl);
  const [videoId, setVideoId] = useState<string | null>(() =>
    parseYouTubeVideoId(activeUrl),
  );
  const [error, setError] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [clearedToast, setClearedToast] = useState(false);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearingRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipExternalSync = useRef(false);
  const autoPlayNextRef = useRef(false);


  // When switching back to the beats tab, ensure the beat is actively playing and not paused
  useEffect(() => {
    if (activeTab !== "beats" || !videoId) return;

    const player = playerRef.current as any;
    if (player && typeof player.playVideo === "function") {
      try {
        const state = player.getPlayerState?.();
        // 1 = PLAYING, 3 = BUFFERING
        if (state !== 1 && state !== 3) {
          player.playVideo();
        }
      } catch {
        // ignore
      }
    }
  }, [activeTab, videoId]);

  function commitPlaylist(next: BeatPlaylist, shouldAutoplay = false) {
    const urls = next.urls
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, MAX_BEATS);
    const normalized: BeatPlaylist = {
      urls,
      active: clampActive(next.active, urls.length),
      markers: next.markers ?? playlist.markers ?? {},
    };
    if (shouldAutoplay) {
      autoPlayNextRef.current = true;
    }
    skipExternalSync.current = true;
    setTimeout(() => {
      skipExternalSync.current = false;
    }, 100);
    setPlaylist(normalized);
    const active = normalized.urls[normalized.active] ?? "";
    setUrlInput(active);
    setVideoId(parseYouTubeVideoId(active));
    onBeatUrlChange(serializeBeatPlaylist(normalized));
  }

  const [isAddingMark, setIsAddingMark] = useState(false);
  const [newMarkLabel, setNewMarkLabel] = useState("Hook");
  const [newMarkTimeStr, setNewMarkTimeStr] = useState("");
  const [markError, setMarkError] = useState("");

  const currentBeatKey = activeUrl || String(playlist.active);
  const currentMarkers: BeatMarker[] = Array.isArray(
    playlist.markers?.[currentBeatKey],
  )
    ? playlist.markers[currentBeatKey]
    : [];

  function seekToTime(seconds: number) {
    if (!playerRef.current) return;
    try {
      const player = playerRef.current as any;
      player.seekTo?.(seconds, true);
      player.playVideo?.();
      setCurrentTime(seconds);
    } catch (err) {
      console.error("Seek error:", err);
    }
  }

  function handleAddMark(e?: React.FormEvent) {
    e?.preventDefault();
    setMarkError("");
    const label = newMarkLabel.trim() || "Mark";
    const timeSeconds = parseTimeString(newMarkTimeStr);
    if (timeSeconds === null || timeSeconds < 0) {
      setMarkError("Enter a valid time (e.g. 0:45 or 1:20)");
      return;
    }

    const newMarker: BeatMarker = {
      id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      time: Math.round(timeSeconds * 10) / 10,
    };

    const updated = [...currentMarkers, newMarker].sort((a, b) => a.time - b.time);
    const nextMarkers = {
      ...(playlist.markers || {}),
      [currentBeatKey]: updated,
    };

    commitPlaylist({
      urls: playlist.urls,
      active: playlist.active,
      markers: nextMarkers,
    });

    setIsAddingMark(false);
    setNewMarkTimeStr("");
  }

  function handleDeleteMark(id: string) {
    const updated = currentMarkers.filter((m) => m.id !== id);
    const nextMarkers = {
      ...(playlist.markers || {}),
      [currentBeatKey]: updated,
    };
    commitPlaylist({
      urls: playlist.urls,
      active: playlist.active,
      markers: nextMarkers,
    });
  }

  useEffect(() => {
    if (skipExternalSync.current) {
      skipExternalSync.current = false;
      return;
    }
    const next = parseBeatPlaylist(beatUrl);
    setPlaylist(next);
    const active = next.urls[next.active] ?? "";
    setUrlInput(active);
    setVideoId(parseYouTubeVideoId(active));
  }, [beatUrl]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!videoId || !playerShellRef.current) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
      try {
        if (playerShellRef.current) {
          playerShellRef.current.innerHTML = "";
        }
      } catch {
        // ignore
      }
      return;
    }

    let cancelled = false;
    const shell = playerShellRef.current;
    const host = document.createElement("div");
    host.style.width = "100%";
    host.style.height = "100%";
    try {
      shell.innerHTML = "";
      shell.appendChild(host);
    } catch {
      // ignore
    }

    function stopTick() {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }

    function startTick(player: YT.Player) {
      stopTick();
      tickRef.current = setInterval(() => {
        try {
          const t = player.getCurrentTime();
          if (typeof t === "number" && !Number.isNaN(t)) {
            setCurrentTime(t);
            onTimeUpdate?.(t);
          }
          const dur = player.getDuration();
          if (typeof dur === "number" && dur > 0) {
            setDuration(dur);
          }
        } catch {
          // ignore
        }
      }, 200);
    }

    function destroyPlayer() {
      stopTick();
      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        try {
          player.destroy();
        } catch {
          // YouTube may already have removed the iframe.
        }
      }
      try {
        if (playerShellRef.current) {
          playerShellRef.current.innerHTML = "";
        }
      } catch {
        // ignore
      }
    }

    const id = videoId;
    const shouldAutoplay = autoPlayNextRef.current;
    autoPlayNextRef.current = false;

    async function initPlayer() {
      setDuration(null);
      setCurrentTime(0);

      await loadYouTubeIframeApi();
      if (cancelled || !window.YT?.Player || !host.isConnected) return;

      try {
        playerRef.current = new window.YT.Player(host, {
          videoId: id,
          width: "100%",
          height: "100%",
          playerVars: {
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            autoplay: shouldAutoplay ? 1 : 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              try {
                const total = event.target.getDuration();
                if (total > 0) setDuration(total);
              } catch {
                // ignore
              }
              if (shouldAutoplay) {
                try {
                  (event.target as any).playVideo?.();
                } catch {
                  // ignore
                }
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = event.data;
              // 1 = PLAYING, 3 = BUFFERING
              if (state === 1 || state === 3) {
                try {
                  const total = event.target.getDuration();
                  if (total > 0) setDuration(total);
                } catch {
                  // ignore
                }
                startTick(event.target);
              } else if (state === 2 || state === 0) {
                // 2 = PAUSED, 0 = ENDED
                stopTick();
                try {
                  const t = event.target.getCurrentTime();
                  if (typeof t === "number" && !Number.isNaN(t)) {
                    setCurrentTime(t);
                    onTimeUpdate?.(t);
                  }
                } catch {
                  // Player may already be torn down.
                }
              }
            },
          },
        });
      } catch (err) {
        console.error("YouTube Player init error:", err);
      }
    }

    void initPlayer();

    // Secondary live status polling to ensure time counter is always responsive
    const monitorInterval = setInterval(() => {
      if (cancelled) return;
      const player = playerRef.current;
      if (!player) return;
      try {
        const p = player as any;
        const state = p.getPlayerState?.();
        if (state === 1) {
          const t = player.getCurrentTime();
          if (typeof t === "number" && !Number.isNaN(t)) {
            setCurrentTime(t);
            onTimeUpdate?.(t);
          }
          const dur = player.getDuration();
          if (typeof dur === "number" && dur > 0) {
            setDuration(dur);
          }
          if (!tickRef.current) {
            startTick(player);
          }
        }
      } catch {
        // ignore
      }
    }, 400);

    return () => {
      cancelled = true;
      clearInterval(monitorInterval);
      destroyPlayer();
    };
  }, [videoId, onTimeUpdate]);

  function clearBeat() {
    if (readOnly) return;
    clearingRef.current = true;
    autoPlayNextRef.current = false;
    setError("");
    setDuration(null);
    setCurrentTime(0);

    if (playlist.active >= playlist.urls.length) {
      const index = Math.max(0, playlist.urls.length - 1);
      const active = playlist.urls[index] ?? "";
      setPlaylist({
        urls: playlist.urls,
        active: playlist.urls.length === 0 ? 0 : index,
        markers: playlist.markers || {},
      });
      setUrlInput(active);
      setVideoId(parseYouTubeVideoId(active));
    } else {
      const urls = playlist.urls.filter((_, i) => i !== playlist.active);
      commitPlaylist({
        urls,
        active: clampActive(playlist.active, urls.length),
        markers: playlist.markers || {},
      });
    }

    setClearedToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setClearedToast(false);
      toastTimerRef.current = null;
    }, 2000);
    window.setTimeout(() => {
      clearingRef.current = false;
    }, 0);
  }

  function goPrev() {
    setError("");
    if (playlist.active >= playlist.urls.length) {
      if (playlist.urls.length === 0) {
        setPlaylist({ urls: [], active: 0, markers: playlist.markers || {} });
        setUrlInput("");
        setVideoId(null);
        return;
      }
      const index = playlist.urls.length - 1;
      commitPlaylist(
        { urls: playlist.urls, active: index, markers: playlist.markers || {} },
        true,
      );
      return;
    }
    if (playlist.urls.length <= 1) return;
    const prevIndex =
      playlist.active > 0 ? playlist.active - 1 : playlist.urls.length - 1;
    commitPlaylist(
      {
        urls: playlist.urls,
        active: prevIndex,
        markers: playlist.markers || {},
      },
      true,
    );
  }

  function goNext() {
    setError("");
    if (playlist.active >= playlist.urls.length) return;
    if (playlist.urls.length <= 1) return;
    const nextIndex =
      playlist.active < playlist.urls.length - 1 ? playlist.active + 1 : 0;
    commitPlaylist(
      {
        urls: playlist.urls,
        active: nextIndex,
        markers: playlist.markers || {},
      },
      true,
    );
  }

  function addBeatSlot() {
    if (readOnly || playlist.urls.length >= MAX_BEATS) return;
    autoPlayNextRef.current = false;
    setPlaylist({
      urls: playlist.urls,
      active: playlist.urls.length,
      markers: playlist.markers || {},
    });
    setUrlInput("");
    setVideoId(null);
    setDuration(null);
    setCurrentTime(0);
    setError("");
  }

  function loadBeatIntoNewOrCurrent(input?: string) {
    if (clearingRef.current || readOnly) return;
    const value = (input ?? urlInput).trim();
    const id = parseYouTubeVideoId(value);
    if (!id) {
      if (value)
        setError(
          "Paste a valid YouTube link (youtube.com/watch, youtu.be, etc.)",
        );
      return;
    }
    const watchUrl = youTubeWatchUrl(id);
    setError("");

    if (
      playlist.active >= playlist.urls.length &&
      playlist.urls.length < MAX_BEATS
    ) {
      commitPlaylist(
        {
          urls: [...playlist.urls, watchUrl],
          active: playlist.urls.length,
        },
        true,
      );
      return;
    }

    const urls = [...playlist.urls];
    if (urls.length === 0) {
      commitPlaylist({ urls: [watchUrl], active: 0 }, true);
      return;
    }
    const index = clampActive(playlist.active, urls.length);
    urls[index] = watchUrl;
    commitPlaylist({ urls, active: index }, true);
  }

  const beatCount = playlist.urls.length;
  const showingNewSlot =
    !readOnly && playlist.active >= beatCount && beatCount < MAX_BEATS;
  const displayIndex = showingNewSlot
    ? beatCount + 1
    : beatCount === 0
      ? 0
      : playlist.active + 1;
  const canGoPrev = showingNewSlot || beatCount > 1;
  const canGoNext = !showingNewSlot && beatCount > 1;
  const canAdd = !readOnly && beatCount < MAX_BEATS && !showingNewSlot;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-card text-foreground">
      {clearedToast && (
        <div
          role="status"
          className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-lg"
        >
          Beat cleared
        </div>
      )}

      {/* Top Tab Bar matching screenshot */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-2 pt-1.5 sm:px-3">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium sm:gap-2">
          {/* Tab: Beats */}
          <button
            type="button"
            onClick={() => setActiveTab("beats")}
            className={`relative flex items-center gap-1.5 px-2.5 py-2 transition-colors ${
              activeTab === "beats"
                ? "font-semibold text-amber-700 dark:text-amber-400"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Music2 className="h-3.5 w-3.5" />
            <span>Beats</span>
            {activeTab === "beats" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 dark:bg-amber-400" />
            )}
          </button>

          {/* Tab: Annotations */}
          <button
            type="button"
            onClick={() => setActiveTab("annotations")}
            className={`relative flex items-center gap-1.5 px-2.5 py-2 transition-colors ${
              activeTab === "annotations"
                ? "font-semibold text-amber-700 dark:text-amber-400"
                : "text-muted hover:text-foreground"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Annotations</span>
            <span className="ml-0.5 rounded-full bg-border px-1.5 py-0.2 text-[10px] font-bold">
              {annotations.length}
            </span>
            {activeTab === "annotations" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 dark:bg-amber-400" />
            )}
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-muted transition hover:bg-sidebar hover:text-foreground lg:hidden"
            aria-label="Close panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Beats Tab Content */}
        <div
          className={`flex flex-col ${
            activeTab === "beats"
              ? "block"
              : "pointer-events-none absolute inset-0 -z-10 h-0 overflow-hidden opacity-0"
          }`}
          aria-hidden={activeTab !== "beats"}
        >
          <div className="flex flex-col">
            {/* Beat URL Input row */}
            {!readOnly && (
              <div className="border-b border-border/70 p-3">
                <label
                  htmlFor="beat-url-input"
                  className="mb-1.5 block text-xs font-semibold text-muted"
                >
                  Paste YouTube link - Beat {displayIndex || 1}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="beat-url-input"
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUrlInput(val);
                      if (error) setError("");
                      if (parseYouTubeVideoId(val)) {
                        loadBeatIntoNewOrCurrent(val);
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      if (parseYouTubeVideoId(pasted)) {
                        setTimeout(() => loadBeatIntoNewOrCurrent(pasted), 20);
                      }
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && loadBeatIntoNewOrCurrent()
                    }
                    placeholder="Paste YouTube link here..."
                    className="w-full min-h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none transition focus:border-amber-600"
                  />
                  {/* Beat Pagination < 2/5 > + (replacing Next Beat button) */}
                  <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-background p-0.5 sm:gap-1 sm:p-1">
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={!canGoPrev}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted transition hover:bg-sidebar hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Previous beat"
                      title="Previous beat"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-1 text-xs font-semibold tabular-nums text-foreground">
                      {displayIndex} / {MAX_BEATS}
                    </span>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canGoNext}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted transition hover:bg-sidebar hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Next beat"
                      title="Next beat"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {canAdd && (
                      <button
                        type="button"
                        onClick={addBeatSlot}
                        className="ml-0.5 flex h-7 w-7 items-center justify-center rounded border border-border text-muted transition hover:border-amber-600 hover:text-amber-600"
                        title="Add another beat"
                        aria-label="Add another beat"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearBeat}
                    title="Clear beat"
                    className="flex min-h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-sidebar hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {error && (
                  <p className="mt-1 text-[11px] font-medium text-red-500">
                    {error}
                  </p>
                )}
              </div>
            )}

            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black">
              <div
                ref={playerShellRef}
                className={`absolute inset-0 h-full w-full overflow-hidden ${
                  videoId ? "block" : "hidden"
                }`}
              />
              {!videoId && (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500">
                  <Music2 className="h-8 w-8 opacity-40" />
                  <p className="text-xs">Paste a YouTube link above to play beat</p>
                </div>
              )}
            </div>

            {/* Live Playback Time */}
            <div className="flex items-center justify-between border-b border-border/80 bg-sidebar/30 px-3 py-2 text-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Playback
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="tabular-nums">
                  {formatVideoTime(currentTime)} / {formatVideoTime(duration || 0)}
                </span>
              </div>
            </div>

            {/* Structure Marks / Timestamps Section (Hook, Verse, etc.) */}
            <div className="border-b border-border/80 p-3">
              <div
                className={`flex items-center justify-between ${
                  isAddingMark || currentMarkers.length > 0 ? "mb-2" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-foreground">
                    Structure Marks
                  </span>
                  {currentMarkers.length > 0 && (
                    <span className="rounded-full bg-sidebar px-1.5 py-0.2 text-[10px] font-bold text-muted">
                      {currentMarkers.length}
                    </span>
                  )}
                </div>

                {!readOnly && videoId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAddingMark) {
                        setNewMarkTimeStr(formatVideoTime(currentTime));
                        setMarkError("");
                      }
                      setIsAddingMark((prev) => !prev);
                    }}
                    className="rap-btn-bronze flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold shadow-xs active:scale-95"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{isAddingMark ? "Cancel" : "Add Mark"}</span>
                  </button>
                )}
              </div>

              {/* Add Mark Form */}
              {isAddingMark && (
                <form
                  onSubmit={handleAddMark}
                  className="mb-3 space-y-2 rounded-lg border border-border bg-sidebar/50 p-2.5 text-xs"
                >
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Type / Section
                    </label>
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {MARK_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNewMarkLabel(preset)}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                            newMarkLabel === preset
                              ? "bg-amber-700 font-semibold text-white dark:bg-amber-500 dark:text-black"
                              : "border border-border/70 bg-background text-muted hover:border-amber-600 hover:text-foreground"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={newMarkLabel}
                      onChange={(e) => setNewMarkLabel(e.target.value)}
                      placeholder="e.g. Hook, Verse 1, Beat Switch..."
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Timestamp (mm:ss)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newMarkTimeStr}
                        onChange={(e) => {
                          setNewMarkTimeStr(e.target.value);
                          if (markError) setMarkError("");
                        }}
                        placeholder="e.g. 0:45 or 1:20"
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-amber-600"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewMarkTimeStr(formatVideoTime(currentTime))
                        }
                        title="Use current playback time"
                        className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted transition hover:border-amber-600 hover:text-foreground"
                      >
                        Current ({formatVideoTime(currentTime)})
                      </button>
                    </div>
                    {markError && (
                      <p className="mt-1 text-[11px] font-medium text-red-500">
                        {markError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMark(false);
                        setMarkError("");
                      }}
                      className="rounded-md px-2.5 py-1 text-xs text-muted hover:bg-sidebar"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rap-btn-bronze rounded-md px-3 py-1 text-xs font-semibold active:scale-95"
                    >
                      Save Mark
                    </button>
                  </div>
                </form>
              )}

              {/* Marks List */}
              {currentMarkers.length > 0 && (
                <div className="space-y-1.5">
                  {currentMarkers.map((marker, index) => {
                    const nextTime = currentMarkers[index + 1]?.time;
                    const isActive =
                      currentTime >= marker.time &&
                      (nextTime === undefined || currentTime < nextTime);

                    return (
                      <div
                        key={marker.id}
                        className={`group flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition ${
                          isActive
                            ? "border-amber-600/70 bg-amber-500/10 text-foreground"
                            : "border-border/60 bg-background hover:border-border hover:bg-sidebar/50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => seekToTime(marker.time)}
                          title={`Play from ${formatVideoTime(marker.time)}`}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <span className="inline-flex items-center gap-1 rounded bg-sidebar px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-amber-700 transition group-hover:bg-amber-600 group-hover:text-white dark:text-amber-400">
                            <Play className="h-2.5 w-2.5 fill-current" />
                            {formatVideoTime(marker.time)}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {marker.label}
                          </span>
                        </button>

                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMark(marker.id)}
                            title="Delete mark"
                            className="flex h-6 w-6 items-center justify-center rounded text-muted opacity-50 transition hover:bg-red-500/10 hover:text-red-500 hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Annotations Tab Content */}
        <div
          className={`flex min-h-0 flex-1 flex-col ${
            activeTab === "annotations"
              ? "block"
              : "pointer-events-none absolute inset-0 -z-10 h-0 overflow-hidden opacity-0"
          }`}
          aria-hidden={activeTab !== "annotations"}
        >
          <AnnotationsPanel
            annotations={annotations}
            activeAnnotationId={activeAnnotationId}
            onSelectAnnotation={onSelectAnnotation}
            onAddAnnotation={onAddAnnotation || (() => {})}
            onEditAnnotation={onEditAnnotation || (() => {})}
            onDeleteAnnotation={onDeleteAnnotation || (() => {})}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
