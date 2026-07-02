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
};

export function BeatPlayerPanel({ beatUrl, onBeatUrlChange, onClose }: BeatPlayerPanelProps) {
  const [urlInput, setUrlInput] = useState(beatUrl);
  const [videoId, setVideoId] = useState<string | null>(() => parseYouTubeVideoId(beatUrl));
  const [error, setError] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setUrlInput(beatUrl);
    setVideoId(parseYouTubeVideoId(beatUrl));
  }, [beatUrl]);

  useEffect(() => {
    if (!videoId || !playerHostRef.current) return;

    let cancelled = false;

    function stopTick() {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }

    function startTick(player: YT.Player) {
      stopTick();
      tickRef.current = setInterval(() => {
        setCurrentTime(player.getCurrentTime());
      }, 500);
    }

    const id = videoId;

    async function initPlayer() {
      setDuration(null);
      setCurrentTime(0);
      playerRef.current?.destroy();
      playerRef.current = null;

      await loadYouTubeIframeApi();
      if (cancelled || !playerHostRef.current || !window.YT?.Player) return;

      playerRef.current = new window.YT.Player(playerHostRef.current, {
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
              setCurrentTime(event.target.getCurrentTime());
            }
          },
        },
      });
    }

    initPlayer();

    return () => {
      cancelled = true;
      stopTick();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  function loadBeat(input?: string) {
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
    setVideoId(null);
    setUrlInput("");
    setError("");
    setDuration(null);
    setCurrentTime(0);
    onBeatUrlChange("");
  }

  const progress =
    duration && duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
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

      <div className="flex min-h-0 flex-1 flex-col">
        {videoId ? (
          <>
            <div className="relative w-full shrink-0 bg-black pt-[56.25%]">
              <div ref={playerHostRef} className="absolute inset-0 h-full w-full" />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2">
              <p className="truncate text-xs text-muted">Synced to this song</p>
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
                    0:00 → {formatVideoTime(duration)}
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
