import { parseYouTubeVideoId } from "@/lib/youtube";

export type BeatBrowserSite = "youtube" | "google";

export const BEAT_BROWSER_HOME: Record<BeatBrowserSite, string> = {
  youtube: "https://piped.video",
  google: "https://html.duckduckgo.com/html/",
};

export function beatBrowserSiteLabel(site: BeatBrowserSite) {
  return site === "youtube" ? "YouTube" : "Google";
}

export function resolveBeatBrowserUrl(input: string, site: BeatBrowserSite): string {
  const trimmed = input.trim();
  if (!trimmed) return BEAT_BROWSER_HOME[site];

  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeBeatBrowserUrl(trimmed, site);
  }

  if (site === "youtube") {
    return `https://piped.video/search?q=${encodeURIComponent(trimmed)}`;
  }

  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
}

function normalizeBeatBrowserUrl(url: string, site: BeatBrowserSite): string {
  const videoId = parseYouTubeVideoId(url);
  if (videoId) {
    return `https://piped.video/watch?v=${videoId}`;
  }

  if (site === "youtube") {
    if (/youtube\.com\/results/i.test(url)) {
      const query = new URL(url).searchParams.get("search_query");
      if (query) {
        return `https://piped.video/search?q=${encodeURIComponent(query)}`;
      }
    }

    if (/piped\.video/i.test(url) || /piped\.adminforge\.de/i.test(url)) {
      return url;
    }
  }

  if (site === "google") {
    if (/google\.com\/search/i.test(url)) {
      const query = new URL(url).searchParams.get("q");
      if (query) {
        return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      }
    }

    if (/duckduckgo\.com/i.test(url)) {
      return url;
    }

    if (!/duckduckgo\.com/i.test(url) && !/google\.com/i.test(url)) {
      return url;
    }
  }

  return url;
}

export function beatBrowserStorageKey(songId: string, site: BeatBrowserSite) {
  return `rapvault-beat-browser-${songId}-${site}`;
}
