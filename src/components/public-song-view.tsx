"use client";

import { ArrowLeft, Eye, Globe, Music2, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BeatPlayerPanel } from "@/components/beat-player-panel";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { ResizableSplit } from "@/components/resizable-split";
import { VaultHeader, iconBtn, labelBtn } from "@/components/vault-header";
import { notifyNotificationsUpdated } from "@/hooks/use-notifications";
import {
  cachePublicSong,
  getCachedPublicSong,
  isBrowserOffline,
} from "@/lib/offline-songs";
import { contentToHtml } from "@/lib/rich-text";
import { calculateLyricStats, formatDuration } from "@/lib/stats";

type CollabStatus = "none" | "pending" | "accepted" | "owner";

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
  connected: boolean;
  collabStatus: CollabStatus;
  canRequestCollab: boolean;
};

export function PublicSongView({ songId }: { songId: string }) {
  const [song, setSong] = useState<PublicSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [firing, setFiring] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [collabMessage, setCollabMessage] = useState<string | null>(null);
  const [beatsOpen, setBeatsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/songs/${songId}/public`);
      if (!res.ok) {
        const cached = await getCachedPublicSong(songId);
        if (cached) {
          setSong(cached as PublicSong);
          setLoading(false);
          return;
        }
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const next = data.song as PublicSong;
      await cachePublicSong(next);
      setSong(next);
      setLoading(false);

      if (!isBrowserOffline()) {
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
      }
    } catch {
      const cached = await getCachedPublicSong(songId);
      if (cached) {
        setSong(cached as PublicSong);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }
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
    if (!song || firing || song.isOwner) return;
    if (isBrowserOffline()) return;
    setFiring(true);
    try {
      const res = await fetch(`/api/songs/${songId}/react`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      const next = song
        ? {
            ...song,
            fired: data.fired as boolean,
            fireCount: data.fireCount as number,
          }
        : null;
      if (next) {
        setSong(next);
        await cachePublicSong(next);
      }
    } finally {
      setFiring(false);
    }
  }

  async function requestCollab() {
    if (!song || requesting || !song.canRequestCollab) return;
    if (isBrowserOffline()) {
      setCollabMessage("Connect to the internet to request a collab.");
      return;
    }
    setRequesting(true);
    setCollabMessage(null);
    try {
      const res = await fetch(`/api/songs/${songId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCollabMessage(
          typeof data.error === "string"
            ? data.error
            : "Could not send collab request",
        );
        return;
      }
      const next = song
        ? {
            ...song,
            collabStatus: "pending" as const,
            canRequestCollab: false,
          }
        : null;
      if (next) {
        setSong(next);
        await cachePublicSong(next);
      }
      setCollabMessage("Collab request sent — waiting for the owner.");
      notifyNotificationsUpdated();
    } finally {
      setRequesting(false);
    }
  }

  const stats = song
    ? calculateLyricStats(song.content)
    : { words: 0, lines: 0, estimatedSeconds: 0 };

  if (loading) {
    return <RapVaultLoading fullScreen label="Loading..." />;
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
          className={labelBtn}
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

          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
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
              className={`${iconBtn} pointer-events-none border-emerald-500/40 bg-emerald-500/10 text-emerald-500`}
              title="Public"
              aria-label="Public song"
            >
              <Globe className="h-4 w-4" aria-hidden />
            </span>

            {song.isOwner && (
              <Link
                href={`/vault/write/${song.id}`}
                className={labelBtn}
                title="Edit view"
                aria-label="Open edit view"
              >
                <Pencil className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            )}

            {song.canRequestCollab && (
              <button
                type="button"
                onClick={() => void requestCollab()}
                disabled={requesting}
                className={`${labelBtn} border-accent/40 text-accent hover:border-accent hover:bg-accent/10 hover:text-accent`}
                aria-label="Request to collaborate"
                title="Request collab"
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">
                  {requesting ? "Sending..." : "Request collab"}
                </span>
              </button>
            )}

            {song.collabStatus === "pending" && !song.isOwner && (
              <span
                className={`${labelBtn} pointer-events-none border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Request pending</span>
              </span>
            )}

            {song.collabStatus === "accepted" && !song.isOwner && (
              <Link
                href={`/vault/write/${song.id}`}
                className={`${labelBtn} border-accent/40 text-accent`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Open collab</span>
              </Link>
            )}

            {!song.isOwner && (
              <button
                type="button"
                onClick={toggleFire}
                disabled={firing || isBrowserOffline()}
                className={`${labelBtn} min-w-[2.75rem] ${
                  song.fired
                    ? "border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-400"
                    : "hover:border-orange-500/40 hover:text-orange-500"
                }`}
                aria-label={song.fired ? "Remove fire" : "React with fire"}
                title="Fire"
              >
                <span className="text-base leading-none" aria-hidden>
                  🔥
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {song.fireCount}
                </span>
              </button>
            )}

            {song.isOwner && (
              <span
                className={`${labelBtn} pointer-events-none min-w-[2.75rem]`}
                title="Fires"
                aria-label={`${song.fireCount} fires`}
              >
                <span className="text-base leading-none" aria-hidden>
                  🔥
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {song.fireCount}
                </span>
              </span>
            )}
          </div>
        </div>
        {collabMessage && (
          <p className="mt-2 text-xs text-muted sm:text-sm">{collabMessage}</p>
        )}
      </div>

      {/* Same split layout as edit view */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ResizableSplit
          secondaryVisible={beatsOpen}
          storageKey="rapvault-editor-split"
          defaultSecondarySize={360}
          primary={
            <div className="flex h-full min-h-0 flex-col bg-editor">
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-border px-3 py-2 text-xs text-muted sm:text-xs">
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
