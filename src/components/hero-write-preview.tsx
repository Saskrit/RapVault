"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bold,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Download,
  Eye,
  Globe,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Music2,
  Play,
  Quote,
  Settings,
  SpellCheck,
  Star,
  Strikethrough,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { BrandWordmark, Logo } from "@/components/logo";
import type { HeroPreviewSong, HeroPreviewScriptLine } from "@/lib/hero-preview-song";
import { RAP_STRUCTURE_LABELS } from "@/lib/lyric-tools";

const DEFAULT_SCRIPT: HeroPreviewScriptLine[] = [
  { kind: "tag", text: "[Verse 1]" },
  { kind: "line", text: "Started with a vision, pen hit the pad" },
  { kind: "line", text: "Lines in the vault, never lookin' back" },
  { kind: "blank", text: "" },
  { kind: "tag", text: "[Hook]" },
  { kind: "line", text: "Locked in, never fold" },
  { kind: "line", text: "Bars on ice, story told" },
];

const iconBtn =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted";

function shortBeatUrl(url: string) {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}/…`;
  } catch {
    return url.slice(0, 22) || "youtube.com/…";
  }
}

function scriptToPlain(script: HeroPreviewScriptLine[]) {
  return script
    .map((row) => (row.kind === "blank" ? "" : row.text))
    .join("\n");
}

type HeroWritePreviewProps = {
  song?: HeroPreviewSong | null;
};

/**
 * Scaled-down replica of the real write page — same chrome and panels,
 * compact sizing so the full UI fits in the hero box.
 * "Use Demo" unlocks paste/type in the miniature editor.
 */
export function HeroWritePreview({ song = null }: HeroWritePreviewProps) {
  const previewScript = useMemo(
    () => (song?.script?.length ? song.script : DEFAULT_SCRIPT),
    [song],
  );
  const previewTitle = song?.title?.trim() || "Midnight Freestyle";
  const previewFinished = (song?.status ?? "draft") === "finished";
  const previewFavorite = song?.isFavorite ?? true;
  const previewPublic = song?.isPublic ?? false;
  const previewBeat = song?.beatUrl?.trim() || "";
  const usernameLabel = song?.username
    ? song.username.startsWith("@")
      ? song.username
      : `@${song.username}`
    : "@artist";

  const [demoMode, setDemoMode] = useState(false);
  const [demoTitle, setDemoTitle] = useState("Untitled demo");
  const [demoLyrics, setDemoLyrics] = useState("");
  const [demoBeatUrl, setDemoBeatUrl] = useState("");
  const [demoFavorite, setDemoFavorite] = useState(false);
  const [demoFinished, setDemoFinished] = useState(false);
  const [demoPublic, setDemoPublic] = useState(false);
  const lyricsRef = useRef<HTMLTextAreaElement>(null);

  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);
  const scriptKey = song?.id ?? "demo-preview";

  useEffect(() => {
    setLineIndex(0);
    setCharIndex(0);
    setDone(false);
  }, [scriptKey]);

  useEffect(() => {
    if (demoMode) return;

    if (done) {
      const pause = window.setTimeout(() => {
        setLineIndex(0);
        setCharIndex(0);
        setDone(false);
      }, 2400);
      return () => window.clearTimeout(pause);
    }

    const current = previewScript[lineIndex];
    if (!current) {
      setDone(true);
      return;
    }

    if (current.kind === "blank") {
      const blank = window.setTimeout(() => {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      }, 260);
      return () => window.clearTimeout(blank);
    }

    if (charIndex < current.text.length) {
      const tick = window.setTimeout(
        () => setCharIndex((c) => c + 1),
        current.kind === "tag" ? 34 : 26,
      );
      return () => window.clearTimeout(tick);
    }

    const next = window.setTimeout(() => {
      if (lineIndex >= previewScript.length - 1) setDone(true);
      else {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      }
    }, current.kind === "tag" ? 300 : 400);
    return () => window.clearTimeout(next);
  }, [lineIndex, charIndex, done, previewScript, demoMode]);

  function startDemo() {
    setDemoTitle(previewTitle);
    setDemoLyrics(scriptToPlain(previewScript));
    setDemoBeatUrl(previewBeat);
    setDemoFavorite(previewFavorite);
    setDemoFinished(previewFinished);
    setDemoPublic(previewPublic);
    setDemoMode(true);
    window.setTimeout(() => lyricsRef.current?.focus(), 50);
  }

  function exitDemo() {
    setDemoMode(false);
    setLineIndex(0);
    setCharIndex(0);
    setDone(false);
  }

  const title = demoMode ? demoTitle : previewTitle;
  const isFinished = demoMode ? demoFinished : previewFinished;
  const isFavorite = demoMode ? demoFavorite : previewFavorite;
  const isPublic = demoMode ? demoPublic : previewPublic;
  const beatUrl = demoMode ? demoBeatUrl.trim() : previewBeat;

  const visible = previewScript.slice(0, lineIndex + 1).map((row, i) => {
    if (i < lineIndex) return row.text;
    if (row.kind === "blank") return "";
    return row.text.slice(0, charIndex);
  });

  const typedText = demoMode
    ? demoLyrics
    : visible.filter(Boolean).join("\n");
  const words = typedText.trim() ? typedText.trim().split(/\s+/).length : 0;
  const lines = typedText
    .split(/\n/)
    .filter((line) => line.trim().length > 0).length;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      aria-hidden={!demoMode}
    >
      {/* Mac traffic lights + Use Demo */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-sidebar px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        <div className="ml-1.5 flex min-w-0 flex-1 items-center justify-end gap-2">
          {demoMode ? (
            <>
              <span className="mr-auto truncate text-[10px] font-medium text-accent sm:text-xs">
                Demo mode — paste &amp; type
              </span>
              <button
                type="button"
                onClick={exitDemo}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10px] font-medium text-muted transition hover:border-foreground/20 hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Exit
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startDemo}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2.5 text-[10px] font-semibold text-accent transition hover:bg-accent/20 sm:text-[11px]"
            >
              <Play className="h-3 w-3 fill-current" />
              Use Demo
            </button>
          )}
        </div>
      </div>

      {/* VaultHeader */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-card px-2 py-1.5">
        <span className={`${iconBtn} w-auto gap-1 px-1.5`}>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-[9px] font-medium">Library</span>
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <Logo size={20} href={null} />
          <BrandWordmark height={10} href={null} className="hidden sm:inline-flex" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className={iconBtn}>
            <MessageSquare className="h-3 w-3" />
          </span>
          <span className="hidden h-6 max-w-[5.5rem] items-center gap-1 truncate rounded-md border border-border bg-background px-1.5 text-[8px] font-medium text-muted sm:inline-flex">
            <Settings className="h-2.5 w-2.5 shrink-0" />
            {usernameLabel}
          </span>
          <span className={`${iconBtn} sm:hidden`}>
            <Settings className="h-3 w-3" />
          </span>
          <span className={iconBtn}>
            <Moon className="h-3 w-3" />
          </span>
          <span className={iconBtn}>
            <LogOut className="h-3 w-3" />
          </span>
        </div>
      </div>

      {/* Title + song actions */}
      <div className="shrink-0 border-b border-border bg-card/50 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {demoMode ? (
            <input
              type="text"
              value={demoTitle}
              onChange={(e) => setDemoTitle(e.target.value)}
              placeholder="Untitled track"
              className="min-w-0 flex-1 basis-24 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold tracking-tight outline-none focus:border-accent sm:text-xs"
            />
          ) : (
            <div className="min-w-0 flex-1 basis-24 truncate rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold tracking-tight sm:text-xs">
              {title}
            </div>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <span className={iconBtn} title="Beat">
              <Music2 className="h-3 w-3" />
            </span>
            <span className={`${iconBtn} w-auto gap-0.5 px-1.5`}>
              <Users className="h-3 w-3" />
              <span className="hidden text-[8px] sm:inline">Collab</span>
            </span>
            <button
              type="button"
              disabled={!demoMode}
              onClick={() => setDemoFavorite((v) => !v)}
              className={iconBtn}
              tabIndex={demoMode ? 0 : -1}
            >
              <Star
                className={`h-3 w-3 ${
                  isFavorite
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted"
                }`}
              />
            </button>
            <button
              type="button"
              disabled={!demoMode}
              onClick={() => setDemoFinished((v) => !v)}
              className={`${iconBtn} w-auto gap-0.5 px-1.5 ${
                isFinished
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  : ""
              }`}
              tabIndex={demoMode ? 0 : -1}
            >
              {isFinished ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <CircleDashed className="h-3 w-3" />
              )}
              <span className="hidden text-[8px] sm:inline">
                {isFinished ? "Finished" : "Draft"}
              </span>
            </button>
            <button
              type="button"
              disabled={!demoMode}
              onClick={() => setDemoPublic((v) => !v)}
              className={`${iconBtn} ${
                isPublic
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-500"
              }`}
              tabIndex={demoMode ? 0 : -1}
            >
              {isPublic ? (
                <Globe className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
            </button>
            {isPublic && (
              <span className={`${iconBtn} w-auto gap-0.5 px-1`}>
                <Eye className="h-3 w-3" />
              </span>
            )}
            <span className={`${iconBtn} w-auto gap-0.5 px-1`}>
              <Download className="h-3 w-3" />
              <span className="hidden text-[8px] sm:inline">Download</span>
              <ChevronDown className="h-2.5 w-2.5" />
            </span>
            <span className={iconBtn}>
              <Trash2 className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Lyrics | Beat split */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_5.5rem] sm:grid-cols-[minmax(0,1fr)_8rem]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-border">
          <div className="shrink-0 border-b border-border">
            <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1">
              <span className={iconBtn}><Bold className="h-3 w-3" /></span>
              <span className={iconBtn}><Italic className="h-3 w-3" /></span>
              <span className={iconBtn}><Strikethrough className="h-3 w-3" /></span>
              <span className={iconBtn}><List className="h-3 w-3" /></span>
              <span className={`${iconBtn} hidden sm:flex`}><ListOrdered className="h-3 w-3" /></span>
              <span className={`${iconBtn} hidden sm:flex`}><Quote className="h-3 w-3" /></span>
              <span className={`${iconBtn} hidden md:flex`}><Link2 className="h-3 w-3" /></span>
              <span className={`${iconBtn} border-accent/40 bg-accent/10 text-accent`}>
                <SpellCheck className="h-3 w-3" />
              </span>
              <span className="ml-0.5 flex h-6 items-center gap-0.5 rounded-md border border-border bg-background px-1 text-[8px] font-semibold tabular-nums text-muted">
                <span>A−</span>
                <span className="min-w-[1.1rem] text-center">16</span>
                <span>A+</span>
              </span>
              <div className="mx-auto hidden min-w-0 flex-1 justify-center px-1 lg:flex">
                <div className="flex flex-wrap items-center justify-center gap-x-1 text-[8px] text-muted">
                  <span>{words} words</span>
                  <span className="text-border">·</span>
                  <span>{lines} lines</span>
                  <span className="text-border">·</span>
                  <span
                    className={
                      demoMode || done || lineIndex > 1
                        ? "text-green-400"
                        : "text-accent"
                    }
                  >
                    {demoMode
                      ? "Local only"
                      : done || lineIndex > 1
                        ? "Saved"
                        : "Saving..."}
                  </span>
                </div>
              </div>
              <span className={`${iconBtn} ml-auto w-auto gap-0.5 border-accent bg-accent/10 px-1.5 text-accent`}>
                <span className="text-[8px] font-medium">Rap tools</span>
                <ChevronDown className="h-2.5 w-2.5 rotate-180" />
              </span>
            </div>

            <div className="flex gap-1 overflow-x-auto border-t border-border px-1.5 py-1">
              {RAP_STRUCTURE_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={!demoMode}
                  tabIndex={demoMode ? 0 : -1}
                  onClick={() => {
                    if (!demoMode) return;
                    setDemoLyrics((prev) => {
                      const pad = prev && !prev.endsWith("\n") ? "\n" : "";
                      return `${prev}${pad}${label}\n`;
                    });
                    lyricsRef.current?.focus();
                  }}
                  className="shrink-0 rounded-md border border-border bg-background px-1.5 py-0.5 text-[8px] font-medium text-muted transition enabled:hover:border-accent enabled:hover:text-accent disabled:cursor-default"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden bg-editor">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.06),_transparent_55%)]" />
            {demoMode ? (
              <textarea
                ref={lyricsRef}
                value={demoLyrics}
                onChange={(e) => setDemoLyrics(e.target.value)}
                placeholder={"Paste your lyrics here…\n\n[Verse 1]\nYour bars…"}
                spellCheck
                className="relative h-full w-full resize-none bg-transparent px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground outline-none placeholder:text-muted/50 sm:px-3 sm:py-2.5 sm:text-[12px]"
              />
            ) : (
              <div className="relative space-y-1 px-2.5 py-2 font-mono text-[11px] leading-relaxed sm:px-3 sm:py-2.5 sm:text-[12px]">
                {previewScript.map((row, i) => {
                  if (i > lineIndex) return null;
                  const text = visible[i] ?? "";
                  const isActive = i === lineIndex && !done;
                  if (row.kind === "blank") return <div key={i} className="h-1.5" />;
                  return (
                    <p
                      key={i}
                      className={
                        row.kind === "tag" ? "text-accent/85" : "text-foreground"
                      }
                    >
                      {text}
                      {isActive && (
                        <span className="hero-type-caret ml-px inline-block h-[1em] w-[2px] translate-y-[1px] bg-accent align-text-bottom" />
                      )}
                    </p>
                  );
                })}
                {done && (
                  <p className="text-accent/45">
                    <span className="hero-type-caret inline-block h-[1em] w-[2px] translate-y-[1px] bg-accent align-text-bottom" />
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-sidebar">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-1.5 py-1.5">
            <span className="text-[8px] font-semibold uppercase tracking-wide text-muted sm:text-[9px]">
              Beat
            </span>
            <Music2 className="h-3 w-3 text-muted" />
          </div>
          <div className="shrink-0 space-y-1 border-b border-border p-1.5">
            <p className="text-[7px] font-medium uppercase tracking-wide text-muted sm:text-[8px]">
              Paste beat link
            </p>
            <div className="flex gap-1">
              {demoMode ? (
                <input
                  type="url"
                  value={demoBeatUrl}
                  onChange={(e) => setDemoBeatUrl(e.target.value)}
                  placeholder="youtube.com/…"
                  className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-1.5 py-1 text-[7px] text-foreground outline-none placeholder:text-muted focus:border-accent sm:text-[8px]"
                />
              ) : (
                <div className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-1.5 py-1 text-[7px] text-muted sm:text-[8px]">
                  {beatUrl ? shortBeatUrl(beatUrl) : "youtube.com/…"}
                </div>
              )}
              <button
                type="button"
                disabled={!demoMode || !demoBeatUrl}
                tabIndex={demoMode ? 0 : -1}
                onClick={() => setDemoBeatUrl("")}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border text-muted transition enabled:hover:border-red-500/50 enabled:hover:text-red-400 disabled:opacity-40"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative w-full shrink-0 bg-black pt-[56%]">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-red-600 sm:h-7 sm:w-7">
                  {beatUrl ? (
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-500/35" />
                  ) : null}
                  <Music2 className="relative h-2.5 w-2.5 text-white sm:h-3 sm:w-3" />
                </div>
                <p className="px-1 text-center text-[7px] text-muted">
                  {beatUrl ? "YouTube" : "No beat"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-border px-1.5 py-1">
              <span className="truncate text-[7px] text-muted">
                {beatUrl ? "Synced to this song" : "Paste a beat link"}
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 border-t border-border px-1.5 py-2">
              <p className="text-[7px] font-medium uppercase tracking-wide text-muted">
                Beat length
              </p>
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full w-2/5 rounded-full bg-accent ${
                    beatUrl && !demoMode ? "hero-beat-bar" : ""
                  }`}
                />
              </div>
              <p className="text-[7px] tabular-nums text-muted">
                {beatUrl ? "0:42 / 2:18" : "— / —"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
