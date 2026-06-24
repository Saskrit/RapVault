"use client";

import {
  ExternalLink,
  Home,
  Music2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  YOUTUBE_HOME,
  YOUTUBE_WINDOW_NAME,
  navigateYouTubeWindow,
  positionYouTubeWindow,
  resolveYouTubeUrl,
  youtubeWindowFeatures,
  screenRectForElement,
} from "@/lib/youtube-window";

type BeatPlayerPanelProps = {
  songId: string;
  onClose?: () => void;
};

function storageKey(songId: string) {
  return `rapvault-youtube-url-${songId}`;
}

export function BeatPlayerPanel({ songId, onClose }: BeatPlayerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const youtubeWin = useRef<Window | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const syncOpenState = useCallback(() => {
    const open = Boolean(youtubeWin.current && !youtubeWin.current.closed);
    setIsOpen(open);
    if (!open) youtubeWin.current = null;
    return open;
  }, []);

  const alignWindow = useCallback(() => {
    const panel = panelRef.current;
    const win = youtubeWin.current;
    if (!panel || !win || win.closed) return;
    positionYouTubeWindow(win, panel);
  }, []);

  const openYouTube = useCallback(
    (targetUrl?: string) => {
      const panel = panelRef.current;
      if (!panel) return;

      const url = resolveYouTubeUrl(targetUrl ?? query);
      setQuery(url === YOUTUBE_HOME ? "" : url);
      localStorage.setItem(storageKey(songId), url);

      if (youtubeWin.current && !youtubeWin.current.closed) {
        navigateYouTubeWindow(youtubeWin.current, url);
        setIsOpen(true);
        setBlocked(false);
        alignWindow();
        return;
      }

      const { left, top, width, height } = screenRectForElement(panel);
      const features = youtubeWindowFeatures(left, top, width, height);
      const win = window.open(url, YOUTUBE_WINDOW_NAME, features);

      if (!win) {
        setBlocked(true);
        setIsOpen(false);
        return;
      }

      youtubeWin.current = win;
      setBlocked(false);
      setIsOpen(true);
      win.focus();
    },
    [alignWindow, query, songId],
  );

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(songId));
    if (saved) setQuery(saved === YOUTUBE_HOME ? "" : saved);
  }, [songId]);

  useEffect(() => {
    const onResize = () => alignWindow();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const interval = window.setInterval(() => {
      syncOpenState();
      alignWindow();
    }, 400);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.clearInterval(interval);
    };
  }, [alignWindow, syncOpenState]);

  function searchYouTube() {
    openYouTube(query);
  }

  function focusYouTube() {
    if (youtubeWin.current && !youtubeWin.current.closed) {
      youtubeWin.current.focus();
      alignWindow();
    } else {
      openYouTube();
    }
  }

  function closeYouTube() {
    youtubeWin.current?.close();
    youtubeWin.current = null;
    setIsOpen(false);
  }

  return (
    <div ref={panelRef} className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <Music2 className="h-4 w-4 shrink-0 text-accent" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">YouTube</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground lg:hidden"
            aria-label="Hide YouTube panel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ff0000] shadow-lg">
          <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold">Real YouTube beside your lyrics</h3>
          <p className="max-w-xs text-sm text-muted">
            Full youtube.com with your Google account, playlists, and subscriptions.
            Opens in a window aligned to this panel.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchYouTube()}
              placeholder="Search beats or paste YouTube link..."
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={searchYouTube}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:opacity-90"
              aria-label="Search YouTube"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => openYouTube()}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {isOpen ? "Focus YouTube window" : "Open YouTube"}
          </button>
        </div>

        {isOpen && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-400">
              YouTube is open
            </span>
            <button
              type="button"
              onClick={() => openYouTube(YOUTUBE_HOME)}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </button>
            <button
              type="button"
              onClick={focusYouTube}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Align
            </button>
            <button
              type="button"
              onClick={closeYouTube}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-red-400"
            >
              Close
            </button>
          </div>
        )}

        {blocked && (
          <div className="max-w-sm space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <p>Your browser blocked the YouTube window. Allow popups for RapVault, then try again.</p>
            <a
              href={resolveYouTubeUrl(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open YouTube in a new tab
            </a>
          </div>
        )}

        <p className="max-w-xs text-[11px] text-muted">
          YouTube does not allow their site inside other pages. This opens the real youtube.com
          window snapped to the right side while you write.
        </p>
      </div>
    </div>
  );
}
