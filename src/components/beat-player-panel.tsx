"use client";

import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Music2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  BEAT_BROWSER_HOME,
  type BeatBrowserSite,
  beatBrowserSiteLabel,
  beatBrowserStorageKey,
  resolveBeatBrowserUrl,
} from "@/lib/beat-browser";

type BeatPlayerPanelProps = {
  songId: string;
  onClose?: () => void;
};

type NavState = {
  history: string[];
  index: number;
  url: string;
};

function loadNavState(songId: string, site: BeatBrowserSite): NavState {
  const home = localStorage.getItem(beatBrowserStorageKey(songId, site)) || BEAT_BROWSER_HOME[site];
  return { history: [home], index: 0, url: home };
}

export function BeatPlayerPanel({ songId, onClose }: BeatPlayerPanelProps) {
  const [site, setSite] = useState<BeatBrowserSite>("youtube");
  const [addressInput, setAddressInput] = useState(BEAT_BROWSER_HOME.youtube);
  const [nav, setNav] = useState<NavState>({
    history: [BEAT_BROWSER_HOME.youtube],
    index: 0,
    url: BEAT_BROWSER_HOME.youtube,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const applyNav = useCallback(
    (next: NavState) => {
      setNav(next);
      setAddressInput(next.url);
      localStorage.setItem(beatBrowserStorageKey(songId, site), next.url);
    },
    [songId, site],
  );

  const go = useCallback(
    (raw?: string) => {
      const target = resolveBeatBrowserUrl(raw ?? addressInput, site);
      setNav((prev) => {
        const base = prev.history.slice(0, prev.index + 1);
        if (base[base.length - 1] === target) {
          localStorage.setItem(beatBrowserStorageKey(songId, site), target);
          setAddressInput(target);
          return { ...prev, url: target };
        }
        const history = [...base, target];
        const next = { history, index: history.length - 1, url: target };
        localStorage.setItem(beatBrowserStorageKey(songId, site), target);
        setAddressInput(target);
        return next;
      });
    },
    [addressInput, site, songId],
  );

  const switchSite = useCallback(
    (nextSite: BeatBrowserSite) => {
      setSite(nextSite);
      const next = loadNavState(songId, nextSite);
      applyNav(next);
      setReloadKey(0);
    },
    [applyNav, songId],
  );

  useEffect(() => {
    setSite("youtube");
    applyNav(loadNavState(songId, "youtube"));
    setReloadKey(0);
  }, [songId, applyNav]);

  function goBack() {
    if (nav.index <= 0) return;
    const nextIndex = nav.index - 1;
    applyNav({
      history: nav.history,
      index: nextIndex,
      url: nav.history[nextIndex]!,
    });
  }

  function goForward() {
    if (nav.index >= nav.history.length - 1) return;
    const nextIndex = nav.index + 1;
    applyNav({
      history: nav.history,
      index: nextIndex,
      url: nav.history[nextIndex]!,
    });
  }

  function reload() {
    setReloadKey((key) => key + 1);
  }

  const frameSrc =
    reloadKey > 0
      ? `${nav.url}${nav.url.includes("?") ? "&" : "?"}_=${reloadKey}`
      : nav.url;

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <Music2 className="h-4 w-4 shrink-0 text-accent" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Beat browser</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground lg:hidden"
            aria-label="Hide beat browser"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 gap-1 border-b border-border p-2">
        {(["youtube", "google"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchSite(tab)}
            className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-semibold transition sm:text-sm ${
              site === tab
                ? "bg-accent text-white"
                : "bg-background text-muted hover:text-foreground"
            }`}
          >
            {beatBrowserSiteLabel(tab)}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-border p-2">
        <button
          type="button"
          onClick={goBack}
          disabled={nav.index <= 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground disabled:opacity-30"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goForward}
          disabled={nav.index >= nav.history.length - 1}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground disabled:opacity-30"
          aria-label="Forward"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={reload}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
          aria-label="Reload"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-border bg-background px-2">
          <Globe className="h-3.5 w-3.5 shrink-0 text-muted" />
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") go(addressInput);
            }}
            placeholder={
              site === "youtube"
                ? "Search or paste YouTube link..."
                : "Search Google or paste a link..."
            }
            className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none sm:text-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => go(addressInput)}
          className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-semibold text-white transition hover:opacity-90 sm:px-3 sm:text-sm"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Go</span>
        </button>

        <button
          type="button"
          onClick={() => window.open(nav.url, "_blank", "noopener,noreferrer")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
          aria-label="Open in new tab"
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      <p className="shrink-0 border-b border-border px-3 py-1.5 text-[10px] text-muted sm:text-xs">
        {site === "youtube"
          ? "Browse and play beats here. Paste any YouTube link or search."
          : "Search the web here. Google links open in a compatible search view."}
      </p>

      <div className="relative min-h-0 flex-1 bg-background">
        <iframe
          key={`${site}-${frameSrc}`}
          src={frameSrc}
          title={`${beatBrowserSiteLabel(site)} browser`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}
