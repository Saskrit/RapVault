"use client";

import { useCallback, useEffect, useState } from "react";

export const NOTIFICATIONS_UPDATED_EVENT = "rapvault:notifications-updated";

export type AppNotification = {
  id: string;
  type: "network_request";
  title: string;
  body: string;
  href: string;
  createdAt: string;
  unread?: boolean;
  artist?: {
    id: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
  };
};

export function notifyNotificationsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

export function useNotifications(pollMs = 20000, limit?: number) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const qs = limit ? `?limit=${limit}` : "";
      const res = await fetch(`/api/notifications${qs}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: AppNotification[];
        counts?: { unread?: number; total?: number };
      };
      setNotifications(data.notifications || []);
      setUnreadCount(
        typeof data.counts?.unread === "number"
          ? data.counts.unread
          : (data.notifications || []).filter((n) => n.unread).length,
      );
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) return false;
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
      notifyNotificationsUpdated();
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), pollMs);
    function onUpdated() {
      void refresh();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollMs, refresh]);

  return {
    notifications,
    count: unreadCount,
    unreadCount,
    loading,
    refresh,
    markAllRead,
  };
}
