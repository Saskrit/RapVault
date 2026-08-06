"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { VaultHeader, iconBtn } from "@/components/vault-header";

type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  mine: boolean;
};

type Thread = {
  id: string;
  other: {
    id: string;
    username: string | null;
    displayName: string;
  } | null;
  messages: ChatMessage[];
};

export function MessageThreadView({ conversationId }: { conversationId: string }) {
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
  }, [conversationId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

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
            ? { ...prev, messages: [...prev.messages, data.message] }
            : prev,
        );
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted">
        Loading...
      </div>
    );
  }

  if (notFound || !thread) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-6 text-muted">
        <p>Conversation not found.</p>
        <Link href="/vault/messages" className="text-accent hover:underline">
          Back to inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <VaultHeader>
        <Link
          href="/vault/messages"
          className={`${iconBtn} flex w-auto items-center gap-1.5 px-3 text-sm font-medium`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Inbox</span>
        </Link>
      </VaultHeader>

      <div className="border-b border-border bg-card px-4 py-3">
        <p className="font-semibold">
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

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {thread.messages.length === 0 && (
          <p className="text-center text-sm text-muted">
            Say hello — send the first message.
          </p>
        )}
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.mine
                  ? "bg-accent text-white"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p
                className={`mt-1 text-[10px] ${
                  m.mine ? "text-white/70" : "text-muted"
                }`}
              >
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message..."
          maxLength={2000}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="min-h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
