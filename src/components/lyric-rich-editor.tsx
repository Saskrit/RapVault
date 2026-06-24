"use client";

import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useEffect, useRef, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { contentToHtml } from "@/lib/rich-text";

type LyricRichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  spellCheck?: boolean;
};

const toolBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted transition hover:border-border hover:bg-background hover:text-foreground active:scale-95";

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
}: LyricRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef("");
  const emittedValue = useRef<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Skip re-sync when this update came from the editor itself (keeps cursor in place).
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-border px-3 py-1.5 lg:px-6">
        <button type="button" className={toolBtn} title="Bold" aria-label="Bold" onClick={() => runCommand("bold")}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} title="Italic" aria-label="Italic" onClick={() => runCommand("italic")}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} title="Strikethrough" aria-label="Strikethrough" onClick={() => runCommand("strikeThrough")}>
          <Strikethrough className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} title="Heading 1" aria-label="Heading 1" onClick={() => runCommand("formatBlock", "h1")}>
          <Heading1 className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} title="Heading 2" aria-label="Heading 2" onClick={() => runCommand("formatBlock", "h2")}>
          <Heading2 className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} title="Bullet list" aria-label="Bullet list" onClick={() => runCommand("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} title="Numbered list" aria-label="Numbered list" onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} title="Quote" aria-label="Quote" onClick={() => runCommand("formatBlock", "blockquote")}>
          <Quote className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} title="Link" aria-label="Link" onClick={insertLink}>
          <Link className="h-4 w-4" />
        </button>
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
        onDragOver={(event) => event.preventDefault()}
        spellCheck={spellCheck}
        data-placeholder="Drop your bars here..."
        className="lyric-markdown lyric-editor min-h-0 flex-1 overflow-y-auto bg-editor px-4 py-4 text-base leading-relaxed outline-none lg:px-8 lg:py-5"
      />
    </div>
  );
}
