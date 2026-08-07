"use client";

import { ArrowUpRight, MessageSquare, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { VaultShell } from "@/components/vault-shell";
import type { ArtistSummary } from "@/types";

type SortMode = "alpha" | "active";

function letterFor(artist: ArtistSummary) {
  const ch = (artist.displayName || artist.username || "#")
    .trim()
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}

export function ArtistsDirectoryView() {
  const router = useRouter();
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortMode>("alpha");
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

  const sorted = useMemo(() => {
    const list = [...artists];
    if (sort === "active") {
      list.sort(
        (a, b) =>
          b.publicSongCount - a.publicSongCount ||
          a.displayName.localeCompare(b.displayName),
      );
    } else {
      list.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
      );
    }
    return list;
  }, [artists, sort]);

  const spotlight = useMemo(() => {
    if (q.trim()) return [];
    return [...artists]
      .sort((a, b) => b.publicSongCount - a.publicSongCount)
      .slice(0, 6);
  }, [artists, q]);

  const groups = useMemo(() => {
    if (sort !== "alpha") {
      return [{ letter: "All", items: sorted }];
    }
    const map = new Map<string, ArtistSummary[]>();
    for (const artist of sorted) {
      const letter = letterFor(artist);
      const bucket = map.get(letter) || [];
      bucket.push(artist);
      map.set(letter, bucket);
    }
    return Array.from(map.entries()).map(([letter, items]) => ({
      letter,
      items,
    }));
  }, [sorted, sort]);

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
    <VaultShell>
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          {/* Masthead */}
          <header className="artists-masthead border-b border-border pb-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                  Vault · Directory
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-[3.5rem]">
                  Artists
                </h1>
              </div>
              <div className="flex items-baseline gap-6 font-mono text-sm tabular-nums text-muted">
                <p>
                  <span className="text-foreground">
                    {loading ? "—" : artists.length}
                  </span>{" "}
                  writers
                </p>
                <p>
                  <span className="text-foreground">
                    {loading ? "—" : totalPublic}
                  </span>{" "}
                  public
                </p>
              </div>
            </div>

            <p className="mt-3 max-w-lg text-sm text-muted">
              Browse public writers, open a profile, or start a DM.
            </p>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="relative block min-w-0 flex-1 sm:max-w-md">
                <span className="sr-only">Search artists</span>
                <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name or @username"
                  className="w-full border-0 border-b border-border bg-transparent py-3 pl-7 pr-2 text-base outline-none transition placeholder:text-muted/70 focus:border-foreground"
                />
              </label>

              <div
                className="flex gap-1 border-b border-border"
                role="tablist"
                aria-label="Sort artists"
              >
                {(
                  [
                    { id: "alpha", label: "A–Z" },
                    { id: "active", label: "Most active" },
                  ] as const
                ).map((option) => {
                  const active = sort === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSort(option.id)}
                      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Spotlight strip */}
          {!loading && spotlight.length > 0 && (
            <section className="mt-8" aria-label="Active writers">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  On the board
                </h2>
                <p className="text-xs text-muted">By public songs</p>
              </div>
              <ul className="artists-spotlight -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0">
                {spotlight.map((artist, index) => (
                  <li
                    key={artist.id}
                    className="artists-rise shrink-0"
                    style={{
                      animationDelay: `${Math.min(index, 8) * 45}ms`,
                    }}
                  >
                    <Link
                      href={`/vault/artists/${artist.username}`}
                      className="group relative block w-[11.5rem] overflow-hidden border border-border bg-card outline-none transition hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-foreground/30 sm:w-[13rem]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-sidebar">
                        {artist.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artist.coverUrl}
                            alt=""
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserAvatar
                              src={artist.avatarUrl}
                              name={artist.displayName}
                              size="lg"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-2.5 border-t border-border p-3">
                        <UserAvatar
                          src={artist.avatarUrl}
                          name={artist.displayName}
                          size="sm"
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold tracking-tight">
                            {artist.displayName}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted">
                            @{artist.username}
                          </p>
                          <p className="mt-1.5 text-[11px] tabular-nums text-muted">
                            {artist.publicSongCount} public
                          </p>
                        </div>
                        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Index */}
          <section className="mt-10" aria-label="Artist index">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[4.5rem] animate-pulse border border-border/60 bg-sidebar/80"
                  />
                ))}
              </div>
            ) : artists.length === 0 ? (
              <div className="flex min-h-[18rem] flex-col items-center justify-center border border-dashed border-border px-6 text-center">
                <Users className="mb-3 h-8 w-8 text-muted" />
                <p className="text-sm font-medium">No artists found</p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  Claim a username in settings to appear here, or try another
                  search.
                </p>
                <Link
                  href="/vault/settings"
                  className="mt-5 inline-flex min-h-10 items-center border border-foreground bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90"
                >
                  Open settings
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {groups.map((group) => (
                  <div key={group.letter}>
                    {sort === "alpha" && (
                      <div className="sticky top-0 z-[1] -mx-1 mb-2 flex items-center gap-3 bg-background/95 px-1 py-2 backdrop-blur-sm">
                        <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                          {group.letter}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                        <span className="font-mono text-[11px] tabular-nums text-muted">
                          {group.items.length}
                        </span>
                      </div>
                    )}

                    <ul className="divide-y divide-border border border-border">
                      {group.items.map((artist, index) => (
                        <li
                          key={artist.id}
                          className="artists-rise group relative"
                          style={{
                            animationDelay: `${Math.min(index, 14) * 28}ms`,
                          }}
                        >
                          <Link
                            href={`/vault/artists/${artist.username}`}
                            className="artists-row flex items-center gap-3 py-3 pl-3 pr-12 outline-none transition hover:bg-sidebar focus-visible:bg-sidebar sm:gap-4 sm:px-4 sm:py-3.5 sm:pr-16"
                          >
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 w-0.5 bg-foreground opacity-0 transition group-hover:opacity-100"
                            />
                            <UserAvatar
                              src={artist.avatarUrl}
                              name={artist.displayName}
                              size="md"
                              className="h-12 w-12 sm:h-14 sm:w-14"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <p className="truncate text-[0.95rem] font-semibold tracking-tight sm:text-base">
                                  {artist.displayName}
                                </p>
                                <p className="truncate font-mono text-xs text-muted">
                                  @{artist.username}
                                </p>
                              </div>
                              {artist.bio?.trim() ? (
                                <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                                  {artist.bio.trim()}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-sm text-muted/70">
                                  No bio yet
                                </p>
                              )}
                            </div>
                            <div className="hidden shrink-0 text-right sm:block">
                              <p className="font-mono text-sm tabular-nums text-foreground">
                                {artist.publicSongCount}
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                                public
                              </p>
                            </div>
                            <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-muted transition group-hover:text-foreground sm:block" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => startMessage(artist.username)}
                            disabled={messaging === artist.username}
                            className="absolute right-2 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-border bg-background text-muted transition hover:border-foreground hover:text-foreground disabled:opacity-50 sm:right-14 sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                            aria-label={`Message ${artist.displayName}`}
                            title="Message"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </VaultShell>
  );
}
