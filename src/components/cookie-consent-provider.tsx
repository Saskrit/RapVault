"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  acceptAllConsent,
  type ConsentState,
  purgeNonEssentialStorage,
  readStoredConsent,
  rejectOptionalConsent,
  saveCustomConsent,
} from "@/lib/cookie-consent";

type CookieConsentContextValue = {
  /** null while hydrating / before first paint resolve */
  ready: boolean;
  /** null = user has not decided yet */
  consent: ConsentState | null;
  showBanner: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => Promise<void>;
  rejectOptional: () => Promise<void>;
  saveCustom: (input: {
    preferences: boolean;
    functional: boolean;
  }) => Promise<void>;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}

/** Optional hook — returns null outside provider (should not happen in app). */
export function useCookieConsentOptional() {
  return useContext(CookieConsentContext);
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [bannerForced, setBannerForced] = useState(false);

  useEffect(() => {
    setConsent(readStoredConsent());
    setReady(true);
  }, []);

  const showBanner = ready && (consent === null || bannerForced);

  const applyConsent = useCallback(async (next: ConsentState) => {
    setConsent(next);
    setBannerForced(false);
    await purgeNonEssentialStorage(next);
  }, []);

  const acceptAll = useCallback(async () => {
    await applyConsent(acceptAllConsent());
  }, [applyConsent]);

  const rejectOptional = useCallback(async () => {
    await applyConsent(rejectOptionalConsent());
  }, [applyConsent]);

  const saveCustom = useCallback(
    async (input: { preferences: boolean; functional: boolean }) => {
      await applyConsent(saveCustomConsent(input));
    },
    [applyConsent],
  );

  const openPreferences = useCallback(() => {
    setBannerForced(true);
  }, []);

  const closePreferences = useCallback(() => {
    // Only allow dismiss if a choice already exists
    if (consent) setBannerForced(false);
  }, [consent]);

  const value = useMemo(
    () => ({
      ready,
      consent,
      showBanner,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectOptional,
      saveCustom,
    }),
    [
      ready,
      consent,
      showBanner,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectOptional,
      saveCustom,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}
