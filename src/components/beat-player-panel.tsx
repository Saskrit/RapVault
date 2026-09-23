"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Music2,
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
  parseYouTubeVideoId,
  youTubeWatchUrl,
} from "@/lib/youtube";

const MAX_BEATS = 5;

type BeatPlaylist = {
  urls: string[];
  active: number;
};

type BeatPlayerPanelProps = {
  beatUrl: string;
  onBeatUrlChange: (beatUrl: string) => void;
  onClose?: () => void;
  readOnly?: boolean;
  annotations?: Annotation[];
  activeAnnotationId?: string | null;
  onSelectAnnotation?: (id: string) => void;
  onAddAnnotation?: () => void;
  onEditAnnotation?: (annotation: Annotation) => void;
  onDeleteAnnotation?: (id: string) => void;
  onSetCurrentLineTime?: (timeStr: string) => void;
  onTimeUpdate?: (currentTime: number) => void;
};

function clampActive(active: number, length: number) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(active, length - 1));
}

/** Parse legacy single URL or multi-beat JSON playlist. */
export function parseBeatPlaylist(raw: string): BeatPlaylist {
  const value = raw.trim();
  if (!value) return { urls: [], active: 0 };

  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as
        | { urls?: unknown; active?: unknown }
        | string[];
      if (Array.isArray(parsed)) {
        const urls = parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, MAX_BEATS);
        return { urls, active: 0 };
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
      return { urls, active };
    } catch {
      // Fall through to single-URL parsing.
    }
  }

  return { urls: [value], active: 0 };
}

/** Keep single-URL strings for one beat (backward compatible). */
export function serializeBeatPlaylist(playlist: BeatPlaylist): string {
  const urls = playlist.urls
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, MAX_BEATS);
  if (urls.length === 0) return "";
  if (urls.length === 1) return urls[0]!;
  return JSON.stringify({
    urls,
    active: clampActive(playlist.active, urls.length),
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
  onSetCurrentLineTime,
  onTimeUpdate,
}: BeatPlayerPanelProps) {
  const [activeTab, setActiveTab] = useState<"beats" | "annotations">("beats");
  const [autoScroll, setAutoScroll] = useState(true);

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

  function commitPlaylist(next: BeatPlaylist) {
    const urls = next.urls
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, MAX_BEATS);
    const normalized: BeatPlaylist = {
      urls,
      active: clampActive(next.active, urls.length),
    };
    skipExternalSync.current = true;
    setPlaylist(normalized);
    const active = normalized.urls[normalized.active] ?? "";
    setUrlInput(active);
    setVideoId(parseYouTubeVideoId(active));
    onBeatUrlChange(serializeBeatPlaylist(normalized));
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
    };
  }, []);

  useEffect(() => {
    if (!videoId || !playerShellRef.current) return;

    let cancelled = false;
    const shell = playerShellRef.current;
    // YouTube replaces this node with an iframe — keep it outside React's DOM ownership.
    const host = document.createElement("div");
    host.style.width = "100%";
    host.style.height = "100%";
    shell.replaceChildren(host);

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
          setCurrentTime(t);
          onTimeUpdate?.(t);
        } catch {
          stopTick();
        }
      }, 500);
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
      shell.replaceChildren();
    }

    const id = videoId;

    async function initPlayer() {
      setDuration(null);
      setCurrentTime(0);

      await loadYouTubeIframeApi();
      if (cancelled || !window.YT?.Player || !host.isConnected) return;

      playerRef.current = new window.YT.Player(host, {
        videoId: id,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            const total = event.target.getDuration();
            if (total > 0) setDuration(total);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            const { PlayerState } = window.YT!;
            if (event.data === PlayerState.PLAYING) {
              startTick(event.target);
            } else if (
              event.data === PlayerState.PAUSED ||
              event.data === PlayerState.ENDED
            ) {
              stopTick();
              try {
                const t = event.target.getCurrentTime();
                setCurrentTime(t);
                onTimeUpdate?.(t);
              } catch {
                // Player may already be torn down.
              }
            }
          },
        },
      });
    }

    void initPlayer();

    return () => {
      cancelled = true;
      destroyPlayer();
    };
  }, [videoId, onTimeUpdate]);

  function clearBeat() {
    if (readOnly) return;
    clearingRef.current = true;
    setError("");
    setDuration(null);
    setCurrentTime(0);

    if (playlist.active >= playlist.urls.length) {
      const index = Math.max(0, playlist.urls.length - 1);
      const active = playlist.urls[index] ?? "";
      setPlaylist({
        urls: playlist.urls,
        active: playlist.urls.length === 0 ? 0 : index,
      });
      setUrlInput(active);
      setVideoId(parseYouTubeVideoId(active));
    } else {
      const urls = playlist.urls.filter((_, i) => i !== playlist.active);
      commitPlaylist({
        urls,
        active: clampActive(playlist.active, urls.length),
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
        setPlaylist({ urls: [], active: 0 });
        setUrlInput("");
        setVideoId(null);
        return;
      }
      const index = playlist.urls.length - 1;
      commitPlaylist({ urls: playlist.urls, active: index });
      return;
    }
    if (playlist.urls.length <= 1 || playlist.active <= 0) return;
    commitPlaylist({
      urls: playlist.urls,
      active: playlist.active - 1,
    });
  }

  function goNext() {
    setError("");
    if (playlist.active >= playlist.urls.length) return;
    if (playlist.urls.length <= 1) return;
    if (playlist.active >= playlist.urls.length - 1) return;
    commitPlaylist({
      urls: playlist.urls,
      active: playlist.active + 1,
    });
  }

  function addBeatSlot() {
    if (readOnly || playlist.urls.length >= MAX_BEATS) return;
    setPlaylist({ urls: playlist.urls, active: playlist.urls.length });
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
      commitPlaylist({
        urls: [...playlist.urls, watchUrl],
        active: playlist.urls.length,
      });
      return;
    }

    const urls = [...playlist.urls];
    if (urls.length === 0) {
      commitPlaylist({ urls: [watchUrl], active: 0 });
      return;
    }
    const index = clampActive(playlist.active, urls.length);
    urls[index] = watchUrl;
    commitPlaylist({ urls, active: index });
  }

  const beatCount = playlist.urls.length;
  const showingNewSlot =
    !readOnly && playlist.active >= beatCount && beatCount < MAX_BEATS;
  const displayIndex = showingNewSlot
    ? beatCount + 1
    : beatCount === 0
      ? 0
      : playlist.active + 1;
  const canGoPrev =
    showingNewSlot || (beatCount > 1 && playlist.active > 0);
  const canGoNext =
    !showingNewSlot && beatCount > 1 && playlist.active < beatCount - 1;
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

        {/* Right side beat pagination */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            className="flex h-6 w-6 items-center justify-center rounded text-muted transition hover:bg-sidebar hover:text-foreground disabled:opacity-30"
            aria-label="Previous beat"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-medium tabular-nums text-muted">
            {displayIndex} / {MAX_BEATS}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="flex h-6 w-6 items-center justify-center rounded text-muted transition hover:bg-sidebar hover:text-foreground disabled:opacity-30"
            aria-label="Next beat"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={addBeatSlot}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded border border-border text-muted transition hover:border-amber-600 hover:text-amber-600"
              title="Add another beat"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded text-muted transition hover:bg-sidebar hover:text-foreground lg:hidden"
              aria-label="Close panel"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === "beats" && (
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
                      setUrlInput(e.target.value);
                      if (error) setError("");
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && loadBeatIntoNewOrCurrent()
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full min-h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none transition focus:border-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => loadBeatIntoNewOrCurrent()}
                    className="rap-btn-bronze min-h-9 shrink-0 rounded-lg px-4 py-1.5 text-xs font-semibold shadow-xs active:scale-95"
                  >
                    Load
                  </button>
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
              {videoId ? (
                <div
                  ref={playerShellRef}
                  className="absolute inset-0 h-full w-full overflow-hidden"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500">
                  <Music2 className="h-8 w-8 opacity-40" />
                  <p className="text-xs">Paste a YouTube link above to play beat</p>
                </div>
              )}
            </div>

            {/* Video Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-sidebar/30 px-3 py-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  const stamp = formatVideoTime(currentTime);
                  onSetCurrentLineTime?.(stamp);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-foreground/30 active:scale-95"
              >
                <Clock className="h-3.5 w-3.5 text-muted" />
                <span>Set Current Line Time</span>
              </button>

              <div className="flex items-center gap-1 font-mono text-xs font-medium text-muted">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {formatVideoTime(currentTime)} /{" "}
                  {formatVideoTime(duration || 0)}
                </span>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted">
                <span>Auto Scroll</span>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-amber-700"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === "annotations" && (
          <AnnotationsPanel
            annotations={annotations}
            activeAnnotationId={activeAnnotationId}
            onSelectAnnotation={onSelectAnnotation}
            onAddAnnotation={onAddAnnotation || (() => {})}
            onEditAnnotation={onEditAnnotation || (() => {})}
            onDeleteAnnotation={onDeleteAnnotation || (() => {})}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}
