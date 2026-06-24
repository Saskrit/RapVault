"use client";

import { ExternalLink, Music2, Play, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  parseYouTubeVideoId,
  youTubeEmbedUrl,
  youTubeWatchUrl,
} from "@/lib/youtube";

type BeatPlayerPanelProps = {
  songId: string;
  onClose?: () => void;
};

function storageKey(songId: string) {
  return `rapvault-beat-video-${songId}`;
}

export function BeatPlayerPanel({ songId, onClose }: BeatPlayerPanelProps) {
  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadBeat = useCallback(
    (input?: string) => {
      const value = (input ?? urlInput).trim();
      const id = parseYouTubeVideoId(value);

      if (!id) {
        setError("Paste a valid YouTube link (youtube.com/watch, youtu.be, etc.)");
        return;
      }

      setError("");
      setVideoId(id);
      setUrlInput(youTubeWatchUrl(id));
      localStorage.setItem(storageKey(songId), id);
    },
    [songId, urlInput],
  );

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(songId));
    if (saved && parseYouTubeVideoId(saved)) {
      setVideoId(saved);
      setUrlInput(youTubeWatchUrl(saved));
    } else {
      setVideoId(null);
      setUrlInput("");
    }
  }, [songId]);

  function clearBeat() {
    setVideoId(null);
    setUrlInput("");
    setError("");
    localStorage.removeItem(storageKey(songId));
  }

  const parsedId = parseYouTubeVideoId(urlInput);

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

      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <label htmlFor="beat-url" className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Paste beat link
        </label>
        <input
          id="beat-url"
          type="url"
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && loadBeat()}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (parseYouTubeVideoId(pasted)) {
              e.preventDefault();
              setUrlInput(pasted.trim());
              loadBeat(pasted.trim());
            }
          }}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadBeat()}
            disabled={!parsedId}
            className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            Play beat
          </button>
          {videoId && (
            <button
              type="button"
              onClick={clearBeat}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition hover:border-red-500/50 hover:text-red-400"
              aria-label="Clear beat"
              title="Clear beat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {videoId ? (
          <>
            <div className="relative w-full shrink-0 bg-black pt-[56.25%]">
              <iframe
                key={videoId}
                src={youTubeEmbedUrl(videoId)}
                title="Beat player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2">
              <p className="truncate text-xs text-muted">Now playing</p>
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
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <Music2 className="h-10 w-10 text-border" />
            <p className="text-sm text-muted">
              Paste a YouTube beat link above to play it while you write.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
