"use client";

import {
  Bold,
  ChevronDown,
  ChevronUp,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  SpellCheck,
  Strikethrough,
  Sparkles,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  RAP_STRUCTURE_LABELS,
  RHYME_GROUP_COLORS,
  analyzeLyricLines,
} from "@/lib/lyric-tools";
import { contentToHtml, stripRichText } from "@/lib/rich-text";
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
};

const toolBtn =
  "flex h-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted transition hover:border-border hover:bg-background hover:text-foreground active:scale-95";

const structureBtn =
  "shrink-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent active:scale-95";

const FONT_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28] as const;
const DEFAULT_FONT_SIZE = 16;
const FONT_SIZE_KEY = "rapvault-lyric-font-size";

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

function insertPlainText(editor: HTMLElement, text: string) {
  editor.focus();
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

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
}: LyricRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef("");
  const emittedValue = useRef<string | null>(null);
  const [showSyllables, setShowSyllables] = useState(false);
  const [showRhymes, setShowRhymes] = useState(false);
  const [rapToolsOpen, setRapToolsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);

  useEffect(() => {
    const saved = preferenceStorageGet("rapvault-rap-tools");
    if (saved === "true") setRapToolsOpen(true);

    const savedSize = Number(preferenceStorageGet(FONT_SIZE_KEY));
    if (FONT_SIZES.includes(savedSize as (typeof FONT_SIZES)[number])) {
      setFontSize(savedSize);
    }
  }, []);

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
      if (!next) {
        setShowSyllables(false);
        setShowRhymes(false);
      }
      return next;
    });
  }

  const lineAnalysis = useMemo(() => {
    if (!showSyllables && !showRhymes) return [];
    return analyzeLyricLines(stripRichText(value));
  }, [value, showSyllables, showRhymes]);

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
    lastHtml.current = html;
    emittedValue.current = value;
    restoreSelection(editor, selection);
  }, [value]);

  useEffect(() => {
    editorRef.current?.focus({ preventScroll: true });
  }, []);

  function syncContent() {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    lastHtml.current = html;
    emittedValue.current = html;
    onChange(html);
  }

  function runCommand(command: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    syncContent();
  }

  function insertLink() {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    runCommand("createLink", url);
  }

  function insertStructure(label: string) {
    const editor = editorRef.current;
    if (!editor) return;
    insertPlainText(editor, `${label}\n`);
    syncContent();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;

    if (event.key === "Enter") {
      event.preventDefault();
      document.execCommand("insertLineBreak");
      syncContent();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      insertPlainText(editor, "  ");
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

    insertPlainText(editor, text);
    syncContent();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;

    const text = event.dataTransfer.getData("text/plain");
    if (!text) return;

    insertPlainText(editor, text);
    syncContent();
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border">
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 lg:px-6">
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

          {toolbarStats && (
            <div className="mx-auto flex min-w-0 flex-1 justify-center px-2">
              {toolbarStats}
            </div>
          )}

          <button
            type="button"
            onClick={toggleRapTools}
            className={`${toolBtn} ${toolbarStats ? "" : "ml-auto "}gap-1 px-2.5 text-xs font-medium ${rapToolsOpen ? "border-accent bg-accent/10 text-accent" : "w-auto"}`}
            title={rapToolsOpen ? "Hide rap tools" : "Show rap tools"}
            aria-expanded={rapToolsOpen}
          >
            Rap tools
            {rapToolsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {rapToolsOpen && (
          <>
            <div className="flex flex-wrap items-center gap-0.5 border-t border-border px-3 py-1.5 lg:px-6">
              <button
                type="button"
                onClick={() => setShowSyllables((on) => !on)}
                className={`${toolBtn} gap-1.5 px-2.5 text-xs font-medium ${showSyllables ? "border-accent bg-accent/10 text-accent" : "w-auto"}`}
                title="Toggle syllable count"
              >
                <Type className="h-4 w-4" />
                <span>Syllables</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRhymes((on) => !on)}
                className={`${toolBtn} gap-1.5 px-2.5 text-xs font-medium ${showRhymes ? "border-accent bg-accent/10 text-accent" : "w-auto"}`}
                title="Toggle rhyme highlighting"
              >
                <Sparkles className="h-4 w-4" />
                <span>Rhymes</span>
              </button>
            </div>

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
          </>
        )}
      </div>

      {rapToolsOpen && (showSyllables || showRhymes) && lineAnalysis.length > 0 && (
        <div className="max-h-36 shrink-0 overflow-y-auto border-b border-border bg-sidebar/80 px-3 py-2 text-xs lg:px-6">
          {lineAnalysis.map((item) => (
            <div key={`${item.line}-${item.syllables}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-0.5">
              <span className="min-w-0 flex-1 truncate text-foreground/90">{item.line}</span>
              {showSyllables && (
                <span className="shrink-0 text-muted">{item.syllables} syl</span>
              )}
              {showRhymes && item.endWord && (
                <span
                  className={`shrink-0 font-medium ${
                    item.rhymeGroup >= 0
                      ? RHYME_GROUP_COLORS[item.rhymeGroup % RHYME_GROUP_COLORS.length]
                      : "text-muted"
                  }`}
                >
                  {item.endWord}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

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
        onDragOver={(event) => event.preventDefault()}
        spellCheck={spellCheck}
        data-placeholder="Drop your bars here..."
        style={{ fontSize: `${fontSize}px` }}
        className="lyric-markdown lyric-editor h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-editor px-4 py-4 leading-relaxed outline-none lg:px-8 lg:py-5"
      />
    </div>
  );
}
