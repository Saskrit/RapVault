"use client";

import {
  Check,
  Link2,
  Loader2,
  MessageSquare,
  Network,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultShell } from "@/components/vault-shell";

type NetworkArtist = {
  id: string;
  username: string | null;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
};

type NetworkRow = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  artist: NetworkArtist;
};

type Tab = "connections" | "incoming" | "outgoing";

export function NetworkView() {
  const router = useRouter();
  const [connections, setConnections] = useState<NetworkRow[]>([]);
  const [incoming, setIncoming] = useState<NetworkRow[]>([]);
  const [outgoing, setOutgoing] = useState<NetworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("connections");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/network");
    if (res.ok) {
      const data = await res.json();
      setConnections(data.connections || []);
      setIncoming(data.incoming || []);
      setOutgoing(data.outgoing || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/network");
      if (!cancelled && res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
        setIncoming(data.incoming || []);
        setOutgoing(data.outgoing || []);
        if ((data.incoming?.length || 0) > 0) {
          setTab("incoming");
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const source =
      tab === "connections"
        ? connections
        : tab === "incoming"
          ? incoming
          : outgoing;
    const query = q.trim().toLowerCase();
    if (!query) return source;
    return source.filter((row) => {
      const a = row.artist;
      return (
        a.displayName.toLowerCase().includes(query) ||
        (a.username || "").toLowerCase().includes(query) ||
        (a.bio || "").toLowerCase().includes(query)
      );
    });
  }, [tab, connections, incoming, outgoing, q]);

  async function accept(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/network/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/network/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  async function removeOrCancel(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/network/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  async function startMessage(username: string | null, userId: string) {
    if (!username) return;
    setMessagingId(userId);
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
      setMessagingId(null);
    }
  }

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "connections", label: "Connected", count: connections.length },
    { id: "incoming", label: "Requests", count: incoming.length },
    { id: "outgoing", label: "Sent", count: outgoing.length },
  ];

  return (
    <VaultShell centerLabel="Network">
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden"
        >
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute right-10 top-8 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-border px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="type-eyebrow inline-flex items-center gap-2 text-muted">
                  <Network className="h-3.5 w-3.5 text-accent" />
                  Community
                </div>
                <h1 className="type-h1 mt-2">
                  Network
                </h1>
                <p className="measure mt-1.5 text-sm text-muted">
                  Connect with artists, manage requests, and keep your circle
                  close.
                </p>
              </div>
              <Link
                href="/vault/artists"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-sm font-medium transition hover:border-accent hover:text-accent"
              >
                <UserPlus className="h-4 w-4" />
                Find artists
              </Link>
            </div>

            <div className="mx-auto mt-5 flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 rounded-2xl border border-border bg-card/70 p-1 backdrop-blur">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
                      tab === item.id
                        ? "bg-accent text-white"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                        tab === item.id
                          ? "bg-white/20 text-white"
                          : "bg-background text-muted"
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter by name..."
                  className="w-full min-h-10 rounded-xl border border-border bg-card/80 py-2 pl-10 pr-3 text-base outline-none focus:border-accent"
                />
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              {loading ? (
                <RapVaultLoading compact label="Loading..." className="min-h-[12rem]" />
              ) : rows.length === 0 ? (
                <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border px-6 text-center">
                  <Link2 className="mb-3 h-7 w-7 text-muted" />
                  <p className="text-sm font-medium">
                    {tab === "connections"
                      ? "No connections yet"
                      : tab === "incoming"
                        ? "No pending requests"
                        : "No sent requests"}
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-muted">
                    {tab === "connections"
                      ? "Browse artists and send a connection request to grow your network."
                      : tab === "incoming"
                        ? "When someone wants to connect, their request lands here."
                        : "Requests you send will show here until they’re accepted."}
                  </p>
                  {tab === "connections" && (
                    <Link
                      href="/vault/artists"
                      className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Browse artists
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {rows.map((row) => {
                    const artist = row.artist;
                    const busy = busyId === row.id;
                    return (
                      <li
                        key={row.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <Link
                          href={
                            artist.username
                              ? `/vault/artists/${artist.username}`
                              : "/vault/artists"
                          }
                          className="flex min-w-0 items-center gap-3 transition hover:opacity-90"
                        >
                          <UserAvatar
                            src={artist.avatarUrl}
                            name={artist.displayName}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold tracking-tight">
                              {artist.displayName}
                            </p>
                            <p className="truncate text-sm text-muted">
                              {artist.username
                                ? `@${artist.username}`
                                : "Artist"}
                              {artist.bio ? ` · ${artist.bio}` : ""}
                            </p>
                          </div>
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {tab === "incoming" && (
                            <>
                              <button
                                type="button"
                                onClick={() => accept(row.id)}
                                disabled={busy}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => decline(row.id)}
                                disabled={busy}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                                Decline
                              </button>
                            </>
                          )}

                          {tab === "outgoing" && (
                            <button
                              type="button"
                              onClick={() => removeOrCancel(row.id)}
                              disabled={busy}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                              Cancel
                            </button>
                          )}

                          {tab === "connections" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  startMessage(artist.username, artist.id)
                                }
                                disabled={
                                  !artist.username ||
                                  messagingId === artist.id
                                }
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium transition hover:border-accent hover:text-accent disabled:opacity-50"
                              >
                                {messagingId === artist.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-3.5 w-3.5" />
                                )}
                                Message
                              </button>
                              <button
                                type="button"
                                onClick={() => removeOrCancel(row.id)}
                                disabled={busy}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                                title="Remove connection"
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserMinus className="h-3.5 w-3.5" />
                                )}
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </VaultShell>
  );
}
