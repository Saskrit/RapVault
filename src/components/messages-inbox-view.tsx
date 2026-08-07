"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { VaultHeader } from "@/components/vault-header";

type ConversationRow = {
  id: string;
  updatedAt: string;
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

export function MessagesInboxView() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/messages/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <VaultHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Inbox
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <MessageSquare className="h-7 w-7 text-accent" />
            Messages
          </h1>
          <p className="mt-2 text-sm text-muted">
            Direct messages with other artists. Start a chat from an artist
            profile.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : conversations.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted">
            No conversations yet.{" "}
            <Link href="/vault/artists" className="text-accent hover:underline">
              Find artists
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/vault/messages/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-foreground/15"
                >
                  <UserAvatar
                    src={c.other?.avatarUrl}
                    name={c.other?.displayName || "Artist"}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-semibold">
                        {c.other?.displayName || "Artist"}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted">
                        {new Date(c.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {c.lastMessage?.body || "No messages yet"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
