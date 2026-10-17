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

export const GENIUS_GOLD: ColorStyle = {
  label: "Gold",
  dotClass: "bg-amber-400",
  highlightClass: "bg-[#fff2a8] dark:bg-amber-500/25 text-foreground border-b-2 border-amber-500",
  badgeClass: "hidden",
  tagClass: "bg-amber-50/90 text-amber-900 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  accentHex: "#f59e0b",
  rgbaBg: "rgba(254, 240, 138, 0.6)",
};

export const ANNOTATION_COLORS: Record<AnnotationColor, ColorStyle> = {
  purple: GENIUS_GOLD,
  green: GENIUS_GOLD,
  pink: GENIUS_GOLD,
  amber: GENIUS_GOLD,
  blue: GENIUS_GOLD,
  teal: GENIUS_GOLD,
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
      return `<mark class="rap-annotation-mark" data-annotation-id="${annotation.id}">${cleanInner}</mark>`;
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
      `<mark class="rap-annotation-mark" data-annotation-id="${annotation.id}">$1</mark>`,
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

