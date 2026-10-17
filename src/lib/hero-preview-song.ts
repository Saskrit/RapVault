import { prisma } from "@/lib/prisma";
import { stripRichText } from "@/lib/rich-text";

export type HeroPreviewScriptLine = {
  kind: "tag" | "line" | "blank";
  text: string;
};

export type HeroPreviewSong = {
  id: string;
  title: string;
  status: string;
  isFavorite: boolean;
  isPublic: boolean;
  beatUrl: string;
  username: string | null;
  script: HeroPreviewScriptLine[];
};

const MAX_SCRIPT_ROWS = 10;
const MAX_LINE_CHARS = 72;

export function lyricsToScript(content: string): HeroPreviewScriptLine[] {
  const plain = stripRichText(content);
  const rawLines = plain.split(/\n/);
  const rows: HeroPreviewScriptLine[] = [];

  for (const raw of rawLines) {
    if (rows.length >= MAX_SCRIPT_ROWS) break;
    const trimmed = raw.trim();
    if (!trimmed) {
      if (rows.length > 0 && rows[rows.length - 1]?.kind !== "blank") {
        rows.push({ kind: "blank", text: "" });
      }
      continue;
    }
    const isTag = /^\[[^\]]+\]$/.test(trimmed);
    rows.push({
      kind: isTag ? "tag" : "line",
      text:
        trimmed.length > MAX_LINE_CHARS
          ? `${trimmed.slice(0, MAX_LINE_CHARS - 1)}…`
          : trimmed,
    });
  }

  while (rows.length && rows[rows.length - 1]?.kind === "blank") rows.pop();
  return rows;
}

/** Pick one random finished song with lyrics for the landing hero preview. */
export async function getRandomFinishedHeroSong(
  userId: string,
): Promise<HeroPreviewSong | null> {
  const songs = await prisma.song.findMany({
    where: {
      userId,
      status: "finished",
      deletedAt: null,
      NOT: { content: "" },
    },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      isFavorite: true,
      isPublic: true,
      beatUrl: true,
      user: { select: { username: true, displayName: true } },
    },
    take: 40,
    orderBy: { updatedAt: "desc" },
  });

  const withLyrics = songs.filter((s) => stripRichText(s.content).trim().length > 0);
  if (!withLyrics.length) return null;

  const song = withLyrics[Math.floor(Math.random() * withLyrics.length)]!;
  const script = lyricsToScript(song.content);
  if (!script.length) return null;

  return {
    id: song.id,
    title: song.title.trim() || "Untitled track",
    status: song.status,
    isFavorite: song.isFavorite,
    isPublic: song.isPublic,
    beatUrl: song.beatUrl,
    username: song.user.username || song.user.displayName,
    script,
  };
}
