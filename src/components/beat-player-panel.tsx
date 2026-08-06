"use client";

import { ExternalLink, Music2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadYouTubeIframeApi } from "@/lib/youtube-iframe-api";
import {
  formatVideoTime,
  parseYouTubeVideoId,
  youTubeWatchUrl,
} from "@/lib/youtube";

type BeatPlayerPanelProps = {
  beatUrl: string;
  onBeatUrlChange: (beatUrl: string) => void;
  onClose?: () => void;
  readOnly?: boolean;
};

export function BeatPlayerPanel({
  beatUrl,
  onBeatUrlChange,
  onClose,
  readOnly = false,
}: BeatPlayerPanelProps) {
  const [urlInput, setUrlInput] = useState(beatUrl);
  const [videoId, setVideoId] = useState<string | null>(() => parseYouTubeVideoId(beatUrl));
  const [error, setError] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [clearedToast, setClearedToast] = useState(false);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearingRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUrlInput(beatUrl);
    setVideoId(parseYouTubeVideoId(beatUrl));
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

    initPlayer();

    return () => {
      cancelled = true;
      destroyPlayer();
    };
  }, [videoId]);

  function loadBeat(input?: string) {
    if (clearingRef.current) return;

    const value = (input ?? urlInput).trim();
    const id = parseYouTubeVideoId(value);

    if (!id) {
      if (value) setError("Paste a valid YouTube link (youtube.com/watch, youtu.be, etc.)");
      return;
    }

    const watchUrl = youTubeWatchUrl(id);
    setError("");
    setVideoId(id);
    setUrlInput(watchUrl);
    onBeatUrlChange(watchUrl);
  }

  function clearBeat() {
    clearingRef.current = true;
    setVideoId(null);
    setUrlInput("");
    setError("");
    setDuration(null);
    setCurrentTime(0);
    onBeatUrlChange("");
    setClearedToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setClearedToast(false);
      toastTimerRef.current = null;
    }, 2000);
    // Blur from the trash click can fire loadBeat with the old URL — ignore briefly.
    window.setTimeout(() => {
      clearingRef.current = false;
    }, 0);
  }

  const progress =
    duration && duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-sidebar">
      {clearedToast && (
        <div
          role="status"
          className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg"
        >
          Beat cleared
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <Music2 className="h-4 w-4 shrink-0 text-accent" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Beat player</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground lg:hidden"
            aria-label="Hide beat player"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!readOnly && (
      <div className="shrink-0 space-y-1.5 border-b border-border p-3">
        <label htmlFor="beat-url" className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Paste beat link
        </label>
        <div className="flex gap-2">
          <input
            id="beat-url"
            type="url"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && loadBeat()}
            onBlur={() => loadBeat()}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (parseYouTubeVideoId(pasted)) {
                e.preventDefault();
                setUrlInput(pasted.trim());
                loadBeat(pasted.trim());
              }
            }}
            placeholder="https://youtube.com/watch?v=..."
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            type="button"
            onClick={clearBeat}
            onMouseDown={(e) => e.preventDefault()}
            disabled={!urlInput && !videoId}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Clear beat"
            title="Clear beat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {videoId ? (
          <>
            <div className="relative w-full shrink-0 bg-black pt-[56.25%]">
              <div ref={playerShellRef} className="absolute inset-0 h-full w-full overflow-hidden" />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2">
              <p className="truncate text-xs text-muted">
                {readOnly ? "Public beat" : "Synced to this song"}
              </p>
              <a
                href={youTubeWatchUrl(videoId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-xs text-muted transition hover:text-accent"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open on YouTube
              </a>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 border-t border-border px-3 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Beat length
              </p>
              {duration !== null ? (
                <>
                  <p className="text-xl font-semibold tabular-nums tracking-tight">
                    <span>0:00 → {formatVideoTime(duration)}</span>
                    <span className="ml-2 font-medium text-muted">
                      [{formatVideoTime(currentTime)} – {formatVideoTime(duration)}]
                    </span>
                  </p>
                  <div className="space-y-1.5">
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-border"
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
                    <div className="flex justify-between text-xs tabular-nums text-muted">
                      <span>{formatVideoTime(currentTime)}</span>
                      <span>{formatVideoTime(duration)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">Loading duration…</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <Music2 className="h-10 w-10 text-border" />
            <p className="text-sm text-muted">
              Paste a YouTube beat link above. It saves to this song on all your devices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
