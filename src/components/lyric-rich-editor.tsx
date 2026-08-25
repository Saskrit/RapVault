"use client";

import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Lock,
  Quote,
  Redo2,
  SpellCheck,
  Strikethrough,
  Undo2,
  Unlock,
  Wrench,
} from "lucide-react";
import {
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

type LyricRichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  spellCheck?: boolean;
  onSpellCheckChange?: (enabled: boolean) => void;
  toolbarStats?: ReactNode;
  /**
   * Hex color for this writer's new text.
   * Collaborators pick one; owners leave unset (default theme color).
   */
  writerColor?: string | null;
  /** When true, collaborator can pick one writing color from the palette. */
  canChooseWriterColor?: boolean;
  /** Show a small “your color” hint when collaborating */
  writerLabel?: string | null;
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

/** Colors collaborators may choose (one at a time). Owners stay on default. */
export const COLLAB_COLOR_OPTIONS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // amber
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#a855f7", // purple
  "#14b8a6", // teal
] as const;

const COLLAB_COLOR_KEY = "rapvault-collab-write-color";
const COLLAB_COLOR_LOCK_KEY = "rapvault-collab-color-locked";

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

function colorsClose(a: string, b: string, tolerance = 30) {
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
  const match = COLLAB_COLOR_OPTIONS.find((option) =>
    colorsClose(color, option),
  );
  return match ?? null;
}

function isCollabPaletteColor(color: string) {
  return matchCollabPaletteColor(color) !== null;
}

function loadSavedCollabColor(): string {
  const saved = preferenceStorageGet(COLLAB_COLOR_KEY);
  if (saved && isCollabPaletteColor(saved)) {
    return matchCollabPaletteColor(saved)!;
  }
  return COLLAB_WRITER_COLOR;
}

function loadSavedCollabColorLocked(): boolean {
  const saved = preferenceStorageGet(COLLAB_COLOR_LOCK_KEY);
  // Default locked so collaborators write in one color until they unlock to switch.
  if (saved === "false") return false;
  return true;
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
  toolbarStats,
  writerColor = null,
  canChooseWriterColor = false,
  writerLabel = null,
}: LyricRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef("");
  const emittedValue = useRef<string | null>(null);
  const [pickedColor, setPickedColor] = useState(COLLAB_WRITER_COLOR);
  const [colorLocked, setColorLocked] = useState(true);
  const activeWriterColor = canChooseWriterColor
    ? pickedColor
    : writerColor;
  const writerColorRef = useRef(activeWriterColor);
  const [rapToolsOpen, setRapToolsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkError, setLinkError] = useState("");
  const [linkPastePlain, setLinkPastePlain] = useState<string | null>(null);
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  writerColorRef.current = activeWriterColor;

  function applyWriterColor() {
    const color = writerColorRef.current?.trim();
    // Only collaborators force a write color. Owners must not call foreColor —
    // it recolors existing blue collab text when the caret is inside it.
    if (!color) return;

    const editor = editorRef.current;
    if (!editor) return;
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

    const savedSize = Number(preferenceStorageGet(FONT_SIZE_KEY));
    if (FONT_SIZES.includes(savedSize as (typeof FONT_SIZES)[number])) {
      setFontSize(savedSize);
    }

    if (canChooseWriterColor) {
      setPickedColor(loadSavedCollabColor());
      setColorLocked(loadSavedCollabColorLocked());
    }

    return () => media.removeEventListener("change", syncRapTools);
  }, [canChooseWriterColor]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement !== editor) return;
    applyWriterColor();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply when color changes while focused
  }, [activeWriterColor]);

  function setColorLock(locked: boolean) {
    setColorLocked(locked);
    preferenceStorageSet(COLLAB_COLOR_LOCK_KEY, String(locked));
  }

  function chooseWriterColor(color: string) {
    if (!canChooseWriterColor) return;
    const next = matchCollabPaletteColor(color) || COLLAB_WRITER_COLOR;
    // One active color: when locked, ignore other swatches until unlocked.
    if (colorLocked && !colorsClose(pickedColor, next)) return;
    setPickedColor(next);
    preferenceStorageSet(COLLAB_COLOR_KEY, next);
    // Picking a color locks it as the only write color.
    setColorLock(true);
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
      if (writerColorRef.current?.trim()) {
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
          <div className="hidden items-center gap-0.5 lg:flex">
            <button type="button" className={`${toolBtn} w-9`} title="Bold" aria-label="Bold" onClick={() => runCommand("bold")}>
              <Bold className="h-4 w-4" />
            </button>
            <button type="button" className={`${toolBtn} w-9`} title="Italic" aria-label="Italic" onClick={() => runCommand("italic")}>
              <Italic className="h-4 w-4" />
            </button>
            <button type="button" className={`${toolBtn} w-9`} title="Strikethrough" aria-label="Strikethrough" onClick={() => runCommand("strikeThrough")}>
              <Strikethrough className="h-4 w-4" />
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
            {onSpellCheckChange && (
              <button
                type="button"
                className={`${toolBtn} w-9 ${
                  spellCheck ? "border-accent bg-accent/10 text-accent hover:border-accent hover:text-accent" : ""
                }`}
                title={spellCheck ? "Spell check on" : "Spell check off"}
                aria-label={spellCheck ? "Disable spell check" : "Enable spell check"}
                onClick={() => onSpellCheckChange(!spellCheck)}
              >
                <SpellCheck className="h-4 w-4" />
              </button>
            )}
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

          {toolbarStats && (
            <div className="mx-auto flex min-w-0 flex-1 justify-center px-2">
              {toolbarStats}
            </div>
          )}

          {canChooseWriterColor && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1">
              <span className="hidden text-[11px] text-muted sm:inline">
                Your color
              </span>
              <div
                className="flex items-center gap-1"
                role="radiogroup"
                aria-label="Collaborator writing color"
                aria-disabled={colorLocked}
              >
                {COLLAB_COLOR_OPTIONS.map((color) => {
                  const selected = colorsClose(pickedColor, color);
                  const disabled = colorLocked && !selected;
                  return (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={disabled}
                      title={
                        disabled
                          ? "Unlock to switch color"
                          : selected
                            ? `Writing in ${color} (locked)`
                            : `Write in ${color}`
                      }
                      aria-label={
                        disabled
                          ? `Color locked — unlock to use ${color}`
                          : `Write in ${color}`
                      }
                      onClick={() => chooseWriterColor(color)}
                      className={`relative h-10 w-10 rounded-full border p-1.5 transition active:scale-95 lg:h-5 lg:w-5 lg:p-0 ${
                        selected
                          ? "border-foreground ring-2 ring-foreground/25 ring-offset-1 ring-offset-background"
                          : disabled
                            ? "cursor-not-allowed border-border/50 opacity-35"
                            : "border-border/80 hover:scale-110"
                      }`}
                    >
                      <span
                        className="block h-full w-full rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setColorLock(!colorLocked)}
                className={`inline-flex h-9 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition active:scale-95 lg:h-7 ${
                  colorLocked
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }`}
                title={
                  colorLocked
                    ? "Color locked — click to unlock and switch"
                    : "Unlocked — pick a color (locks after you choose)"
                }
                aria-pressed={colorLocked}
                aria-label={
                  colorLocked
                    ? "Unlock writing color"
                    : "Lock writing color"
                }
              >
                {colorLocked ? (
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Unlock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span className="hidden sm:inline">
                  {colorLocked ? "Locked" : "Pick one"}
                </span>
              </button>
            </div>
          )}

          {!canChooseWriterColor && (activeWriterColor || writerLabel) && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-[11px] text-muted">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: activeWriterColor || "var(--foreground)",
                }}
              />
              <span className="hidden sm:inline">
                {writerLabel || "Your writing color"}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleRapTools}
            className={`${toolBtn} ${toolbarStats ? "" : "ml-auto "}hidden w-9 lg:inline-flex ${rapToolsOpen ? "border-accent bg-accent/10 text-accent" : ""}`}
            title={rapToolsOpen ? "Hide tools" : "Show tools"}
            aria-label={rapToolsOpen ? "Hide tools" : "Show tools"}
            aria-expanded={rapToolsOpen}
          >
            <Wrench className="h-4 w-4" />
          </button>
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

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Song lyrics"
        onInput={syncContent}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onClick={handleEditorClick}
        onFocus={applyWriterColor}
        onMouseUp={applyWriterColor}
        onDragOver={(event) => event.preventDefault()}
        spellCheck={spellCheck}
        data-placeholder="Drop your bars here..."
        style={{ fontSize: `${fontSize}px` }}
        className="lyric-markdown lyric-editor h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-editor px-4 py-4 leading-relaxed outline-none lg:px-8 lg:py-5"
      />

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
