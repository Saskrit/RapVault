"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultShell } from "@/components/vault-shell";
import {
  UnreadBadge,
  useUnreadMessages,
} from "@/hooks/use-unread-messages";

type ConversationRow = {
  id: string;
  updatedAt: string;
  unreadCount?: number;
  other: {
    id: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatInboxDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function MessagesInboxView() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { unreadCount, refreshUnread } = useUnreadMessages();

  const load = useCallback(async () => {
    const res = await fetch("/api/messages/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
    setLoading(false);
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <VaultShell centerLabel="Messages">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-4 py-5 sm:px-6 lg:px-8">
          <p className="type-eyebrow text-muted">Inbox</p>
          <h1 className="type-h1 mt-2 flex items-center gap-2">
            <span className="relative inline-flex">
              <MessageSquare className="h-7 w-7 text-accent" />
              <UnreadBadge
                count={unreadCount}
                className="-right-2 -top-1 h-5 min-w-5 text-[11px]"
              />
            </span>
            Messages
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-sm font-semibold text-accent">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Direct messages with other artists. Start a chat from an artist
            profile.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {loading ? (
            <RapVaultLoading compact label="Loading..." className="min-h-[12rem]" />
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted">
              No conversations yet.{" "}
              <Link
                href="/vault/artists"
                className="text-accent hover:underline"
              >
                Find artists
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {conversations.map((c) => {
                const unread = c.unreadCount ?? 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/vault/messages/${c.id}`}
                      className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:border-foreground/15 ${
                        unread > 0
                          ? "border-accent/30 bg-accent/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <UserAvatar
                          src={c.other?.avatarUrl}
                          name={c.other?.displayName || "Artist"}
                          size="md"
                        />
                        {unread > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`truncate ${
                              unread > 0 ? "font-bold" : "font-semibold"
                            }`}
                          >
                            {c.other?.displayName || "Artist"}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            {unread > 0 && (
                              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                            <span className="text-xs text-muted">
                              {formatInboxDate(
                                c.lastMessage?.createdAt || c.updatedAt,
                              )}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`mt-0.5 truncate text-sm ${
                            unread > 0
                              ? "font-medium text-foreground"
                              : "text-muted"
                          }`}
                        >
                          {c.lastMessage?.body || "No messages yet"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </VaultShell>
  );
}
