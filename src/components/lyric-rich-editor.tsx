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
import { useEffect, useRef, type KeyboardEvent } from "react";
import { contentToHtml } from "@/lib/rich-text";

type LyricRichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  spellCheck?: boolean;
};

const toolBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted transition hover:border-border hover:bg-background hover:text-foreground active:scale-95";

export function LyricRichEditor({
  value,
  onChange,
  spellCheck = true,
}: LyricRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef("");
  const skipSync = useRef(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || skipSync.current) return;

    const html = contentToHtml(value);
    if (html !== lastHtml.current) {
      editor.innerHTML = html || "";
      lastHtml.current = html;
    }
  }, [value]);

  function syncContent() {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    lastHtml.current = html;
    skipSync.current = true;
    onChange(html);
    requestAnimationFrame(() => {
      skipSync.current = false;
    });
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
        onInput={syncContent}
        onKeyDown={handleKeyDown}
        spellCheck={spellCheck}
        data-placeholder="Drop your bars here..."
        className="lyric-markdown lyric-editor min-h-0 flex-1 overflow-y-auto bg-editor px-4 py-4 text-base leading-relaxed outline-none lg:px-8 lg:py-5"
      />
    </div>
  );
}
