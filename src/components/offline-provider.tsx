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
import { Wifi, WifiOff } from "lucide-react";
import {
  flushAllPendingSongs,
  getPendingSongIds,
  isBrowserOffline,
} from "@/lib/offline-songs";
import { useCookieConsentOptional } from "@/components/cookie-consent-provider";

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
  const consent = useCookieConsentOptional();
  const functional = Boolean(consent?.consent?.functional);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [banner, setBanner] = useState<"offline" | "back" | null>(null);
  const syncingRef = useRef(false);
  const hadOfflineRef = useRef(false);
  const bannerTimerRef = useRef<number | null>(null);

  const BANNER_MS = 5000;

  const clearBannerTimer = useCallback(() => {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  }, []);

  const showBannerFor = useCallback(
    (next: "offline" | "back") => {
      setBanner(next);
      clearBannerTimer();
      bannerTimerRef.current = window.setTimeout(() => {
        setBanner(null);
        bannerTimerRef.current = null;
      }, BANNER_MS);
    },
    [clearBannerTimer],
  );

  const refreshPending = useCallback(() => {
    void getPendingSongIds().then((ids) => setPendingCount(ids.length));
  }, []);

  const syncNow = useCallback(async () => {
    if (isBrowserOffline()) {
      setOnline(false);
      refreshPending();
      return;
    }
    if (syncingRef.current) return;
    const pending = await getPendingSongIds();
    if (pending.length === 0) {
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
      if (hadOfflineRef.current) {
        showBannerFor("back");
      } else {
        setBanner(null);
        clearBannerTimer();
      }
      hadOfflineRef.current = false;
    }

    function onOffline() {
      hadOfflineRef.current = true;
      setOnline(false);
      showBannerFor("offline");
    }

    const initiallyOffline = isBrowserOffline();
    setOnline(!initiallyOffline);
    if (initiallyOffline) {
      hadOfflineRef.current = true;
      showBannerFor("offline");
    }
    refreshPending();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearBannerTimer();
    };
  }, [refreshPending, showBannerFor, clearBannerTimer]);

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

  const showOffline = banner === "offline";
  const showBack = banner === "back";

  return (
    <OfflineSyncContext.Provider value={value}>
      {(showOffline || showBack) && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm shadow-lg backdrop-blur ${
              showBack
                ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                : "border-amber-500/35 bg-amber-500/15 text-amber-900 dark:text-amber-200"
            }`}
          >
            {showBack ? (
              <>
                <Wifi className="h-4 w-4 shrink-0" />
                <span>You are back Online.</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 shrink-0" />
                <span>
                  {!functional
                    ? "You're offline — turn on Offline & app cache in cookie settings so songs save on this device"
                    : "You're offline — new songs and edits save on this device and sync when you're back online"}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      {children}
    </OfflineSyncContext.Provider>
  );
}
