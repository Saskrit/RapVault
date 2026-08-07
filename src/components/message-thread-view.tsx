"use client";

import { ArrowLeft, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import {
  FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { UserAvatar } from "@/components/user-avatar";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultShell } from "@/components/vault-shell";
import { notifyMessagesRead } from "@/hooks/use-unread-messages";

type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt?: string | null;
  mine: boolean;
};

type Thread = {
  id: string;
  other: {
    id: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  messages: ChatMessage[];
};

type ThreadItem =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: ChatMessage };

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildThreadItems(messages: ChatMessage[]): ThreadItem[] {
  const items: ThreadItem[] = [];
  let lastDay: string | null = null;

  for (const message of messages) {
    const key = dayKey(message.createdAt);
    if (key !== lastDay) {
      items.push({
        kind: "day",
        key: `day-${key}`,
        label: formatDayLabel(message.createdAt),
      });
      lastDay = key;
    }
    items.push({ kind: "message", key: message.id, message });
  }

  return items;
}

export function MessageThreadView({
  conversationId,
}: {
  conversationId: string;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/messages/conversations/${conversationId}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setThread(data.conversation);
    setLoading(false);
    notifyMessagesRead();
  }, [conversationId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  const items = useMemo(
    () => buildThreadItems(thread?.messages || []),
    [thread?.messages],
  );

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setDraft("");
        setThread((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    ...data.message,
                    readAt: data.message.readAt ?? null,
                  },
                ],
              }
            : prev,
        );
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <VaultShell centerLabel={thread?.other?.displayName || "Messages"}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <RapVaultLoading label="Loading..." />
        ) : notFound || !thread ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-muted">
            <p>Conversation not found.</p>
            <Link href="/vault/messages" className="text-accent hover:underline">
              Back to inbox
            </Link>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8">
              <Link
                href="/vault/messages"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition hover:border-foreground/20 hover:text-foreground"
                aria-label="Back to inbox"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <UserAvatar
                src={thread.other?.avatarUrl}
                name={thread.other?.displayName || "Artist"}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {thread.other?.displayName || "Artist"}
                </p>
                {thread.other?.username && (
                  <Link
                    href={`/vault/artists/${thread.other.username}`}
                    className="text-xs text-muted hover:text-accent"
                  >
                    @{thread.other.username}
                  </Link>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3 sm:px-6 lg:px-8">
              {thread.messages.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">
                  Say hello — send the first message.
                </p>
              )}

              {items.map((item) => {
                if (item.kind === "day") {
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-center py-2"
                    >
                      <span className="rounded-md border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted shadow-sm">
                        {item.label}
                      </span>
                    </div>
                  );
                }

                const m = item.message;
                const read = Boolean(m.readAt);

                return (
                  <Fragment key={item.key}>
                    <div
                      className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[min(18rem,78%)] rounded-2xl px-2.5 py-1.5 text-[13px] leading-snug sm:max-w-[min(22rem,72%)] ${
                          m.mine
                            ? "rounded-br-md bg-accent text-white"
                            : "rounded-bl-md border border-border bg-card text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {m.body}
                        </p>
                        <div
                          className={`mt-0.5 flex items-center justify-end gap-1 ${
                            m.mine ? "text-white/75" : "text-muted"
                          }`}
                        >
                          <span className="text-[10px] tabular-nums leading-none">
                            {formatTime(m.createdAt)}
                          </span>
                          {m.mine && (
                            <span
                              className="inline-flex"
                              title={read ? "Read" : "Sent"}
                              aria-label={read ? "Read" : "Sent"}
                            >
                              {read ? (
                                <CheckCheck className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                              ) : (
                                <Check className="h-3.5 w-3.5 shrink-0 opacity-80" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex shrink-0 gap-2 border-t border-border bg-card p-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message..."
                maxLength={2000}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="min-h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </VaultShell>
  );
}
