"use client";

import { ArrowLeft, Eye, Flame, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { VaultHeader, iconBtn } from "@/components/vault-header";

type ArtistProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  isSelf: boolean;
  songs: Array<{
    id: string;
    title: string;
    genre: string;
    viewCount: number;
    fireCount: number;
    updatedAt: string;
  }>;
};

export function ArtistProfileView({ username }: { username: string }) {
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/artists/${encodeURIComponent(username)}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setArtist(data.artist);
    setLoading(false);
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  async function startMessage() {
    if (!artist || artist.isSelf) return;
    setMessaging(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: artist.id }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/vault/messages/${data.conversationId}`);
      }
    } finally {
      setMessaging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted">
        Loading...
      </div>
    );
  }

  if (notFound || !artist) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-6 text-muted">
        <p>Artist not found.</p>
        <Link href="/vault/artists" className="text-accent hover:underline">
          Back to artists
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <VaultHeader>
        <Link
          href="/vault/artists"
          className={`${iconBtn} flex w-auto items-center gap-1.5 px-3 text-sm font-medium`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Artists</span>
        </Link>
      </VaultHeader>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <section className="mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-sidebar text-xl font-bold">
                {artist.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {artist.displayName}
                </h1>
                <p className="text-sm text-muted">@{artist.username}</p>
              </div>
            </div>
            {!artist.isSelf && (
              <button
                type="button"
                onClick={startMessage}
                disabled={messaging}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                Message
              </button>
            )}
            {artist.isSelf && (
              <Link
                href="/vault/settings"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium transition hover:border-accent hover:text-accent"
              >
                Edit profile
              </Link>
            )}
          </div>
          {artist.bio && (
            <p className="mt-4 text-sm leading-relaxed text-muted">{artist.bio}</p>
          )}
        </section>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Public songs
        </h2>
        {artist.songs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted">
            No public songs yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {artist.songs.map((song) => (
              <li key={song.id}>
                <Link
                  href={`/vault/s/${song.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-foreground/15"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {song.title || "Untitled"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {song.genre || "No genre"} ·{" "}
                      {new Date(song.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {song.viewCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" />
                      {song.fireCount}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
