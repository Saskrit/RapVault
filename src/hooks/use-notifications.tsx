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

export function useNotifications(pollMs = 20000) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: AppNotification[];
        counts?: { total?: number };
      };
      setNotifications(data.notifications || []);
      setCount(
        typeof data.counts?.total === "number"
          ? data.counts.total
          : data.notifications?.length || 0,
      );
    } catch {
      // ignore offline
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

  return { notifications, count, refresh };
}
