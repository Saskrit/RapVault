/**
 * Cookie / storage consent for RapVault.
 * Essential cookies (auth, OAuth, this consent record) always run.
 * Preferences + functional/offline cache require explicit opt-in.
 */

export const CONSENT_COOKIE = "rapvault_consent";
export const CONSENT_STORAGE_KEY = "rapvault_consent_v1";
export const CONSENT_VERSION = 1 as const;

export type ConsentCategories = {
  /** Session auth + OAuth + consent record — always on */
  essential: true;
  /** Theme, sidebar, editor UI prefs */
  preferences: boolean;
  /** Offline song cache, pending sync queue, service worker / Cache API */
  functional: boolean;
};

export type ConsentState = ConsentCategories & {
  version: typeof CONSENT_VERSION;
  updatedAt: string;
};

export const DEFAULT_DENIED_CONSENT: ConsentState = {
  version: CONSENT_VERSION,
  essential: true,
  preferences: false,
  functional: false,
  updatedAt: "",
};

export const PREFERENCE_STORAGE_KEYS = [
  "rapvault-theme",
  "rapvault-theme-ephemeral",
  "theme",
  "rapvault-sidebar",
  "rapvault-rap-tools",
  "rapvault-spellcheck",
  "rapvault-lyric-font-size",
  "rapvault-page-size",
  "rapvault-editor-split",
  "rapvault-editor-split-locked",
] as const;

export const FUNCTIONAL_STORAGE_KEYS = [
  "rapvault-pending-patches-v1",
  "rapvault-pending-creates-v1",
  "rapvault-song-index-v1",
  "rapvault-folders-v1",
] as const;

const FUNCTIONAL_PREFIX = "rapvault-song-v1:";

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.preferences !== "boolean") return null;
    if (typeof parsed.functional !== "boolean") return null;
    return {
      version: CONSENT_VERSION,
      essential: true,
      preferences: parsed.preferences,
      functional: parsed.functional,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function readConsentCookie(): string | null {
  if (!canUseDom()) return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1));
  } catch {
    return null;
  }
}

function writeConsentCookie(value: string) {
  if (!canUseDom()) return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/** Sync read — safe on client; returns null until the user chooses. */
export function readStoredConsent(): ConsentState | null {
  if (!canUseDom()) return null;
  const fromCookie = parseConsent(readConsentCookie());
  if (fromCookie) return fromCookie;
  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredConsent(state: ConsentState) {
  if (!canUseDom()) return;
  const payload: ConsentState = {
    ...state,
    essential: true,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  const raw = JSON.stringify(payload);
  writeConsentCookie(raw);
  try {
    // Consent record itself is essential so we may store it in localStorage too.
    localStorage.setItem(CONSENT_STORAGE_KEY, raw);
  } catch {
    // Private mode / quota — cookie alone is enough.
  }
}

export function hasPreferencesConsent(state?: ConsentState | null) {
  return Boolean((state ?? readStoredConsent())?.preferences);
}

export function hasFunctionalConsent(state?: ConsentState | null) {
  return Boolean((state ?? readStoredConsent())?.functional);
}

export function acceptAllConsent(): ConsentState {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    essential: true,
    preferences: true,
    functional: true,
    updatedAt: new Date().toISOString(),
  };
  writeStoredConsent(state);
  return state;
}

export function rejectOptionalConsent(): ConsentState {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    essential: true,
    preferences: false,
    functional: false,
    updatedAt: new Date().toISOString(),
  };
  writeStoredConsent(state);
  return state;
}

export function saveCustomConsent(input: {
  preferences: boolean;
  functional: boolean;
}): ConsentState {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    essential: true,
    preferences: input.preferences,
    functional: input.functional,
    updatedAt: new Date().toISOString(),
  };
  writeStoredConsent(state);
  return state;
}

function removeLocalKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Clear preference + functional storage and unregister SW / Cache API. */
export async function purgeNonEssentialStorage(state: ConsentState) {
  if (!canUseDom()) return;

  if (!state.preferences) {
    for (const key of PREFERENCE_STORAGE_KEYS) removeLocalKey(key);
  }

  if (!state.functional) {
    for (const key of FUNCTIONAL_STORAGE_KEYS) removeLocalKey(key);
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(FUNCTIONAL_PREFIX)) toRemove.push(key);
      }
      toRemove.forEach(removeLocalKey);
    } catch {
      // ignore
    }

    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.includes("rapvault"))
            .map((key) => caches.delete(key)),
        );
      }
    } catch {
      // ignore
    }

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
    } catch {
      // ignore
    }
  }
}
