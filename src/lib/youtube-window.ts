import { parseYouTubeVideoId, youTubeSearchUrl, youTubeWatchUrl } from "@/lib/youtube";

export const YOUTUBE_HOME = "https://www.youtube.com";
export const YOUTUBE_WINDOW_NAME = "rapvault-youtube";

export function resolveYouTubeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return YOUTUBE_HOME;

  const videoId = parseYouTubeVideoId(trimmed);
  if (videoId) return youTubeWatchUrl(videoId);

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return youTubeSearchUrl(trimmed);
}

export function youtubeWindowFeatures(
  left: number,
  top: number,
  width: number,
  height: number,
) {
  return [
    `width=${Math.max(320, Math.round(width))}`,
    `height=${Math.max(400, Math.round(height))}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "scrollbars=yes",
    "resizable=yes",
  ].join(",");
}

export function screenRectForElement(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    left: window.screenX + rect.left,
    top: window.screenY + rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function positionYouTubeWindow(win: Window, el: HTMLElement) {
  const { left, top, width, height } = screenRectForElement(el);
  try {
    win.resizeTo(Math.max(320, Math.round(width)), Math.max(400, Math.round(height)));
    win.moveTo(Math.round(left), Math.round(top));
  } catch {
    /* Some browsers restrict moveTo/resizeTo */
  }
}

export function navigateYouTubeWindow(win: Window | null, url: string) {
  if (!win || win.closed) return false;
  try {
    win.location.href = url;
    win.focus();
    return true;
  } catch {
    return false;
  }
}
