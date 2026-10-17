import { stripRichText } from "@/lib/rich-text";

export type LyricStats = {
  words: number;
  lines: number;
  estimatedSeconds: number;
};

const WORDS_PER_MINUTE = 150;

export function calculateLyricStats(content: string): LyricStats {
  const trimmed = stripRichText(content);
  if (!trimmed) {
    return { words: 0, lines: 0, estimatedSeconds: 0 };
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((words / WORDS_PER_MINUTE) * 60);

  return { words, lines: lines.length, estimatedSeconds };
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}
