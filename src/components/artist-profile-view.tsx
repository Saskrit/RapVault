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
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { ArtistSocialLinks } from "@/components/artist-social-links";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultShell } from "@/components/vault-shell";
import { notifyNotificationsUpdated } from "@/hooks/use-notifications";
import type { ConnectionRelation } from "@/types";

type ArtistProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl?: string | null;
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
      if (res.ok) {
        await load();
        notifyNotificationsUpdated();
      }
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
      if (res.ok) {
        await load();
        notifyNotificationsUpdated();
      }
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
      if (res.ok) {
        await load();
        notifyNotificationsUpdated();
      }
    } finally {
      setConnecting(false);
    }
  }

  function renderActions() {
    if (!artist) return null;

    if (artist.isSelf) {
      return (
        <Link
          href="/vault/settings"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium transition hover:border-accent hover:text-accent"
        >
          <Settings className="h-4 w-4" />
          Edit profile
        </Link>
      );
    }

    const relation = artist.connectionRelation;

    if (relation === "pending_received") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-xs text-muted sm:w-auto">
            Wants to connect
          </span>
          <button
            type="button"
            onClick={acceptRequest}
            disabled={connecting}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
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
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Decline
          </button>
        </div>
      );
    }

    if (relation === "pending_sent") {
      return (
        <button
          type="button"
          onClick={cancelOrRemove}
          disabled={connecting}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 text-sm font-medium backdrop-blur transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          Cancel request
        </button>
      );
    }

    if (relation === "connected") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startMessage}
            disabled={messaging}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
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
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
            title="Remove connection"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={sendRequest}
          disabled={connecting}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
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
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium transition hover:border-accent hover:text-accent disabled:opacity-50"
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
            <UserRound className="h-10 w-10 opacity-40" />
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
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {/* Header */}
            <section className="shrink-0 border-b border-border bg-background">
              <div className="relative h-36 overflow-hidden bg-sidebar sm:h-44 lg:h-48">
                {artist.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artist.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <Link
                  href="/vault/artists"
                  className="absolute left-4 top-4 z-[1] inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/90 px-2.5 py-1.5 text-xs font-medium text-muted transition hover:text-foreground sm:left-6 lg:left-8"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Artists
                </Link>
              </div>

              <div className="mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6 lg:px-8">
                <div className="relative z-[1] -mt-10 flex items-start gap-4 sm:-mt-12 sm:gap-5">
                  <UserAvatar
                    src={artist.avatarUrl}
                    name={artist.displayName}
                    size="xl"
                    className="h-28 w-28 shrink-0 border-4 border-background text-3xl shadow-md sm:h-36 sm:w-36 sm:text-4xl"
                  />

                  <div className="min-w-0 flex-1 pt-11 sm:pt-[3.25rem]">
                    {artist.connectionRelation === "connected" && (
                      <span className="mb-1.5 inline-flex rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                        Connected
                      </span>
                    )}

                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl lg:leading-[1.15]">
                      {artist.displayName}
                    </h1>
                    <p className="mt-0.5 text-sm text-muted">@{artist.username}</p>
                  </div>
                </div>

                {artist.bio?.trim() && (
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/80 line-clamp-3">
                    {artist.bio.trim()}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <span className="tabular-nums text-foreground">
                    <strong className="font-semibold">{artist.songs.length}</strong>
                    <span className="ml-1 text-muted">
                      {artist.songs.length === 1 ? "song" : "songs"}
                    </span>
                  </span>
                  <span className="tabular-nums text-foreground">
                    <strong className="font-semibold">{totals.views}</strong>
                    <span className="ml-1 text-muted">views</span>
                  </span>
                  <span className="tabular-nums text-foreground">
                    <strong className="font-semibold">{totals.fires}</strong>
                    <span className="ml-1 text-muted">fires</span>
                  </span>
                </div>

                <ArtistSocialLinks
                  className="mt-4"
                  links={{
                    youtubeUrl: artist.youtubeUrl,
                    facebookUrl: artist.facebookUrl,
                    instagramUrl: artist.instagramUrl,
                    spotifyUrl: artist.spotifyUrl,
                    appleMusicUrl: artist.appleMusicUrl,
                  }}
                />

                <div className="mt-5">{renderActions()}</div>
              </div>
            </section>

            {/* Tracks */}
            <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Public songs
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {artist.songs.length === 0
                      ? "Nothing published yet"
                      : `${artist.songs.length} public track${artist.songs.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>

              {artist.songs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                  <Music2 className="mb-3 h-8 w-8 text-muted" />
                  <p className="text-sm font-medium">No public songs</p>
                  <p className="mt-1 max-w-xs text-sm text-muted">
                    When this artist publishes tracks, they&apos;ll appear here.
                  </p>
                </div>
              ) : (
                <ol className="overflow-hidden rounded-2xl border border-border bg-card">
                  {artist.songs.map((song, index) => (
                    <li
                      key={song.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <Link
                        href={`/vault/s/${song.id}`}
                        className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3.5 transition hover:bg-accent/[0.06] sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-4"
                      >
                        <span className="text-center font-mono text-xs tabular-nums text-muted transition group-hover:text-accent">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold tracking-tight transition group-hover:text-accent sm:text-[0.95rem]">
                            {song.title || "Untitled"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {[song.genre || null, new Date(song.updatedAt).toLocaleDateString()]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted sm:gap-4">
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
            </section>
          </div>
        )}
      </main>
    </VaultShell>
  );
}
