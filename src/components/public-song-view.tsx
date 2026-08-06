"use client";

import { ArrowLeft, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BeatPlayerPanel } from "@/components/beat-player-panel";
import { VaultHeader, iconBtn } from "@/components/vault-header";
import { contentToHtml } from "@/lib/rich-text";

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
          setSong((prev) => (prev ? { ...prev, viewCount: v.viewCount } : prev));
        }
      })
      .catch(() => {});
  }, [songId]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <VaultHeader>
        <Link
          href={
            song.author.username
              ? `/vault/artists/${song.author.username}`
              : "/vault/artists"
          }
          className={`${iconBtn} flex w-auto items-center gap-1.5 px-3 text-sm font-medium`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </VaultHeader>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {song.title || "Untitled"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              by{" "}
              {song.author.username ? (
                <Link
                  href={`/vault/artists/${song.author.username}`}
                  className="font-medium text-foreground hover:text-accent"
                >
                  {song.author.displayName}
                  <span className="text-muted"> @{song.author.username}</span>
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {song.author.displayName}
                </span>
              )}
            </p>
            {song.genre && (
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                {song.genre}
              </p>
            )}
          </div>
          {song.isOwner && (
            <Link
              href={`/vault/write/${song.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium transition hover:border-accent hover:text-accent"
            >
              <Pencil className="h-4 w-4" />
              Edit view
            </Link>
          )}
        </div>

        {song.beatUrl && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
            <BeatPlayerPanel
              beatUrl={song.beatUrl}
              onBeatUrlChange={() => {}}
              readOnly
            />
          </div>
        )}

        <article className="min-h-[16rem] flex-1 rounded-2xl border border-border bg-editor p-5 sm:p-6">
          <div
            className="lyric-markdown"
            dangerouslySetInnerHTML={{
              __html:
                contentToHtml(song.content) ||
                "<p class='text-muted'>No lyrics yet.</p>",
            }}
          />
        </article>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Eye className="h-4 w-4" />
            <span>
              {song.viewCount} unique {song.viewCount === 1 ? "view" : "views"}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleFire}
            disabled={firing}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
              song.fired
                ? "border-orange-500/40 bg-orange-500/15 text-orange-500"
                : "border-border bg-card text-muted hover:border-orange-500/40 hover:text-orange-500"
            }`}
          >
            <span aria-hidden className="text-base leading-none">
              🔥
            </span>
            <span>{song.fireCount}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
