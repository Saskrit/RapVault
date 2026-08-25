"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Music2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
}: BeatPlayerPanelProps) {
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
          setCurrentTime(player.getCurrentTime());
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
                setCurrentTime(event.target.getCurrentTime());
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
  }, [videoId]);

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
    // Leaving an unsaved empty slot → return to last saved beat
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

    // Adding into a new slot (active past end)
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

  const progress =
    duration && duration > 0
      ? Math.min(100, (currentTime / duration) * 100)
      : 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-sidebar">
      {clearedToast && (
        <div
          role="status"
          className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-lg"
        >
          Beat cleared
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
        <Music2 className="h-3 w-3 shrink-0 text-accent" />
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-tight">
          Beats
        </h2>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous beat"
            title="Previous beat"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[2.25rem] text-center text-[10px] font-medium tabular-nums text-muted">
            {displayIndex}/{MAX_BEATS}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next beat"
            title="Next beat"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={addBeatSlot}
              className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted transition hover:border-accent hover:text-accent"
              aria-label="Add another beat"
              title={`Add beat (${beatCount}/${MAX_BEATS})`}
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-foreground lg:hidden"
            aria-label="Hide beat player"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {beatCount > 0 && (
        <div className="flex shrink-0 items-center justify-center gap-1 border-b border-border px-2 py-1">
          {Array.from({ length: MAX_BEATS }).map((_, index) => {
            const filled = index < beatCount;
            const active = showingNewSlot
              ? false
              : filled && index === playlist.active;
            return (
              <button
                key={index}
                type="button"
                disabled={!filled}
                onClick={() => {
                  if (!filled) return;
                  commitPlaylist({ urls: playlist.urls, active: index });
                  setError("");
                }}
                className={`h-1.5 rounded-full transition ${
                  filled
                    ? active
                      ? "w-4 bg-accent"
                      : "w-1.5 bg-muted/70 hover:bg-muted"
                    : "w-1.5 bg-border"
                } disabled:cursor-default`}
                aria-label={
                  filled ? `Play beat ${index + 1}` : `Empty slot ${index + 1}`
                }
                title={filled ? `Beat ${index + 1}` : `Empty (${index + 1}/5)`}
              />
            );
          })}
        </div>
      )}

      {!readOnly && (
        <div className="shrink-0 space-y-0.5 border-b border-border px-2 py-1.5">
          <label
            htmlFor="beat-url"
            className="text-[9px] font-medium uppercase tracking-wide text-muted"
          >
            Paste link
            {showingNewSlot
              ? ` · new beat ${beatCount + 1}/${MAX_BEATS}`
              : beatCount > 0
                ? ` · beat ${playlist.active + 1}`
                : ""}
          </label>
          <div className="flex gap-1">
            <input
              id="beat-url"
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && loadBeatIntoNewOrCurrent()}
              onBlur={() => loadBeatIntoNewOrCurrent()}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (parseYouTubeVideoId(pasted)) {
                  e.preventDefault();
                  setUrlInput(pasted.trim());
                  loadBeatIntoNewOrCurrent(pasted.trim());
                }
              }}
              placeholder="youtube.com/watch?v=…"
              className="min-h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              type="button"
              onClick={clearBeat}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!urlInput && !videoId && beatCount === 0}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted transition hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Clear this beat"
              title="Clear this beat"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {videoId ? (
          <>
            <div className="relative min-h-[8rem] flex-1 bg-black">
              <div
                ref={playerShellRef}
                className="absolute inset-0 h-full w-full overflow-hidden"
              />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-2 py-1">
              <p className="truncate text-[10px] text-muted">
                {readOnly
                  ? `Public · ${playlist.active + 1}/${beatCount}`
                  : `${playlist.active + 1} of ${beatCount} · synced`}
              </p>
              <a
                href={youTubeWatchUrl(videoId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-[10px] text-muted transition hover:text-accent"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                YouTube
              </a>
            </div>
            <div className="flex shrink-0 flex-col gap-1 border-t border-border px-2 py-1.5">
              <p className="text-[9px] font-medium uppercase tracking-wide text-muted">
                Length
              </p>
              {duration !== null ? (
                <>
                  <p className="text-xs font-semibold tabular-nums tracking-tight">
                    <span>0:00 → {formatVideoTime(duration)}</span>
                    <span className="ml-1.5 text-[10px] font-medium text-muted">
                      [{formatVideoTime(currentTime)} –{" "}
                      {formatVideoTime(duration)}]
                    </span>
                  </p>
                  <div className="space-y-1">
                    <div
                      className="h-1 overflow-hidden rounded-full bg-border"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={duration}
                      aria-valuenow={currentTime}
                      aria-label="Beat playback position"
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] tabular-nums text-muted">
                      <span>{formatVideoTime(currentTime)}</span>
                      <span>{formatVideoTime(duration)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-muted">Loading…</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-3 text-center">
            <Music2 className="h-6 w-6 text-border" />
            <p className="max-w-[13rem] text-[11px] leading-relaxed text-muted">
              {showingNewSlot
                ? `Paste beat ${beatCount + 1} of ${MAX_BEATS}.`
                : beatCount > 0
                  ? "This slot is empty — paste a YouTube link."
                  : `Paste a YouTube beat. Add up to ${MAX_BEATS} and switch with the arrows.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
