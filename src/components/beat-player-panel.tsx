"use client";

import { ExternalLink, Music2, Play, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  parseYouTubeVideoId,
  youTubeEmbedUrl,
  youTubeSearchEmbedUrl,
  youTubeSearchUrl,
  youTubeWatchUrl,
} from "@/lib/youtube";

type BeatPlayerPanelProps = {
  songId: string;
  onClose?: () => void;
};

type BeatMode = "video" | "search";

type RecentBeat = {
  label: string;
  embedUrl: string;
  mode: BeatMode;
};

const RECENT_KEY = "rapvault-beat-recent";
const MAX_RECENT = 6;

function beatStorageKey(songId: string) {
  return `rapvault-beat-${songId}`;
}

function loadRecent(): RecentBeat[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentBeat[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(entry: RecentBeat) {
  const existing = loadRecent().filter((item) => item.embedUrl !== entry.embedUrl);
  localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...existing].slice(0, MAX_RECENT)));
}

export function BeatPlayerPanel({ songId, onClose }: BeatPlayerPanelProps) {
  const [urlInput, setUrlInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<BeatMode>("video");
  const [recent, setRecent] = useState<RecentBeat[]>([]);

  const applyBeat = useCallback(
    (nextEmbedUrl: string, nextMode: BeatMode, label: string) => {
      setEmbedUrl(nextEmbedUrl);
      setMode(nextMode);
      localStorage.setItem(beatStorageKey(songId), JSON.stringify({ embedUrl: nextEmbedUrl, mode: nextMode }));
      const entry = { label, embedUrl: nextEmbedUrl, mode: nextMode };
      saveRecent(entry);
      setRecent(loadRecent());
    },
    [songId],
  );

  useEffect(() => {
    setRecent(loadRecent());
    try {
      const saved = localStorage.getItem(beatStorageKey(songId));
      if (!saved) return;
      const parsed = JSON.parse(saved) as { embedUrl?: string; mode?: BeatMode };
      if (parsed.embedUrl) {
        setEmbedUrl(parsed.embedUrl);
        setMode(parsed.mode === "search" ? "search" : "video");
      }
    } catch {
      /* ignore */
    }
  }, [songId]);

  function loadFromUrl() {
    const videoId = parseYouTubeVideoId(urlInput);
    if (!videoId) return;
    applyBeat(youTubeEmbedUrl(videoId), "video", `YouTube · ${videoId}`);
    setUrlInput(youTubeWatchUrl(videoId));
  }

  function loadFromSearch() {
    const query = searchInput.trim();
    if (!query) return;
    applyBeat(youTubeSearchEmbedUrl(query), "search", `Search · ${query}`);
  }

  function openExternalSearch() {
    const query = searchInput.trim() || "type beat instrumental";
    window.open(youTubeSearchUrl(query), "_blank", "noopener,noreferrer");
  }

  const videoId = parseYouTubeVideoId(urlInput);

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

      <div className="shrink-0 space-y-3 border-b border-border p-3">
        <div className="space-y-1.5">
          <label htmlFor="beat-url" className="text-[11px] font-medium uppercase tracking-wide text-muted">
            YouTube link
          </label>
          <div className="flex gap-2">
            <input
              id="beat-url"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadFromUrl()}
              placeholder="Paste youtube.com/watch?v=..."
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              type="button"
              onClick={loadFromUrl}
              disabled={!videoId}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Load</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="beat-search" className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Search beats
          </label>
          <div className="flex gap-2">
            <input
              id="beat-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadFromSearch()}
              placeholder="trap beat, drill type beat..."
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              type="button"
              onClick={loadFromSearch}
              disabled={!searchInput.trim()}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Play</span>
            </button>
          </div>
          <button
            type="button"
            onClick={openExternalSearch}
            className="flex items-center gap-1 text-xs text-muted transition hover:text-accent"
          >
            <ExternalLink className="h-3 w-3" />
            Browse more on YouTube
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        {embedUrl ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={mode === "search" ? "YouTube beat search" : "YouTube beat player"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
            <Music2 className="h-8 w-8 text-border" />
            <p>Paste a YouTube beat link or search to start listening while you write.</p>
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="shrink-0 border-t border-border p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Recent</p>
          <ul className="space-y-1">
            {recent.map((item) => (
              <li key={item.embedUrl}>
                <button
                  type="button"
                  onClick={() => {
                    setEmbedUrl(item.embedUrl);
                    setMode(item.mode);
                    localStorage.setItem(
                      beatStorageKey(songId),
                      JSON.stringify({ embedUrl: item.embedUrl, mode: item.mode }),
                    );
                  }}
                  className="w-full truncate rounded-lg px-2 py-1.5 text-left text-xs text-muted transition hover:bg-background hover:text-foreground"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
