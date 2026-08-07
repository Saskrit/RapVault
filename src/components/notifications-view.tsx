"use client";

import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Loader2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultShell } from "@/components/vault-shell";
import {
  useNotifications,
  type AppNotification,
} from "@/hooks/use-notifications";

function formatNotifTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function NotificationRow({ item }: { item: AppNotification }) {
  return (
    <li>
      <Link
        href={item.href}
        className={`group flex gap-3 border-b border-border px-4 py-4 transition last:border-b-0 hover:bg-sidebar sm:px-5 ${
          item.unread ? "bg-accent/[0.04]" : ""
        }`}
      >
        <div className="relative shrink-0">
          {item.artist ? (
            <UserAvatar
              src={item.artist.avatarUrl}
              name={item.artist.displayName}
              size="md"
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-muted">
              <UserPlus className="h-4 w-4" />
            </span>
          )}
          {item.unread && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`text-sm leading-snug ${
                item.unread ? "font-semibold text-foreground" : "text-foreground/90"
              }`}
            >
              {item.body}
            </p>
            <time className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
              {formatNotifTime(item.createdAt)}
            </time>
          </div>
          <p className="mt-1 text-xs text-muted">{item.title}</p>
          {item.artist?.username && (
            <p className="mt-0.5 font-mono text-[11px] text-muted">
              @{item.artist.username}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export function NotificationsView() {
  const { notifications, unreadCount, loading, markAllRead, refresh } =
    useNotifications(15000);
  const [marking, setMarking] = useState(false);

  const groups = useMemo(() => {
    const unread = notifications.filter((n) => n.unread);
    const earlier = notifications.filter((n) => !n.unread);
    return { unread, earlier };
  }, [notifications]);

  async function handleMarkAll() {
    setMarking(true);
    try {
      await markAllRead();
      await refresh();
    } finally {
      setMarking(false);
    }
  }

  return (
    <VaultShell centerLabel="Notifications">
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Link
                href="/vault"
                className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                Inbox
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Notifications
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                {unreadCount > 0
                  ? `${unreadCount} unread connection request${unreadCount === 1 ? "" : "s"}`
                  : "You're all caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              disabled={marking || unreadCount === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-muted transition hover:border-foreground/25 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {marking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all as read
            </button>
          </div>

          {loading ? (
            <RapVaultLoading label="Loading notifications..." />
          ) : notifications.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center border border-dashed border-border px-6 py-16 text-center">
              <Bell className="mb-3 h-9 w-9 text-muted opacity-50" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                When someone sends a connection request, it will show up here.
              </p>
              <Link
                href="/vault/network"
                className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-foreground bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90"
              >
                Open network
              </Link>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-8">
              {groups.unread.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                      New
                    </h2>
                    <span className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[11px] tabular-nums text-muted">
                      {groups.unread.length}
                    </span>
                  </div>
                  <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                    {groups.unread.map((item) => (
                      <NotificationRow key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              )}

              {groups.earlier.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                      Earlier
                    </h2>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                    {groups.earlier.map((item) => (
                      <NotificationRow key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </VaultShell>
  );
}
