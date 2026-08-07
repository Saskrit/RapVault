"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultShell } from "@/components/vault-shell";

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
    <VaultShell centerLabel="Messages">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-4 py-5 sm:px-6 lg:px-8">
          <p className="type-eyebrow text-muted">Inbox</p>
          <h1 className="type-h1 mt-2 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-accent" />
            Messages
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
                        <span className="shrink-0 text-xs text-muted">
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
        </div>
      </main>
    </VaultShell>
  );
}
