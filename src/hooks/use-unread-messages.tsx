"use client";

import { useCallback, useEffect, useState } from "react";

export const MESSAGES_READ_EVENT = "rapvault:messages-read";

export function notifyMessagesRead() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
}

/** Polls total unread DM count for header / sidebar badges. */
export function useUnreadMessages(pollMs = 20000) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread");
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      setUnreadCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      // ignore offline / private mode
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const interval = window.setInterval(() => void refreshUnread(), pollMs);
    function onRead() {
      void refreshUnread();
    }
    window.addEventListener(MESSAGES_READ_EVENT, onRead);
    function onVisible() {
      if (document.visibilityState === "visible") void refreshUnread();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(MESSAGES_READ_EVENT, onRead);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollMs, refreshUnread]);

  return { unreadCount, refreshUnread };
}

export function UnreadBadge({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white shadow-sm ${className}`}
      aria-label={`${count} unread`}
    >
      {label}
    </span>
  );
}
