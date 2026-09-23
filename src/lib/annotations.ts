export type AnnotationColor =
  | "purple"
  | "green"
  | "pink"
  | "amber"
  | "blue"
  | "teal";

export type Annotation = {
  id: string;
  songId?: string;
  text: string;
  explanation: string;
  timestamp?: string; // e.g. "0:12"
  color: AnnotationColor;
  authorName: string;
  authorAvatar?: string | null;
  createdAt: string;
  updatedAt?: string;
  commentsCount?: number;
};

export type ColorStyle = {
  label: string;
  dotClass: string;
  highlightClass: string;
  badgeClass: string;
  tagClass: string;
  accentHex: string;
  rgbaBg: string;
};

export const ANNOTATION_COLORS: Record<AnnotationColor, ColorStyle> = {
  purple: {
    label: "Purple",
    dotClass: "bg-purple-500",
    highlightClass: "bg-purple-500/15 text-purple-950 dark:text-purple-100 border-b border-purple-400 dark:border-purple-500",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
    tagClass: "bg-purple-50/90 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    accentHex: "#a855f7",
    rgbaBg: "rgba(168, 85, 247, 0.16)",
  },
  green: {
    label: "Green",
    dotClass: "bg-emerald-500",
    highlightClass: "bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 border-b border-emerald-400 dark:border-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    tagClass: "bg-emerald-50/90 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    accentHex: "#22c55e",
    rgbaBg: "rgba(34, 197, 94, 0.16)",
  },
  pink: {
    label: "Pink",
    dotClass: "bg-rose-500",
    highlightClass: "bg-rose-500/15 text-rose-950 dark:text-rose-100 border-b border-rose-400 dark:border-rose-500",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
    tagClass: "bg-rose-50/90 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    accentHex: "#f43f5e",
    rgbaBg: "rgba(244, 63, 94, 0.16)",
  },
  amber: {
    label: "Amber",
    dotClass: "bg-amber-500",
    highlightClass: "bg-amber-500/15 text-amber-950 dark:text-amber-100 border-b border-amber-400 dark:border-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    tagClass: "bg-amber-50/90 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    accentHex: "#f59e0b",
    rgbaBg: "rgba(245, 158, 11, 0.16)",
  },
  blue: {
    label: "Blue",
    dotClass: "bg-blue-500",
    highlightClass: "bg-blue-500/15 text-blue-950 dark:text-blue-100 border-b border-blue-400 dark:border-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    tagClass: "bg-blue-50/90 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
    accentHex: "#3b82f6",
    rgbaBg: "rgba(59, 130, 246, 0.16)",
  },
  teal: {
    label: "Teal",
    dotClass: "bg-teal-500",
    highlightClass: "bg-teal-500/15 text-teal-950 dark:text-teal-100 border-b border-teal-400 dark:border-teal-500",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800",
    tagClass: "bg-teal-50/90 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
    accentHex: "#14b8a6",
    rgbaBg: "rgba(20, 184, 166, 0.16)",
  },
};

export function parseAnnotations(raw?: string | null): Annotation[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Annotation =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        typeof item.explanation === "string",
    );
  } catch {
    return [];
  }
}

export function serializeAnnotations(annotations: Annotation[]): string {
  return JSON.stringify(annotations);
}

export function formatVideoTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatRelativeTime(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "recently";
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  return date.toLocaleDateString();
}

/** Preload sample annotations shown in reference screenshot if lyrics match or for demonstration */
export function getReferenceDemoAnnotations(): Annotation[] {
  return [
    {
      id: "ann-demo-1",
      text: "satya music taste kati lai Flavour bitter,",
      explanation:
        "Many people's music taste is true and real, but for some people it has a bitter flavour.",
      timestamp: "0:12",
      color: "purple",
      authorName: "@saskreet",
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      commentsCount: 2,
    },
    {
      id: "ann-demo-2",
      text: "been bajaudai nikalxu sarpa, gwak gwak parxu hath hali on your throat",
      explanation:
        'Like a snake coming out to the sound of a been, I strike with a "gwak gwak" sound, grabbing your throat.',
      timestamp: "0:28",
      color: "green",
      authorName: "@saskreet",
      createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      commentsCount: 1,
    },
    {
      id: "ann-demo-3",
      text: "2din ko sukka roti jastai mero boli ekdam kadak kadak,",
      explanation:
        "My words are as hard as a dry roti left for two days — super tough.",
      timestamp: "0:46",
      color: "pink",
      authorName: "@saskreet",
      createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      commentsCount: 1,
    },
  ];
}

export function wrapLyricWithAnnotation(
  content: string,
  annotation: Annotation,
): string {
  const badgeHtml = `<span class="rap-annotation-badge" contenteditable="false" data-annotation-id="${annotation.id}">💬 ${annotation.commentsCount || 1}</span>`;
  const escapedId = annotation.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existingRegex = new RegExp(
    `<mark\\b[^>]*\\bdata-annotation-id=["']?${escapedId}["']?[^>]*>([\\s\\S]*?)<\\/mark>`,
    "i",
  );

  if (existingRegex.test(content)) {
    return content.replace(existingRegex, (_match, inner) => {
      const cleanInner = inner.replace(
        /<span\b[^>]*\bclass=["'][^"']*rap-annotation-badge[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
        "",
      );
      return `<mark class="rap-annotation-mark" data-annotation-id="${annotation.id}" data-color="${annotation.color}">${cleanInner}${badgeHtml}</mark>`;
    });
  }

  const snippet = annotation.text.trim();
  if (!snippet) return content;

  // Escape special regex chars
  const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "i");
  if (regex.test(content)) {
    return content.replace(
      regex,
      `<mark class="rap-annotation-mark" data-annotation-id="${annotation.id}" data-color="${annotation.color}">$1${badgeHtml}</mark>`,
    );
  }

  return content;
}

export function unwrapLyricAnnotation(
  content: string,
  annotationId: string,
): string {
  const escapedId = annotationId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const markRegex = new RegExp(
    `<mark\\b[^>]*\\bdata-annotation-id=["']?${escapedId}["']?[^>]*>([\\s\\S]*?)<\\/mark>`,
    "gi",
  );

  let unwrapped = content.replace(markRegex, (_match, inner) => {
    return inner.replace(
      /<span\b[^>]*\bclass=["'][^"']*rap-annotation-badge[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
      "",
    );
  });

  // Also clean up any orphan badge that might exist for this annotation ID
  unwrapped = unwrapped.replace(
    new RegExp(
      `<span\\b[^>]*\\bdata-annotation-id=["']?${escapedId}["']?[^>]*>[\\s\\S]*?<\\/span>`,
      "gi",
    ),
    "",
  );

  return unwrapped;
}

