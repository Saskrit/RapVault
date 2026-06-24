export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  if (cleaned.length <= 3) return 1;

  let w = cleaned.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  w = w.replace(/^y/, "");
  const matches = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, matches?.length ?? 1);
}

export function lastWord(line: string): string {
  const words = line.trim().split(/\s+/).filter(Boolean);
  const raw = words[words.length - 1] ?? "";
  return raw.replace(/[^a-zA-Z']/g, "");
}

export function rhymeKey(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 2) return w;
  return w.slice(-3);
}

export type LyricLineAnalysis = {
  line: string;
  syllables: number;
  endWord: string;
  rhymeKey: string;
  rhymeGroup: number;
};

export function analyzeLyricLines(plainText: string): LyricLineAnalysis[] {
  const lines = plainText.split(/\n/).map((line) => line.trim());
  const analyzed = lines
    .map((line) => {
      if (!line) return null;
      const words = line.split(/\s+/).filter(Boolean);
      const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
      const endWord = lastWord(line);
      return {
        line,
        syllables,
        endWord,
        rhymeKey: rhymeKey(endWord),
        rhymeGroup: -1,
      };
    })
    .filter((item): item is LyricLineAnalysis => item !== null);

  const keyToGroup = new Map<string, number>();
  let nextGroup = 0;

  for (const item of analyzed) {
    if (!item.endWord || item.rhymeKey.length < 2) continue;
    if (!keyToGroup.has(item.rhymeKey)) {
      keyToGroup.set(item.rhymeKey, nextGroup++);
    }
    item.rhymeGroup = keyToGroup.get(item.rhymeKey)!;
  }

  const groupCounts = new Map<number, number>();
  for (const item of analyzed) {
    if (item.rhymeGroup < 0) continue;
    groupCounts.set(item.rhymeGroup, (groupCounts.get(item.rhymeGroup) ?? 0) + 1);
  }

  for (const item of analyzed) {
    if (item.rhymeGroup >= 0 && (groupCounts.get(item.rhymeGroup) ?? 0) < 2) {
      item.rhymeGroup = -1;
    }
  }

  return analyzed;
}

export const RAP_STRUCTURE_LABELS = [
  "[Verse 1]",
  "[Verse 2]",
  "[Hook]",
  "[Bridge]",
  "[Intro]",
  "[Outro]",
  "[8 Bars]",
  "[16 Bars]",
] as const;

export const RHYME_GROUP_COLORS = [
  "text-violet-400",
  "text-sky-400",
  "text-emerald-400",
  "text-amber-400",
  "text-rose-400",
  "text-cyan-400",
  "text-orange-400",
  "text-fuchsia-400",
];
