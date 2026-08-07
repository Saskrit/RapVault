"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { WifiOff } from "lucide-react";
import {
  flushAllPendingSongs,
  getPendingSongIds,
  isBrowserOffline,
} from "@/lib/offline-songs";

type OfflineSyncContextValue = {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  refreshPending: () => void;
  syncNow: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue>({
  online: true,
  pendingCount: 0,
  syncing: false,
  refreshPending: () => {},
  syncNow: async () => {},
});

export function useOfflineSync() {
  return useContext(OfflineSyncContext);
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(() => {
    setPendingCount(getPendingSongIds().length);
  }, []);

  const syncNow = useCallback(async () => {
    if (isBrowserOffline()) {
      setOnline(false);
      refreshPending();
      return;
    }
    if (syncingRef.current) return;
    if (getPendingSongIds().length === 0) {
      refreshPending();
      return;
    }

    syncingRef.current = true;
    setSyncing(true);
    try {
      await flushAllPendingSongs();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    function onOnline() {
      setOnline(true);
    }
    function onOffline() {
      setOnline(false);
    }

    setOnline(!isBrowserOffline());
    refreshPending();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshPending]);

  useEffect(() => {
    if (!online) return;
    void syncNow();
  }, [online, syncNow]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible" && !isBrowserOffline()) {
        void syncNow();
      } else {
        refreshPending();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [syncNow, refreshPending]);

  const value = useMemo(
    () => ({
      online,
      pendingCount,
      syncing,
      refreshPending,
      syncNow,
    }),
    [online, pendingCount, syncing, refreshPending, syncNow],
  );

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
      {!online && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/95 px-3.5 py-2 text-sm text-foreground shadow-lg backdrop-blur">
            <WifiOff className="h-4 w-4 shrink-0 text-muted" />
            <span>
              Offline — edits save on this device and sync when you&apos;re back
              online
            </span>
          </div>
        </div>
      )}
    </OfflineSyncContext.Provider>
  );
}
