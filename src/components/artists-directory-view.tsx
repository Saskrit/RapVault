"use client";

import { MessageSquare, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { VaultHeader } from "@/components/vault-header";
import type { ArtistSummary } from "@/types";

export function ArtistsDirectoryView() {
  const router = useRouter();
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    const params = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await fetch(`/api/artists${params}`);
    if (res.ok) {
      const data = await res.json();
      setArtists(data.artists);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  async function startMessage(username: string) {
    setMessaging(username);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/vault/messages/${data.conversationId}`);
      }
    } finally {
      setMessaging(null);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <VaultHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Discover
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Users className="h-7 w-7 text-accent" />
            Artists
          </h1>
          <p className="mt-2 text-sm text-muted">
            Browse artists on RapVault and open their public bars.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or @username"
            className="w-full min-h-11 rounded-2xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm outline-none focus:border-accent"
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading artists...</p>
        ) : artists.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted">
            No artists found. Claim a username in settings to appear here.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {artists.map((artist) => (
              <li
                key={artist.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4"
              >
                <Link
                  href={`/vault/artists/${artist.username}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <UserAvatar
                    src={artist.avatarUrl}
                    name={artist.displayName}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{artist.displayName}</p>
                    <p className="truncate text-sm text-muted">
                      @{artist.username}
                      {artist.publicSongCount > 0
                        ? ` · ${artist.publicSongCount} public`
                        : ""}
                    </p>
                    {artist.bio && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted">
                        {artist.bio}
                      </p>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => startMessage(artist.username)}
                  disabled={messaging === artist.username}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Message</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
