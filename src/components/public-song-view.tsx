"use client";

import { ArrowLeft, Eye, Music2, Pencil } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BeatPlayerPanel } from "@/components/beat-player-panel";
import { ResizableSplit } from "@/components/resizable-split";
import { VaultHeader, iconBtn } from "@/components/vault-header";
import { contentToHtml } from "@/lib/rich-text";
import { calculateLyricStats, formatDuration } from "@/lib/stats";

type PublicSong = {
  id: string;
  title: string;
  content: string;
  genre: string;
  moodTags: string;
  beatUrl: string;
  isPublic: boolean;
  viewCount: number;
  isOwner: boolean;
  author: {
    id: string;
    username: string | null;
    displayName: string;
  };
  fireCount: number;
  fired: boolean;
};

export function PublicSongView({ songId }: { songId: string }) {
  const [song, setSong] = useState<PublicSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [firing, setFiring] = useState(false);
  const [beatsOpen, setBeatsOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/songs/${songId}/public`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSong(data.song);
    setLoading(false);

    await fetch(`/api/songs/${songId}/view`, { method: "POST" })
      .then((r) => r.json())
      .then((v) => {
        if (typeof v.viewCount === "number") {
          setSong((prev) =>
            prev ? { ...prev, viewCount: v.viewCount } : prev,
          );
        }
      })
      .catch(() => {});
  }, [songId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (media.matches) setBeatsOpen(true);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (song?.beatUrl) setBeatsOpen(true);
  }, [song?.beatUrl]);

  async function toggleFire() {
    if (!song || firing) return;
    setFiring(true);
    try {
      const res = await fetch(`/api/songs/${songId}/react`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setSong((prev) =>
        prev
          ? { ...prev, fired: data.fired, fireCount: data.fireCount }
          : prev,
      );
    } finally {
      setFiring(false);
    }
  }

  const stats = song
    ? calculateLyricStats(song.content)
    : { words: 0, lines: 0, estimatedSeconds: 0 };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted">
        Loading...
      </div>
    );
  }

  if (notFound || !song) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-6 text-muted">
        <p>Song not found or not public.</p>
        <Link href="/vault/artists" className="text-accent hover:underline">
          Browse artists
        </Link>
      </div>
    );
  }

  const backHref = song.author.username
    ? `/vault/artists/${song.author.username}`
    : "/vault/artists";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <VaultHeader>
        <Link
          href={song.isOwner ? "/vault" : backHref}
          className={`${iconBtn} flex w-auto items-center gap-1.5 px-3 text-sm font-medium`}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">
            {song.isOwner ? "Library" : "Back"}
          </span>
        </Link>
      </VaultHeader>

      {/* Same chrome as edit view — title row */}
      <div className="shrink-0 border-b border-border bg-card/50 px-3 py-3 lg:px-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 basis-40 rounded-xl border border-border bg-background px-3.5 py-2.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl lg:text-2xl">
            <span className="block truncate">{song.title || "Untitled"}</span>
            <p className="mt-0.5 truncate text-xs font-medium text-muted sm:text-sm">
              by{" "}
              {song.author.username ? (
                <Link
                  href={`/vault/artists/${song.author.username}`}
                  className="hover:text-accent"
                >
                  {song.author.displayName}{" "}
                  <span className="text-muted">@{song.author.username}</span>
                </Link>
              ) : (
                song.author.displayName
              )}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBeatsOpen((open) => !open)}
              className={`${iconBtn} lg:hidden ${
                beatsOpen
                  ? "border-accent bg-accent/10 text-accent hover:border-accent hover:text-accent"
                  : ""
              }`}
              aria-label={beatsOpen ? "Hide beat player" : "Show beat player"}
              title={beatsOpen ? "Hide beats" : "Show beats"}
            >
              <Music2 className="h-4 w-4" />
            </button>

            <span
              className={`${iconBtn} pointer-events-none border-emerald-500/40 bg-emerald-500/10 text-base leading-none text-emerald-500`}
              title="Public"
              aria-label="Public song"
            >
              <span aria-hidden>🌐</span>
            </span>

            {song.isOwner && (
              <Link
                href={`/vault/write/${song.id}`}
                className={`${iconBtn} w-auto gap-1.5 px-2.5 sm:px-3`}
                title="Edit view"
                aria-label="Open edit view"
              >
                <Pencil className="h-4 w-4 shrink-0" />
                <span className="hidden text-sm sm:inline">Edit</span>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleFire}
              disabled={firing}
              className={`${iconBtn} w-auto gap-1.5 px-2.5 text-base leading-none sm:px-3 ${
                song.fired
                  ? "border-orange-500/40 bg-orange-500/15 text-orange-500"
                  : "hover:border-orange-500/40 hover:text-orange-500"
              }`}
              aria-label={song.fired ? "Remove fire" : "React with fire"}
              title="Fire"
            >
              <span aria-hidden>🔥</span>
              <span className="text-sm font-semibold tabular-nums">
                {song.fireCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Same split layout as edit view */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ResizableSplit
          secondaryVisible={beatsOpen}
          storageKey="rapvault-editor-split"
          defaultSecondarySize={360}
          primary={
            <div className="flex h-full min-h-0 flex-col bg-editor">
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-border px-3 py-2 text-[11px] text-muted sm:text-xs">
                <span>{stats.words} words</span>
                <span className="text-border">·</span>
                <span>{stats.lines} lines</span>
                <span className="text-border">·</span>
                <span>~{formatDuration(stats.estimatedSeconds)}</span>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {song.viewCount} unique{" "}
                  {song.viewCount === 1 ? "view" : "views"}
                </span>
              </div>
              <div
                className="lyric-markdown lyric-editor h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 leading-relaxed lg:px-8 lg:py-5"
                dangerouslySetInnerHTML={{
                  __html:
                    contentToHtml(song.content) ||
                    "<p class='text-muted'>No lyrics yet.</p>",
                }}
              />
            </div>
          }
          secondary={
            <BeatPlayerPanel
              beatUrl={song.beatUrl}
              onBeatUrlChange={() => {}}
              onClose={() => setBeatsOpen(false)}
              readOnly
            />
          }
        />
      </main>
    </div>
  );
}
