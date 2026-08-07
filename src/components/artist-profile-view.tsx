"use client";

import {
  ArrowLeft,
  Check,
  Eye,
  Flame,
  Loader2,
  MessageSquare,
  Music2,
  Settings,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { ArtistSocialLinks } from "@/components/artist-social-links";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultShell } from "@/components/vault-shell";
import type { ConnectionRelation } from "@/types";

type ArtistProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  youtubeUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  isSelf: boolean;
  connectionRelation: ConnectionRelation;
  connectionId: string | null;
  songs: Array<{
    id: string;
    title: string;
    genre: string;
    viewCount: number;
    fireCount: number;
    updatedAt: string;
  }>;
};

function avatarTone(seed: string) {
  const hues = [262, 198, 32, 152, 340, 220];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return hues[hash % hues.length];
}

export function ArtistProfileView({ username }: { username: string }) {
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/artists/${encodeURIComponent(username)}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setArtist({
      ...data.artist,
      connectionRelation: data.artist.connectionRelation || "none",
      connectionId: data.artist.connectionId || null,
    });
    setLoading(false);
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    if (!artist) return { views: 0, fires: 0 };
    return artist.songs.reduce(
      (acc, song) => ({
        views: acc.views + (song.viewCount || 0),
        fires: acc.fires + (song.fireCount || 0),
      }),
      { views: 0, fires: 0 },
    );
  }, [artist]);

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

  async function sendRequest() {
    if (!artist || artist.isSelf) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: artist.id }),
      });
      if (res.ok) await load();
    } finally {
      setConnecting(false);
    }
  }

  async function acceptRequest() {
    if (!artist?.connectionId) return;
    setConnecting(true);
    try {
      const res = await fetch(`/api/network/${artist.connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (res.ok) await load();
    } finally {
      setConnecting(false);
    }
  }

  async function declineRequest() {
    if (!artist?.connectionId) return;
    setConnecting(true);
    try {
      const res = await fetch(`/api/network/${artist.connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      if (res.ok) await load();
    } finally {
      setConnecting(false);
    }
  }

  async function cancelOrRemove() {
    if (!artist?.connectionId) return;
    setConnecting(true);
    try {
      const res = await fetch(`/api/network/${artist.connectionId}`, {
        method: "DELETE",
      });
      if (res.ok) await load();
    } finally {
      setConnecting(false);
    }
  }

  const hue = avatarTone(artist?.username || username);

  function renderConnectionActions() {
    if (!artist || artist.isSelf) return null;

    const relation = artist.connectionRelation;

    if (relation === "pending_received") {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-center text-xs font-medium text-muted lg:text-left">
            Wants to connect with you
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={acceptRequest}
              disabled={connecting}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Accept
            </button>
            <button
              type="button"
              onClick={declineRequest}
              disabled={connecting}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Decline
            </button>
          </div>
        </div>
      );
    }

    if (relation === "pending_sent") {
      return (
        <button
          type="button"
          onClick={cancelOrRemove}
          disabled={connecting}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-sm font-medium text-muted backdrop-blur transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          Request sent — Cancel
        </button>
      );
    }

    if (relation === "connected") {
      return (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={startMessage}
            disabled={messaging}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {messaging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            Message
          </button>
          <button
            type="button"
            onClick={cancelOrRemove}
            disabled={connecting}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
            Remove connection
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={sendRequest}
          disabled={connecting}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Connect
        </button>
        <button
          type="button"
          onClick={startMessage}
          disabled={messaging}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-sm font-medium backdrop-blur transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {messaging ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          Message
        </button>
      </div>
    );
  }

  return (
    <VaultShell centerLabel={artist?.displayName || "Artist"}>
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <RapVaultLoading label="Loading..." />
        ) : notFound || !artist ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-muted">
            <p>Artist not found.</p>
            <Link
              href="/vault/artists"
              className="inline-flex items-center gap-1.5 text-accent hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to artists
            </Link>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
            <aside className="relative shrink-0 overflow-hidden border-b border-border bg-sidebar lg:h-full lg:border-b-0 lg:border-r">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `hsl(${hue} 75% 48% / 0.18)`,
                }}
              />

              <div className="relative flex h-full flex-col px-4 py-4 sm:px-5 lg:px-6 lg:py-6">
                <Link
                  href="/vault/artists"
                  className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                  All artists
                </Link>

                <div className="mt-4 flex items-center gap-3.5 lg:mt-8 lg:flex-col lg:items-start lg:gap-5">
                  <UserAvatar
                    src={artist.avatarUrl}
                    name={artist.displayName}
                    size="lg"
                    className="border-2 border-background shadow-lg ring-1 ring-border lg:h-28 lg:w-28 lg:text-3xl"
                  />
                  <div className="min-w-0 flex-1 lg:w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-bold tracking-tight lg:text-3xl lg:whitespace-normal lg:leading-tight">
                        {artist.displayName}
                      </h1>
                      {artist.connectionRelation === "connected" && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-500">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      @{artist.username}
                    </p>
                    {artist.bio && (
                      <p className="mt-2 line-clamp-2 text-sm leading-snug text-foreground/75 lg:mt-3 lg:line-clamp-4">
                        {artist.bio}
                      </p>
                    )}
                    <ArtistSocialLinks
                      className="mt-3"
                      links={{
                        youtubeUrl: artist.youtubeUrl,
                        facebookUrl: artist.facebookUrl,
                        instagramUrl: artist.instagramUrl,
                        spotifyUrl: artist.spotifyUrl,
                        appleMusicUrl: artist.appleMusicUrl,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 lg:mt-auto lg:pt-8">
                  <div className="rounded-xl border border-border/70 bg-background/55 px-2.5 py-2 backdrop-blur">
                    <p className="text-lg font-semibold tabular-nums tracking-tight">
                      {artist.songs.length}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                      Songs
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/55 px-2.5 py-2 backdrop-blur">
                    <p className="text-lg font-semibold tabular-nums tracking-tight">
                      {totals.views}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                      Views
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/55 px-2.5 py-2 backdrop-blur">
                    <p className="text-lg font-semibold tabular-nums tracking-tight">
                      {totals.fires}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                      Fires
                    </p>
                  </div>
                </div>

                <div className="mt-3 lg:mt-4">
                  {artist.isSelf ? (
                    <Link
                      href="/vault/settings"
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-sm font-medium backdrop-blur transition hover:border-accent hover:text-accent"
                    >
                      <Settings className="h-4 w-4" />
                      Edit profile
                    </Link>
                  ) : (
                    renderConnectionActions()
                  )}
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold tracking-tight sm:text-base">
                    Public bars
                  </h2>
                  <p className="truncate text-xs text-muted">
                    {artist.songs.length === 0
                      ? "Nothing published yet"
                      : `${artist.songs.length} track${artist.songs.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <Music2 className="h-4 w-4 shrink-0 text-muted" />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {artist.songs.length === 0 ? (
                  <div className="flex h-full min-h-[10rem] flex-col items-center justify-center px-6 text-center">
                    <Music2 className="mb-2 h-6 w-6 text-muted" />
                    <p className="text-sm font-medium">No public songs yet</p>
                    <p className="mt-1 text-xs text-muted">
                      Published tracks will show up here.
                    </p>
                  </div>
                ) : (
                  <ol className="divide-y divide-border">
                    {artist.songs.map((song, index) => (
                      <li key={song.id}>
                        <Link
                          href={`/vault/s/${song.id}`}
                          className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-accent/[0.04] sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:px-5"
                        >
                          <span className="text-center font-mono text-xs tabular-nums text-muted transition group-hover:text-accent">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-tight transition group-hover:text-accent">
                              {song.title || "Untitled"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {song.genre || "No genre"} ·{" "}
                              {new Date(song.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2.5 text-xs tabular-nums text-muted">
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
                  </ol>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </VaultShell>
  );
}
