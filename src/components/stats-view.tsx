"use client";

import {
  BarChart3,
  Eye,
  Flame,
  Globe,
  Network,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultShell } from "@/components/vault-shell";

type StatsPayload = {
  overview: {
    totalSongs: number;
    publicSongs: number;
    draftSongs: number;
    finishedSongs: number;
    totalViews: number;
    totalFires: number;
    uniqueViewers30d: number;
    networkSize: number;
    incomingRequests: number;
    collaboratorsInvited: number;
    collaborationsJoined: number;
  };
  viewsByDay: Array<{ date: string; views: number }>;
  topSongs: Array<{
    id: string;
    title: string;
    isPublic: boolean;
    viewCount: number;
    fireCount: number;
    uniqueViewers: number;
    collaboratorCount: number;
    updatedAt: string;
  }>;
  recentPublic: Array<{
    id: string;
    title: string;
    viewCount: number;
    fireCount: number;
    updatedAt: string;
  }>;
};

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortDay(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function StatsView() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/stats");
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxDayViews = Math.max(
    1,
    ...(data?.viewsByDay.map((d) => d.views) || [1]),
  );

  return (
    <VaultShell centerLabel="Stats">
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-52"
        >
          <div className="absolute left-10 top-0 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute right-16 top-8 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-8">
            <div className="type-eyebrow inline-flex items-center gap-2 text-muted">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              Analytics
            </div>
            <h1 className="type-h1 mt-2">
              Stats
            </h1>
            <p className="measure mt-1.5 text-sm text-muted">
              Track how your vault and public bars are performing — views,
              engagement, network, and collaborations.
            </p>
          </header>

          {loading || !data ? (
            <RapVaultLoading compact label="Loading..." className="min-h-[12rem]" />
          ) : (
            <div className="space-y-8">
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  {
                    label: "Total views",
                    value: data.overview.totalViews,
                    icon: Eye,
                  },
                  {
                    label: "Fires",
                    value: data.overview.totalFires,
                    icon: Flame,
                  },
                  {
                    label: "Public songs",
                    value: data.overview.publicSongs,
                    icon: Globe,
                  },
                  {
                    label: "Vault songs",
                    value: data.overview.totalSongs,
                    icon: TrendingUp,
                  },
                  {
                    label: "Network",
                    value: data.overview.networkSize,
                    icon: Network,
                  },
                  {
                    label: "Viewers (30d)",
                    value: data.overview.uniqueViewers30d,
                    icon: Users,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-border/80 bg-card/70 px-3.5 py-3.5 backdrop-blur"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        {card.label}
                      </p>
                      <card.icon className="h-3.5 w-3.5 text-muted" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                      {formatCompact(card.value)}
                    </p>
                  </div>
                ))}
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="rounded-[1.35rem] border border-border bg-card/60 p-4 sm:p-5">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight">
                        Unique viewers
                      </h2>
                      <p className="text-xs text-muted">Last 30 days</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-accent">
                      {data.overview.uniqueViewers30d}
                    </p>
                  </div>
                  <div className="flex h-40 items-end gap-1 sm:gap-1.5">
                    {data.viewsByDay.map((day) => {
                      const height = Math.max(
                        4,
                        Math.round((day.views / maxDayViews) * 100),
                      );
                      return (
                        <div
                          key={day.date}
                          className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
                          title={`${shortDay(day.date)}: ${day.views}`}
                        >
                          <div
                            className="w-full rounded-t-md bg-accent/80 transition group-hover:bg-accent"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span>{shortDay(data.viewsByDay[0]?.date || "")}</span>
                    <span>
                      {shortDay(
                        data.viewsByDay[data.viewsByDay.length - 1]?.date ||
                          "",
                      )}
                    </span>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-border bg-card/60 p-4 sm:p-5">
                  <h2 className="text-base font-semibold tracking-tight">
                    Catalog mix
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    How your vault is split right now
                  </p>
                  <dl className="mt-5 space-y-3">
                    {[
                      ["Drafts", data.overview.draftSongs],
                      ["Finished", data.overview.finishedSongs],
                      ["Public", data.overview.publicSongs],
                      ["Collabs invited", data.overview.collaboratorsInvited],
                      ["Collabs joined", data.overview.collaborationsJoined],
                      ["Pending requests", data.overview.incomingRequests],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0"
                      >
                        <dt className="text-sm text-muted">{label}</dt>
                        <dd className="text-sm font-semibold tabular-nums">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>

              <section className="rounded-[1.35rem] border border-border bg-card/60 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">
                      Top songs
                    </h2>
                    <p className="text-xs text-muted">
                      Ranked by lifetime views
                    </p>
                  </div>
                  <Link
                    href="/vault"
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Open vault
                  </Link>
                </div>

                {data.topSongs.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">
                    Write and publish songs to see performance here.
                  </p>
                ) : (
                  <ol className="divide-y divide-border">
                    {data.topSongs.map((song, index) => (
                      <li key={song.id}>
                        <Link
                          href={`/vault/write/${song.id}`}
                          className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3 transition hover:bg-accent/[0.04] sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_auto]"
                        >
                          <span className="text-center font-mono text-xs tabular-nums text-muted">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold transition group-hover:text-accent">
                              {song.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {song.isPublic ? "Public" : "Personal"}
                              {song.collaboratorCount > 0
                                ? ` · ${song.collaboratorCount} collab`
                                : ""}
                            </p>
                          </div>
                          <div className="hidden items-center gap-3 text-xs tabular-nums text-muted sm:flex">
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              {song.viewCount}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Flame className="h-3.5 w-3.5" />
                              {song.fireCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs tabular-nums text-muted sm:hidden">
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              {song.viewCount}
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
        </div>
      </main>
    </VaultShell>
  );
}
