"use client";

import {
  Bold,
  Check,
  ChevronDown,
  Italic,
  Lightbulb,
  Link,
  List,
  ListOrdered,
  Lock,
  Palette,
  Quote,
  Redo2,
  Underline,
  Undo2,
  Unlock,
  Wrench,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { Modal } from "@/components/modal";
import {
  RAP_STRUCTURE_LABELS,
} from "@/lib/lyric-tools";
import { contentToHtml } from "@/lib/rich-text";
import {
  preferenceStorageGet,
  preferenceStorageSet,
} from "@/lib/safe-storage";
import {
  ANNOTATION_COLORS,
  type Annotation,
} from "@/lib/annotations";

type LyricRichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  spellCheck?: boolean;
  onSpellCheckChange?: (enabled: boolean) => void;
  /** Sticky horizontal status bar at the bottom of the editor (words, lines, save). */
  footerStats?: ReactNode;
  /**
   * Hex color for this writer's new text.
   * Collaborators pick one; owners leave unset (default theme color).
   */
  writerColor?: string | null;
  /** When true, collaborator can pick one writing color from the palette. */
  canChooseWriterColor?: boolean;
  /** Show a small “your color” hint when collaborating */
  writerLabel?: string | null;
  /** Trigger annotation on current selection */
  onTriggerAnnotate?: (selectedText: string) => void;
  /** Currently selected/focused annotation id */
  activeAnnotationId?: string | null;
  /** Callback when user clicks an annotated lyric in the editor */
  onAnnotationClick?: (annotationId: string) => void;
  /** Annotations array for track */
  annotations?: Annotation[];
  /** Callback to close the annotation meaning card */
  onCloseAnnotation?: () => void;
  /** Callback to edit an annotation */
  onEditAnnotation?: (annotation: Annotation) => void;
  /** Callback to delete an annotation */
  onDeleteAnnotation?: (id: string) => void;
  /** Whether editor is read-only */
  readOnly?: boolean;
};

const toolBtn =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted transition hover:border-border hover:bg-background hover:text-foreground active:scale-95 lg:h-9 lg:w-9 lg:rounded-lg";

const structureBtn =
  "shrink-0 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent active:scale-95 lg:rounded-lg lg:px-2.5 lg:py-1.5";

const FONT_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28] as const;
const DEFAULT_FONT_SIZE = 16;
const FONT_SIZE_KEY = "rapvault-lyric-font-size";

/** Default collaborator write color (first palette option). */
export const COLLAB_WRITER_COLOR = "#3b82f6";

/** Curated collaborator writing colors (56 options across the spectrum). */
export const COLLAB_COLORS = [
  // Neutrals
  { hex: "#000000", name: "Black" },
  { hex: "#171717", name: "Near Black" },
  { hex: "#404040", name: "Charcoal" },
  { hex: "#737373", name: "Stone Gray" },
  { hex: "#a3a3a3", name: "Silver" },
  { hex: "#e5e5e5", name: "Light Gray" },
  { hex: "#ffffff", name: "White" },
  { hex: "#fafafa", name: "Snow" },

  // Blues
  { hex: "#1e3a8a", name: "Navy Blue" },
  { hex: "#1d4ed8", name: "Strong Blue" },
  { hex: "#2563eb", name: "Cobalt Blue" },
  { hex: "#3b82f6", name: "Royal Blue" },
  { hex: "#60a5fa", name: "Soft Blue" },
  { hex: "#0284c7", name: "Sky Blue" },
  { hex: "#0ea5e9", name: "Bright Sky" },
  { hex: "#38bdf8", name: "Ice Blue" },

  // Cyans & Teals
  { hex: "#155e75", name: "Deep Ocean" },
  { hex: "#0891b2", name: "Deep Cyan" },
  { hex: "#06b6d4", name: "Ocean Cyan" },
  { hex: "#22d3ee", name: "Bright Cyan" },
  { hex: "#0f766e", name: "Pine Teal" },
  { hex: "#0d9488", name: "Deep Teal" },
  { hex: "#14b8a6", name: "Aqua Teal" },
  { hex: "#2dd4bf", name: "Mint Teal" },

  // Greens
  { hex: "#14532d", name: "Hunter Green" },
  { hex: "#166534", name: "Pine Green" },
  { hex: "#15803d", name: "Garden Green" },
  { hex: "#16a34a", name: "Leaf Green" },
  { hex: "#22c55e", name: "Vivid Green" },
  { hex: "#4ade80", name: "Fresh Green" },
  { hex: "#65a30d", name: "Olive Lime" },
  { hex: "#84cc16", name: "Bright Lime" },

  // Yellows & Golds
  { hex: "#854d0e", name: "Bronze" },
  { hex: "#a16207", name: "Mustard" },
  { hex: "#ca8a04", name: "Golden Amber" },
  { hex: "#eab308", name: "Pure Yellow" },
  { hex: "#facc15", name: "Sun Yellow" },
  { hex: "#fde047", name: "Soft Yellow" },

  // Oranges & Ambers
  { hex: "#9a3412", name: "Rust" },
  { hex: "#c2410c", name: "Copper Orange" },
  { hex: "#ea580c", name: "Burnt Orange" },
  { hex: "#f97316", name: "Tangerine" },
  { hex: "#fb923c", name: "Peach Orange" },
  { hex: "#d97706", name: "Warm Amber" },
  { hex: "#f59e0b", name: "Sunny Gold" },
  { hex: "#fbbf24", name: "Honey" },

  // Reds & Roses
  { hex: "#7f1d1d", name: "Blood Red" },
  { hex: "#991b1b", name: "Dark Crimson" },
  { hex: "#b91c1c", name: "Brick Red" },
  { hex: "#dc2626", name: "Ruby Red" },
  { hex: "#ef4444", name: "Crimson Red" },
  { hex: "#f87171", name: "Coral Red" },
  { hex: "#e11d48", name: "Deep Rose" },
  { hex: "#f43f5e", name: "Vibrant Rose" },

  // Pinks & Magentas
  { hex: "#9d174d", name: "Berry" },
  { hex: "#be185d", name: "Raspberry" },
  { hex: "#db2777", name: "Magenta" },
  { hex: "#ec4899", name: "Hot Pink" },
  { hex: "#f472b6", name: "Soft Pink" },
  { hex: "#f9a8d4", name: "Blush Pink" },

  // Purples, Violets & Indigos
  { hex: "#581c87", name: "Deep Plum" },
  { hex: "#6b21a8", name: "Grape" },
  { hex: "#7e22ce", name: "Orchid Purple" },
  { hex: "#9333ea", name: "Royal Purple" },
  { hex: "#a855f7", name: "Bright Purple" },
  { hex: "#8b5cf6", name: "Electric Violet" },
  { hex: "#7c3aed", name: "RapVault Violet" },
  { hex: "#6366f1", name: "Indigo Blue" },
  { hex: "#818cf8", name: "Soft Indigo" },
  { hex: "#a5b4fc", name: "Lavender Blue" },

  // Browns & Earth
  { hex: "#44403c", name: "Espresso" },
  { hex: "#78716c", name: "Warm Gray" },
  { hex: "#92400e", name: "Coffee" },
  { hex: "#b45309", name: "Cinnamon" },
  { hex: "#a8a29e", name: "Taupe" },
  { hex: "#d6d3d1", name: "Sand" },
] as const;

/** Colors collaborators may choose (one at a time). Owners stay on default. */
export const COLLAB_COLOR_OPTIONS = COLLAB_COLORS.map((c) => c.hex);

const COLLAB_COLOR_KEY = "rapvault-collab-write-color";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getOwnerForegroundColor() {
  if (typeof window === "undefined") return "#18181b";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim();
  return value || "#18181b";
}

function parseCssColorToRgb(input: string): { r: number; g: number; b: number } | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.length === 6
          ? hex
          : null;
    if (!full) return null;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
  const rgb = value.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
  );
  if (!rgb) return null;
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function colorsClose(a: string, b: string, tolerance = 12) {
  const left = parseCssColorToRgb(a);
  const right = parseCssColorToRgb(b);
  if (!left || !right) return false;
  return (
    Math.abs(left.r - right.r) <= tolerance &&
    Math.abs(left.g - right.g) <= tolerance &&
    Math.abs(left.b - right.b) <= tolerance
  );
}

function matchCollabPaletteColor(color: string): string | null {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return null;
  const hex = rgbToHex(rgb).toLowerCase();

  // 1. Direct exact hex match
  const exact = COLLAB_COLOR_OPTIONS.find(
    (option) => option.toLowerCase() === hex,
  );
  if (exact) return exact;

  // 2. Nearest palette option within acceptable tolerance
  let bestMatch: string | null = null;
  let minDiff = 45;
  for (const option of COLLAB_COLOR_OPTIONS) {
    const optRgb = parseCssColorToRgb(option);
    if (!optRgb) continue;
    const diff =
      Math.abs(rgb.r - optRgb.r) +
      Math.abs(rgb.g - optRgb.g) +
      Math.abs(rgb.b - optRgb.b);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = option;
    }
  }
  return bestMatch;
}

function isCollabPaletteColor(color: string) {
  return matchCollabPaletteColor(color) !== null;
}

function loadSavedCollabColor(): string | null {
  const saved = preferenceStorageGet(COLLAB_COLOR_KEY);
  if (saved === "default") return null;
  if (saved && isCollabPaletteColor(saved)) {
    return matchCollabPaletteColor(saved)!;
  }
  return COLLAB_WRITER_COLOR;
}

/** Keep collaborator-colored text visible for every viewer (owner + invitee). */
function preserveCollabColors(root: HTMLElement) {
  root
    .querySelectorAll("font[color], span[style*='color'], [data-writer='collab']")
    .forEach((node) => {
      const el = node as HTMLElement;
      if (el.getAttribute("data-writer") === "owner") return;

      const raw =
        el.style.color ||
        el.getAttribute("color") ||
        (el.getAttribute("data-writer") === "collab"
          ? COLLAB_WRITER_COLOR
          : "");
      if (!raw) return;

      const marked = el.getAttribute("data-writer") === "collab";
      const palette = matchCollabPaletteColor(raw);
      if (!marked && !palette) return;

      const hex =
        palette ||
        (() => {
          const rgb = parseCssColorToRgb(raw);
          return rgb ? rgbToHex(rgb) : COLLAB_WRITER_COLOR;
        })();

      el.setAttribute("data-writer", "collab");
      el.style.color = hex;
      if (el.tagName === "FONT") {
        el.removeAttribute("color");
      }
    });
}

function ensureLinksOpenInNewTab(root: HTMLElement) {
  root.querySelectorAll("a[href]").forEach((node) => {
    const anchor = node as HTMLAnchorElement;
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  });
}

function isLikelyUrl(text: string) {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) return true;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/[^\s]*)?$/i.test(
    trimmed,
  );
}

function normalizeLinkUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function saveSelection(container: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  preRange.setEnd(range.endContainer, range.endOffset);
  return { start, end: preRange.toString().length };
}

function restoreSelection(
  container: HTMLElement,
  saved: { start: number; end: number } | null,
) {
  if (!saved) return;
  const sel = window.getSelection();
  if (!sel) return;

  const range = document.createRange();
  range.selectNodeContents(container);
  range.collapse(true);

  let charCount = 0;
  const nodeStack: Node[] = [container];
  let node: Node | undefined;
  let foundStart = false;
  let stop = false;

  while (!stop && (node = nodeStack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const nextCharCount = charCount + text.length;
      if (!foundStart && saved.start >= charCount && saved.start <= nextCharCount) {
        range.setStart(node, saved.start - charCount);
        foundStart = true;
      }
      if (foundStart && saved.end >= charCount && saved.end <= nextCharCount) {
        range.setEnd(node, saved.end - charCount);
        stop = true;
      }
      charCount = nextCharCount;
    } else {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        nodeStack.push(node.childNodes[i]!);
      }
    }
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

function insertPlainText(
  editor: HTMLElement,
  text: string,
  writerColor?: string | null,
) {
  editor.focus();
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const color = writerColor?.trim() || null;

  if (color) {
    const html = normalized
      .split("\n")
      .map((line, index, lines) => {
        const body = escapeHtml(line);
        const span = `<span data-writer="collab" style="color:${color}">${body || "\u200b"}</span>`;
        return index < lines.length - 1 ? `${span}<br>` : span;
      })
      .join("");
    document.execCommand("insertHTML", false, html);
    return;
  }

  if (document.queryCommandSupported("insertText")) {
    document.execCommand("insertText", false, normalized);
    return;
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  sel.deleteFromDocument();
  const range = sel.getRangeAt(0);
  const fragment = document.createDocumentFragment();
  const lines = normalized.split("\n");
  lines.forEach((line, index) => {
    fragment.appendChild(document.createTextNode(line));
    if (index < lines.length - 1) {
      fragment.appendChild(document.createElement("br"));
    }
  });
  range.insertNode(fragment);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function LyricRichEditor({
  value,
  onChange,
  spellCheck = true,
  onSpellCheckChange,
  footerStats,
  writerColor = null,
  canChooseWriterColor = false,
  writerLabel = null,
  onTriggerAnnotate,
  activeAnnotationId,
  onAnnotationClick,
  annotations,
  onCloseAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  readOnly = false,
}: LyricRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef("");
  const emittedValue = useRef<string | null>(null);
  const [pickedColor, setPickedColor] = useState<string | null>(() =>
    loadSavedCollabColor(),
  );
  const [collabPaletteOpen, setCollabPaletteOpen] = useState(false);
  const paletteMenuRef = useRef<HTMLDivElement>(null);
  const activeWriterColor = pickedColor !== null ? pickedColor : writerColor;
  const writerColorRef = useRef(activeWriterColor);

  useEffect(() => {
    writerColorRef.current = activeWriterColor;
  }, [activeWriterColor]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectionPopup, setSelectionPopup] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const checkSelectionForPopup = useCallback(() => {
    const sel = window.getSelection();
    const editor = editorRef.current;
    const wrapper = wrapperRef.current;
    if (!sel || !editor || !wrapper || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelectionPopup(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelectionPopup(null);
      return;
    }

    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setSelectionPopup(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSelectionPopup(null);
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();

    // Position popup centered horizontally below the highlighted words
    const x = Math.max(
      50,
      Math.min(
        wrapperRect.width - 50,
        rect.left + rect.width / 2 - wrapperRect.left,
      ),
    );
    const y = rect.bottom - wrapperRect.top + 8;

    // Hide if out of visible bounds of editor
    if (rect.bottom < wrapperRect.top || rect.top > wrapperRect.bottom || y > wrapperRect.height - 10) {
      setSelectionPopup(null);
      return;
    }

    setSelectionPopup({ x, y, text });
  }, []);

  useEffect(() => {
    function onDocSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionPopup(null);
      }
    }
    document.addEventListener("selectionchange", onDocSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onDocSelectionChange);
  }, []);

  function handleAnnotateClick() {
    let selected = "";
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      selected = sel.toString().trim();
    }
    onTriggerAnnotate?.(selected);
  }

  useEffect(() => {
    if (!editorRef.current) return;
    const marks = editorRef.current.querySelectorAll(".rap-annotation-mark");
    marks.forEach((el) => el.classList.remove("active-highlight"));
    if (!activeAnnotationId) return;
    const matches = editorRef.current.querySelectorAll(
      `.rap-annotation-mark[data-annotation-id="${activeAnnotationId}"]`,
    );
    matches.forEach((el) => el.classList.add("active-highlight"));
    if (matches[0]) {
      matches[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeAnnotationId]);

  const activeAnnotation = annotations?.find((a) => a.id === activeAnnotationId);
  const activeAnnotationColor = activeAnnotation
    ? ANNOTATION_COLORS[activeAnnotation.color] || ANNOTATION_COLORS.purple
    : null;

  useEffect(() => {
    if (!activeAnnotationId) return;
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseAnnotation?.();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeAnnotationId, onCloseAnnotation]);
  const [rapToolsOpen, setRapToolsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_FONT_SIZE;
    const saved = Number(preferenceStorageGet(FONT_SIZE_KEY));
    return FONT_SIZES.includes(saved as (typeof FONT_SIZES)[number])
      ? saved
      : DEFAULT_FONT_SIZE;
  });
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkError, setLinkError] = useState("");
  const [linkPastePlain, setLinkPastePlain] = useState<string | null>(null);
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Close palette dropdown when clicking outside
  useEffect(() => {
    if (!collabPaletteOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (
        paletteMenuRef.current &&
        !paletteMenuRef.current.contains(e.target as Node)
      ) {
        setCollabPaletteOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [collabPaletteOpen]);

  function applyWriterColor() {
    const color = writerColorRef.current?.trim();
    // Only collaborators force a write color. Owners must not call foreColor.
    if (!color) return;

    const editor = editorRef.current;
    if (!editor) return;

    // CRITICAL: If text is selected (range is not collapsed), NEVER call foreColor!
    // Calling execCommand("foreColor") on a non-collapsed selection alters the color of selected text.
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) {
      return;
    }
    if (sel.anchorNode && !editor.contains(sel.anchorNode)) {
      return;
    }

    editor.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      // ignore
    }
    document.execCommand("foreColor", false, color);
  }

  /** If owner types inside blue collab text, break into default-colored text. */
  function breakOutOfCollabColorIfNeeded() {
    if (writerColorRef.current?.trim()) return;
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
    const node = sel.anchorNode;
    if (!node || !editor.contains(node)) return;
    const el =
      node.nodeType === Node.TEXT_NODE
        ? node.parentElement
        : (node as Element | null);
    const collab = el?.closest?.(
      '[data-writer="collab"]',
    ) as HTMLElement | null;
    if (!collab || !editor.contains(collab)) return;

    document.execCommand(
      "insertHTML",
      false,
      `<span data-writer="owner" style="color:${getOwnerForegroundColor()}">\u200b</span>`,
    );
  }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    function syncRapTools() {
      if (!media.matches) {
        setRapToolsOpen(false);
        return;
      }
      const saved = preferenceStorageGet("rapvault-rap-tools");
      setRapToolsOpen(saved === "true");
    }
    syncRapTools();
    media.addEventListener("change", syncRapTools);

    return () => media.removeEventListener("change", syncRapTools);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement !== editor) return;
    applyWriterColor();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply when color changes while focused
  }, [activeWriterColor]);

  function chooseWriterColor(color: string | null) {
    if (!color) {
      setPickedColor(null);
      preferenceStorageSet(COLLAB_COLOR_KEY, "default");
      const editor = editorRef.current;
      if (editor) {
        editor.focus();
        try {
          document.execCommand("styleWithCSS", false, "true");
        } catch {
          // ignore
        }
        document.execCommand("foreColor", false, getOwnerForegroundColor());
      }
      setCollabPaletteOpen(false);
      return;
    }

    const next = matchCollabPaletteColor(color) || color;
    setPickedColor(next);
    preferenceStorageSet(COLLAB_COLOR_KEY, next);

    const editor = editorRef.current;
    if (editor) {
      editor.focus();
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        // ignore
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        document.execCommand("foreColor", false, next);
      }
    }
    setCollabPaletteOpen(false);
  }

  function changeFontSize(direction: -1 | 1) {
    setFontSize((current) => {
      const index = FONT_SIZES.indexOf(current as (typeof FONT_SIZES)[number]);
      const nextIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, (index === -1 ? 1 : index) + direction));
      const next = FONT_SIZES[nextIndex]!;
      preferenceStorageSet(FONT_SIZE_KEY, String(next));
      return next;
    });
  }

  function toggleRapTools() {
    setRapToolsOpen((open) => {
      const next = !open;
      preferenceStorageSet("rapvault-rap-tools", String(next));
      return next;
    });
  }

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (value === emittedValue.current) return;

    const html = contentToHtml(value);
    if (html === lastHtml.current) {
      emittedValue.current = value;
      return;
    }

    const selection = saveSelection(editor);
    editor.innerHTML = html || "";
    preserveCollabColors(editor);
    ensureLinksOpenInNewTab(editor);
    lastHtml.current = editor.innerHTML;
    emittedValue.current = value;
    restoreSelection(editor, selection);
  }, [value]);

  useEffect(() => {
    editorRef.current?.focus({ preventScroll: true });
    applyWriterColor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncContent() {
    const editor = editorRef.current;
    if (!editor) return;
    preserveCollabColors(editor);
    ensureLinksOpenInNewTab(editor);
    const html = editor.innerHTML;
    lastHtml.current = html;
    emittedValue.current = html;
    onChange(html);
  }

  function runCommand(command: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    applyWriterColor();
    syncContent();
  }

  function openLinkModal(prefill = "https://", pastePlain: string | null = null) {
    const editor = editorRef.current;
    if (editor) {
      savedSelectionRef.current = saveSelection(editor);
    }
    setLinkUrl(prefill);
    setLinkPastePlain(pastePlain);
    setLinkError("");
    setLinkModalOpen(true);
  }

  function closeLinkModal() {
    setLinkModalOpen(false);
    setLinkError("");
    setLinkPastePlain(null);
    const editor = editorRef.current;
    if (editor) {
      editor.focus();
      restoreSelection(editor, savedSelectionRef.current);
    }
  }

  function insertLink() {
    const sel = window.getSelection();
    const selected = sel?.toString().trim() || "";
    const prefill =
      selected && isLikelyUrl(selected)
        ? selected.startsWith("http")
          ? selected
          : `https://${selected}`
        : "https://";
    openLinkModal(prefill);
  }

  function applyLinkFromModal(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeLinkUrl(linkUrl);
    if (!normalized) {
      setLinkError("Enter a valid web link (https://…)");
      return;
    }

    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    restoreSelection(editor, savedSelectionRef.current);

    const sel = window.getSelection();
    const hasSelection =
      Boolean(sel) &&
      sel!.rangeCount > 0 &&
      !sel!.getRangeAt(0).collapsed &&
      editor.contains(sel!.getRangeAt(0).commonAncestorContainer);

    if (hasSelection) {
      document.execCommand("createLink", false, normalized);
    } else {
      const label = escapeHtml(linkPastePlain?.trim() || normalized);
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${escapeHtml(normalized)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
      );
    }

    ensureLinksOpenInNewTab(editor);
    applyWriterColor();
    syncContent();
    setLinkModalOpen(false);
    setLinkPastePlain(null);
    setLinkError("");
  }

  function pasteAsPlainFromModal() {
    const editor = editorRef.current;
    const plain = linkPastePlain;
    setLinkModalOpen(false);
    setLinkError("");
    setLinkPastePlain(null);
    if (!editor || !plain) return;
    editor.focus();
    restoreSelection(editor, savedSelectionRef.current);
    insertPlainText(editor, plain, writerColorRef.current);
    applyWriterColor();
    syncContent();
  }

  useEffect(() => {
    if (!linkModalOpen) return;
    const timer = window.setTimeout(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [linkModalOpen]);

  function handleEditorClick(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;

    // Annotation click detection
    const mark = target?.closest?.(
      ".rap-annotation-mark, .rap-annotation-badge",
    ) as HTMLElement | null;
    if (mark) {
      const parentMark = mark.classList.contains("rap-annotation-mark")
        ? mark
        : (mark.closest(".rap-annotation-mark") as HTMLElement | null);
      const annId =
        parentMark?.getAttribute("data-annotation-id") ||
        mark.getAttribute("data-annotation-id");
      if (annId && onAnnotationClick) {
        event.preventDefault();
        event.stopPropagation();
        setSelectionPopup(null);
        onAnnotationClick(annId);
        return;
      }
    }

    const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    const editor = editorRef.current;
    if (!anchor || !editor || !editor.contains(anchor)) return;

    event.preventDefault();
    event.stopPropagation();
    const href = anchor.href;
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function insertStructure(label: string) {
    const editor = editorRef.current;
    if (!editor) return;
    insertPlainText(editor, `${label}\n`, writerColorRef.current);
    applyWriterColor();
    syncContent();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;

    if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && writerColorRef.current?.trim()) {
        // User is replacing selected text with a newly typed character in their collaborator color.
        // Delete the selection so the caret collapses, then apply the writer color.
        sel.deleteFromDocument();
        applyWriterColor();
      } else if (writerColorRef.current?.trim()) {
        applyWriterColor();
      } else {
        breakOutOfCollabColorIfNeeded();
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      applyWriterColor();
      document.execCommand("insertLineBreak");
      syncContent();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      insertPlainText(editor, "  ", writerColorRef.current);
      syncContent();
      return;
    }

    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      runCommand("bold");
    } else if (key === "i") {
      event.preventDefault();
      runCommand("italic");
    } else if (key === "u") {
      event.preventDefault();
      runCommand("underline");
    } else if (key === "k") {
      event.preventDefault();
      insertLink();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;

    const text = event.clipboardData.getData("text/plain");
    if (!text) return;

    if (isLikelyUrl(text)) {
      const prefill = text.trim().startsWith("http")
        ? text.trim()
        : `https://${text.trim()}`;
      openLinkModal(prefill, text);
      return;
    }

    insertPlainText(editor, text, writerColorRef.current);
    applyWriterColor();
    syncContent();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;

    const text = event.dataTransfer.getData("text/plain");
    if (!text) return;

    if (isLikelyUrl(text)) {
      const prefill = text.trim().startsWith("http")
        ? text.trim()
        : `https://${text.trim()}`;
      openLinkModal(prefill, text);
      return;
    }

    insertPlainText(editor, text, writerColorRef.current);
    applyWriterColor();
    syncContent();
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border">
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 lg:px-6">
          <div className="flex items-center gap-0.5">
            <button type="button" className={`${toolBtn} w-9`} title="Bold" aria-label="Bold" onClick={() => runCommand("bold")}>
              <Bold className="h-4 w-4" />
            </button>
            <button type="button" className={`${toolBtn} w-9`} title="Italic" aria-label="Italic" onClick={() => runCommand("italic")}>
              <Italic className="h-4 w-4" />
            </button>
            <button type="button" className={`${toolBtn} w-9`} title="Underline" aria-label="Underline" onClick={() => runCommand("underline")}>
              <Underline className="h-4 w-4" />
            </button>
            <button type="button" className={`${toolBtn} w-9`} title="Bullet list" aria-label="Bullet list" onClick={() => runCommand("insertUnorderedList")}>
              <List className="h-4 w-4" />
            </button>
            <button type="button" className={`${toolBtn} w-9`} title="Numbered list" aria-label="Numbered list" onClick={() => runCommand("insertOrderedList")}>
              <ListOrdered className="h-4 w-4" />
            </button>
            <button type="button" className={`${toolBtn} w-9`} title="Quote" aria-label="Quote" onClick={() => runCommand("formatBlock", "blockquote")}>
              <Quote className="h-4 w-4" />
            </button>
            <button type="button" className={`${toolBtn} w-9`} title="Link" aria-label="Link" onClick={insertLink}>
              <Link className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={toggleRapTools}
              className={`${toolBtn} w-9 ${
                rapToolsOpen
                  ? "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : ""
              }`}
              title="Rhyme suggestions & rap structure"
              aria-label="Rhyme suggestions"
            >
              <Lightbulb className="h-4 w-4" />
            </button>
          </div>

          <div className="ml-0.5 flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              className={`${toolBtn} h-8 w-8 disabled:opacity-40`}
              title="Decrease font size"
              aria-label="Decrease font size"
              onClick={() => changeFontSize(-1)}
              disabled={fontSize <= FONT_SIZES[0]!}
            >
              <span className="text-xs font-semibold leading-none">A−</span>
            </button>
            <span className="min-w-[2rem] text-center text-xs font-medium tabular-nums text-muted">
              {fontSize}
            </span>
            <button
              type="button"
              className={`${toolBtn} h-8 w-8 disabled:opacity-40`}
              title="Increase font size"
              aria-label="Increase font size"
              onClick={() => changeFontSize(1)}
              disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]!}
            >
              <span className="text-sm font-semibold leading-none">A+</span>
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={`${toolBtn} w-9`}
              title="Undo"
              aria-label="Undo"
              onClick={() => runCommand("undo")}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`${toolBtn} w-9`}
              title="Redo"
              aria-label="Redo"
              onClick={() => runCommand("redo")}
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Writer Color Palette Button */}
            <div ref={paletteMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setCollabPaletteOpen(!collabPaletteOpen)}
                className={`${toolBtn} w-9 relative ${
                  collabPaletteOpen
                    ? "border-accent bg-accent/10 text-accent"
                    : activeWriterColor
                      ? "border-border text-foreground hover:border-foreground/30"
                      : ""
                }`}
                title={
                  activeWriterColor
                    ? `Writing color: ${COLLAB_COLORS.find((c) => colorsClose(activeWriterColor, c.hex))?.name || activeWriterColor} — Click to switch`
                    : "Writing color palette"
                }
                aria-label="Writing color palette"
                aria-expanded={collabPaletteOpen}
              >
                <Palette className="h-4 w-4" />
                {activeWriterColor && (
                  <span
                    className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full ring-1 ring-background shadow-xs"
                    style={{ backgroundColor: activeWriterColor }}
                    aria-hidden
                  />
                )}
              </button>

              {collabPaletteOpen && (
                <div
                  className="absolute top-full right-0 z-50 mt-1.5 w-[22.5rem] max-w-[calc(100vw-2rem)] max-h-[min(70dvh,28rem)] overflow-y-auto rounded-2xl border border-border/90 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                  role="dialog"
                  aria-label="Writing color palette"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full ring-2 ring-foreground/20 ring-offset-1 ring-offset-background"
                        style={{
                          backgroundColor:
                            activeWriterColor || "var(--foreground)",
                        }}
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-none">
                          {COLLAB_COLORS.find(
                            (c) =>
                              activeWriterColor &&
                              colorsClose(activeWriterColor, c.hex),
                          )?.name || "Default text"}
                        </p>
                        <p className="text-[10px] text-muted font-mono mt-0.5">
                          {activeWriterColor || "Theme text"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => chooseWriterColor(null)}
                      className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold text-muted transition hover:border-foreground/40 hover:text-foreground"
                      title="Reset writing color to default theme text"
                    >
                      Default
                    </button>
                  </div>

                  <p className="mt-2 text-[11px] text-muted">
                    Pick a writing color ({COLLAB_COLORS.length} colors):
                  </p>

                  <div className="mt-2.5 grid grid-cols-8 gap-1.5 sm:gap-2">
                    {COLLAB_COLORS.map((item) => {
                      const selected = Boolean(
                        activeWriterColor &&
                          colorsClose(activeWriterColor, item.hex),
                      );
                      const lightSwatch =
                        item.hex === "#ffffff" ||
                        item.hex === "#fafafa" ||
                        item.hex === "#e5e5e5" ||
                        item.hex === "#d6d3d1" ||
                        item.hex === "#fde047" ||
                        item.hex === "#facc15" ||
                        item.hex === "#fbbf24" ||
                        item.hex === "#f9a8d4" ||
                        item.hex === "#a5b4fc";
                      return (
                        <button
                          key={item.hex}
                          type="button"
                          onClick={() => chooseWriterColor(item.hex)}
                          className={`group relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border transition hover:scale-110 active:scale-95 ${
                            selected
                              ? "border-foreground ring-2 ring-foreground/35 ring-offset-2 ring-offset-background scale-105"
                              : lightSwatch
                                ? "border-border hover:border-foreground/50"
                                : "border-border/60 hover:border-foreground/50"
                          }`}
                          title={`${item.name} (${item.hex})`}
                          aria-label={`Select ${item.name}`}
                          aria-pressed={selected}
                        >
                          <span
                            className="flex h-full w-full items-center justify-center rounded-full"
                            style={{ backgroundColor: item.hex }}
                          >
                            {selected && (
                              <Check
                                className={`h-3.5 w-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] ${
                                  lightSwatch ? "text-neutral-900" : "text-white"
                                }`}
                              />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted">
                    <span>Selected text retains its own color</span>
                    <button
                      type="button"
                      onClick={() => setCollabPaletteOpen(false)}
                      className="rounded px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-sidebar transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleRapTools}
              className={`${toolBtn} hidden w-9 lg:inline-flex ${rapToolsOpen ? "border-accent bg-accent/10 text-accent" : ""}`}
              title={rapToolsOpen ? "Hide tools" : "Show tools"}
              aria-label={rapToolsOpen ? "Hide tools" : "Show tools"}
              aria-expanded={rapToolsOpen}
            >
              <Wrench className="h-4 w-4" />
            </button>
          </div>
        </div>

        {rapToolsOpen && (
          <div className="hidden lg:block">
            <div className="flex gap-1.5 overflow-x-auto border-t border-border px-3 py-2 lg:px-6">
              {RAP_STRUCTURE_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={structureBtn}
                  onClick={() => insertStructure(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div ref={wrapperRef} className="relative flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Song lyrics"
          onInput={syncContent}
          onKeyDown={(e) => {
            handleKeyDown(e);
            setTimeout(checkSelectionForPopup, 20);
          }}
          onKeyUp={checkSelectionForPopup}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onClick={handleEditorClick}
          onFocus={applyWriterColor}
          onMouseUp={(e) => {
            const sel = window.getSelection();
            if (sel && sel.isCollapsed) {
              applyWriterColor();
            }
            const target = e.target as HTMLElement | null;
            const mark = target?.closest?.(".rap-annotation-mark, .rap-annotation-badge") as HTMLElement | null;
            if (mark) {
              const parentMark = mark.classList.contains("rap-annotation-mark")
                ? mark
                : (mark.closest(".rap-annotation-mark") as HTMLElement | null);
              const annId =
                parentMark?.getAttribute("data-annotation-id") ||
                mark.getAttribute("data-annotation-id");
              if (annId && onAnnotationClick) {
                setSelectionPopup(null);
                onAnnotationClick(annId);
                return;
              }
            }
            setTimeout(checkSelectionForPopup, 10);
          }}
          onScroll={checkSelectionForPopup}
          onDragOver={(event) => event.preventDefault()}
          spellCheck={spellCheck}
          data-placeholder="Drop your bars here..."
          style={{ fontSize: `${fontSize}px` }}
          className="lyric-markdown lyric-editor h-full min-h-0 flex-1 overflow-y-auto overscroll-contain bg-editor px-4 py-4 leading-relaxed outline-none lg:px-8 lg:py-5"
        />

        {selectionPopup && (
          <div
            style={{
              position: "absolute",
              left: `${selectionPopup.x}px`,
              top: `${selectionPopup.y}px`,
              transform: "translateX(-50%)",
              zIndex: 40,
            }}
            className="pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onMouseDown={(e) => {
                // Prevent editor blur so selection is preserved
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = selectionPopup.text;
                setSelectionPopup(null);
                onTriggerAnnotate?.(text);
              }}
              className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl ring-1 ring-white/20 transition hover:bg-black hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-950 dark:ring-zinc-800"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Annotate</span>
            </button>
          </div>
        )}

        {/* Floating Side Meaning Card on the side of the text area */}
        {activeAnnotation && activeAnnotationColor && (
          <div
            role="region"
            aria-label="Annotation meaning"
            className="pointer-events-auto absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-72 sm:w-80 max-w-[calc(100%-1.5rem)] rounded-2xl border border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-right-3 duration-150"
          >
            {/* Header: Label + Close button */}
            <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Annotation Meaning
                </span>
              </div>
              <button
                type="button"
                onClick={() => onCloseAnnotation?.()}
                className="rounded-lg p-1 text-muted transition hover:bg-sidebar hover:text-foreground"
                title="Close meaning (Esc)"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Line / Word / Sentence snippet */}
            <div className="mt-3">
              <span
                className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold leading-relaxed ${activeAnnotationColor.tagClass}`}
                title={activeAnnotation.text}
              >
                &ldquo;{activeAnnotation.text}&rdquo;
              </span>
            </div>

            {/* Meaning Description */}
            <div className="mt-2.5 rounded-xl border border-border/70 bg-background/80 p-3 shadow-2xs">
              <p className="text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap font-normal">
                {activeAnnotation.explanation}
              </p>
            </div>

            {/* Actions: Edit & Delete if not read-only */}
            {!readOnly && (onEditAnnotation || onDeleteAnnotation) && (
              <div className="mt-3 flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                {onEditAnnotation && (
                  <button
                    type="button"
                    onClick={() => onEditAnnotation(activeAnnotation)}
                    className="rap-btn-secondary inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium"
                    title="Edit annotation"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                )}
                {onDeleteAnnotation && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteAnnotation(activeAnnotation.id);
                      onCloseAnnotation?.();
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 transition"
                    title="Delete annotation"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {footerStats && (
        <div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-card/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:px-6">
          <div className="flex min-h-7 w-full flex-nowrap items-center justify-center gap-x-2 overflow-x-auto whitespace-nowrap text-xs text-muted sm:justify-between sm:text-[13px]">
            {footerStats}
          </div>
        </div>
      )}

      <Modal
        open={linkModalOpen}
        onClose={() => {
          if (linkPastePlain) {
            pasteAsPlainFromModal();
            return;
          }
          closeLinkModal();
        }}
        title={linkPastePlain ? "Add pasted link?" : "Add link"}
        description={
          linkPastePlain
            ? "Turn this into a clickable link. It will open in a new tab."
            : "Paste or type a URL. Links open in a new tab when clicked."
        }
      >
        <form onSubmit={applyLinkFromModal} className="space-y-4">
          <div>
            <label
              htmlFor="lyric-link-url"
              className="mb-1.5 block text-sm font-medium"
            >
              Link URL
            </label>
            <input
              ref={linkInputRef}
              id="lyric-link-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setLinkError("");
              }}
              placeholder="https://example.com"
              className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted/70 focus:border-foreground/30"
            />
            {linkError && (
              <p className="mt-2 text-sm text-red-400">{linkError}</p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {linkPastePlain ? (
              <button
                type="button"
                onClick={pasteAsPlainFromModal}
                className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:text-foreground"
              >
                Paste as plain text
              </button>
            ) : (
              <button
                type="button"
                onClick={closeLinkModal}
                className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:text-foreground"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              {linkPastePlain ? "Add as link" : "Insert link"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
