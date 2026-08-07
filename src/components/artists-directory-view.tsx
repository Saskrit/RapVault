"use client";

import { MessageSquare, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { VaultShell } from "@/components/vault-shell";
import type { ArtistSummary } from "@/types";

function avatarTone(seed: string) {
  const hues = [262, 198, 32, 152, 340, 220];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return hues[hash % hues.length];
}

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

  const totalPublic = useMemo(
    () => artists.reduce((sum, a) => sum + (a.publicSongCount || 0), 0),
    [artists],
  );

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
    <VaultShell centerLabel="Artists">
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        {/* Atmosphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden"
        >
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl dark:bg-accent/25" />
          <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-10">
          {/* Sticky intro rail */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="type-eyebrow inline-flex items-center gap-2 text-muted">
              <Users className="h-3.5 w-3.5 text-accent" />
              Community
            </div>
            <h1 className="type-h1 mt-3">
              Artists
            </h1>
            <p className="measure mt-3 text-sm text-muted">
              Find writers on RapVault, open their public bars, and start a DM.
            </p>

            <div className="mt-6 flex gap-6 border-y border-border/80 py-4">
              <div>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {loading ? "—" : artists.length}
                </p>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Artists
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {loading ? "—" : totalPublic}
                </p>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Public songs
                </p>
              </div>
            </div>

            <div className="relative mt-6">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or @username"
                className="w-full min-h-12 rounded-2xl border border-border bg-card/80 py-3 pl-11 pr-4 text-base outline-none backdrop-blur transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </aside>

          {/* Discovery grid */}
          <section className="min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] animate-pulse rounded-[1.35rem] bg-border/40"
                  />
                ))}
              </div>
            ) : artists.length === 0 ? (
              <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border px-6 text-center">
                <Users className="mb-3 h-8 w-8 text-muted" />
                <p className="text-sm font-medium text-foreground">
                  No artists found
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  Claim a username in settings to appear here, or try another
                  search.
                </p>
                <Link
                  href="/vault/settings"
                  className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Open settings
                </Link>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {artists.map((artist, index) => {
                  const hue = avatarTone(artist.username || artist.id);
                  const featured = index === 0 && !q.trim();
                  return (
                    <li
                      key={artist.id}
                      className={`artists-rise group relative ${
                        featured
                          ? "col-span-2 row-span-1 sm:col-span-2 sm:row-span-2"
                          : ""
                      }`}
                      style={{
                        animationDelay: `${Math.min(index, 12) * 35}ms`,
                      }}
                    >
                      <Link
                        href={`/vault/artists/${artist.username}`}
                        className={`relative flex h-full overflow-hidden rounded-[1.35rem] border border-border/70 bg-card outline-none transition duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_18px_40px_-28px_rgba(124,58,237,0.55)] focus-visible:ring-2 focus-visible:ring-accent ${
                          featured ? "min-h-[18rem] sm:min-h-full" : "aspect-[3/4]"
                        }`}
                      >
                        <div
                          className="absolute inset-0 opacity-90 transition duration-500 group-hover:scale-105"
                          style={{
                            background: `linear-gradient(160deg, hsl(${hue} 70% 46% / 0.28), transparent 55%), linear-gradient(0deg, var(--card), transparent 45%)`,
                          }}
                        />
                        <div className="relative z-[1] flex h-full w-full flex-col p-3.5 sm:p-4">
                          <div className="flex items-start justify-between gap-2">
                            <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted backdrop-blur">
                              {artist.publicSongCount} public
                            </span>
                            <span className="h-9 w-9" aria-hidden />
                          </div>

                          <div
                            className={`mt-auto flex ${
                              featured
                                ? "flex-row items-end gap-4"
                                : "flex-col items-start gap-3"
                            }`}
                          >
                            <UserAvatar
                              src={artist.avatarUrl}
                              name={artist.displayName}
                              size={featured ? "xl" : "lg"}
                              className="border-2 border-background/80 shadow-lg"
                            />
                            <div className="min-w-0">
                              <p
                                className={`truncate font-semibold tracking-tight ${
                                  featured ? "text-2xl sm:text-3xl" : "text-base"
                                }`}
                              >
                                {artist.displayName}
                              </p>
                              <p className="truncate text-sm text-muted">
                                @{artist.username}
                              </p>
                              {artist.bio && featured && (
                                <p className="mt-2 line-clamp-2 max-w-md text-sm text-muted">
                                  {artist.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => startMessage(artist.username)}
                        disabled={messaging === artist.username}
                        className="absolute right-3.5 top-3.5 z-[2] flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-muted backdrop-blur transition hover:border-accent hover:text-accent disabled:opacity-50 sm:right-4 sm:top-4 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        aria-label={`Message ${artist.displayName}`}
                        title="Message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </VaultShell>
  );
}
