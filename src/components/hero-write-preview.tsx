"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  CircleDashed,
  Download,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Music2,
  Quote,
  Settings,
  SpellCheck,
  Sparkles,
  Star,
  Strikethrough,
  Trash2,
  Type,
  Users,
} from "lucide-react";
import { BrandWordmark, Logo } from "@/components/logo";
import { RAP_STRUCTURE_LABELS } from "@/lib/lyric-tools";

const SCRIPT = [
  { kind: "tag" as const, text: "[Verse 1]" },
  { kind: "line" as const, text: "Started with a vision, pen hit the pad" },
  { kind: "line" as const, text: "Lines in the vault, never lookin' back" },
  { kind: "blank" as const, text: "" },
  { kind: "tag" as const, text: "[Hook]" },
  { kind: "line" as const, text: "Locked in, never fold" },
  { kind: "line" as const, text: "Bars on ice, story told" },
];

const iconBtn =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted";

/**
 * Scaled-down replica of the real write page — same chrome and panels,
 * compact sizing so the full UI fits in the hero box.
 */
export function HeroWritePreview() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const pause = window.setTimeout(() => {
        setLineIndex(0);
        setCharIndex(0);
        setDone(false);
      }, 2400);
      return () => window.clearTimeout(pause);
    }

    const current = SCRIPT[lineIndex];
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
      if (lineIndex >= SCRIPT.length - 1) setDone(true);
      else {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      }
    }, current.kind === "tag" ? 300 : 400);
    return () => window.clearTimeout(next);
  }, [lineIndex, charIndex, done]);

  const visible = SCRIPT.slice(0, lineIndex + 1).map((row, i) => {
    if (i < lineIndex) return row.text;
    if (row.kind === "blank") return "";
    return row.text.slice(0, charIndex);
  });

  const typedText = visible.filter(Boolean).join("\n");
  const words = typedText.trim() ? typedText.trim().split(/\s+/).length : 0;
  const lines = visible.filter((v, i) => SCRIPT[i]?.kind !== "blank" && v).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background" aria-hidden>
      {/* VaultHeader */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-card px-2 py-1.5">
        <span className={`${iconBtn} w-auto gap-1 px-1.5`}>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-[9px] font-medium">Library</span>
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <Logo size={18} href={null} />
          <BrandWordmark height={10} href={null} className="hidden sm:inline-flex" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className={iconBtn}>
            <MessageSquare className="h-3 w-3" />
          </span>
          <span className="hidden h-6 max-w-[5.5rem] items-center gap-1 truncate rounded-md border border-border bg-background px-1.5 text-[8px] font-medium text-muted sm:inline-flex">
            <Settings className="h-2.5 w-2.5 shrink-0" />
            @artist
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
          <div className="min-w-0 flex-1 basis-24 truncate rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold tracking-tight sm:text-xs">
            Midnight Freestyle
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <span className={iconBtn} title="Beat">
              <Music2 className="h-3 w-3" />
            </span>
            <span className={`${iconBtn} w-auto gap-0.5 px-1.5`}>
              <Users className="h-3 w-3" />
              <span className="hidden text-[8px] sm:inline">Collab</span>
            </span>
            <span className={iconBtn}>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            </span>
            <span className={`${iconBtn} w-auto gap-0.5 px-1.5`}>
              <CircleDashed className="h-3 w-3" />
              <span className="hidden text-[8px] sm:inline">Draft</span>
            </span>
            <span className={`${iconBtn} border-amber-500/40 bg-amber-500/10 text-amber-500`}>
              <Lock className="h-3 w-3" />
            </span>
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
          {/* Lyric toolbar */}
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
                  <span>~0:18</span>
                  <span className="text-border">·</span>
                  <span className={done || lineIndex > 1 ? "text-green-400" : "text-accent"}>
                    {done || lineIndex > 1 ? "Saved" : "Saving..."}
                  </span>
                </div>
              </div>
              <span className={`${iconBtn} ml-auto w-auto gap-0.5 border-accent bg-accent/10 px-1.5 text-accent`}>
                <span className="text-[8px] font-medium">Rap tools</span>
                <ChevronDown className="h-2.5 w-2.5 rotate-180" />
              </span>
            </div>

            {/* Rap tools row (open) */}
            <div className="flex flex-wrap items-center gap-0.5 border-t border-border px-1.5 py-1">
              <span className={`${iconBtn} w-auto gap-0.5 border-accent bg-accent/10 px-1.5 text-accent`}>
                <Type className="h-3 w-3" />
                <span className="text-[8px] font-medium">Syllables</span>
              </span>
              <span className={`${iconBtn} w-auto gap-0.5 px-1.5`}>
                <Sparkles className="h-3 w-3" />
                <span className="text-[8px] font-medium">Rhymes</span>
              </span>
            </div>
            <div className="flex gap-1 overflow-x-auto border-t border-border px-1.5 py-1">
              {RAP_STRUCTURE_LABELS.map((label) => (
                <span
                  key={label}
                  className="shrink-0 rounded-md border border-border bg-background px-1.5 py-0.5 text-[8px] font-medium text-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Syllable analysis strip */}
          <div className="max-h-12 shrink-0 overflow-hidden border-b border-border bg-sidebar/80 px-2 py-1 text-[8px]">
            <div className="flex items-baseline gap-2 py-0.5">
              <span className="min-w-0 flex-1 truncate text-foreground/90">
                {visible[1] || "Started with a vision…"}
              </span>
              <span className="shrink-0 text-muted">10 syl</span>
            </div>
            <div className="flex items-baseline gap-2 py-0.5">
              <span className="min-w-0 flex-1 truncate text-foreground/90">
                {visible[2] || "Lines in the vault…"}
              </span>
              <span className="shrink-0 text-muted">8 syl</span>
            </div>
          </div>

          {/* Editor surface */}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-editor px-2.5 py-2 font-mono text-[11px] leading-relaxed sm:px-3 sm:py-2.5 sm:text-[12px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.06),_transparent_55%)]" />
            <div className="relative space-y-1">
              {SCRIPT.map((row, i) => {
                if (i > lineIndex) return null;
                const text = visible[i] ?? "";
                const isActive = i === lineIndex && !done;
                if (row.kind === "blank") return <div key={i} className="h-1.5" />;
                return (
                  <p
                    key={i}
                    className={row.kind === "tag" ? "text-accent/85" : "text-foreground"}
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
          </div>
        </div>

        {/* BeatPlayerPanel */}
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
              <div className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-1.5 py-1 text-[7px] text-muted sm:text-[8px]">
                youtube.com/…
              </div>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border text-muted">
                <Trash2 className="h-2.5 w-2.5" />
              </span>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative w-full shrink-0 bg-black pt-[56%]">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-red-600 sm:h-7 sm:w-7">
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-500/35" />
                  <Music2 className="relative h-2.5 w-2.5 text-white sm:h-3 sm:w-3" />
                </div>
                <p className="px-1 text-center text-[7px] text-muted">YouTube</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-border px-1.5 py-1">
              <span className="truncate text-[7px] text-muted">Synced to this song</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 border-t border-border px-1.5 py-2">
              <p className="text-[7px] font-medium uppercase tracking-wide text-muted">
                Beat length
              </p>
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div className="hero-beat-bar h-full w-2/5 rounded-full bg-accent" />
              </div>
              <p className="text-[7px] tabular-nums text-muted">0:42 / 2:18</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
