/**
 * Consent-aware localStorage helpers.
 * Never throws — private mode / blocked storage returns null / no-ops.
 */

import {
  hasFunctionalConsent,
  hasPreferencesConsent,
} from "@/lib/cookie-consent";

function canAccessStorage() {
  try {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function preferenceStorageGet(key: string): string | null {
  if (!canAccessStorage() || !hasPreferencesConsent()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function preferenceStorageSet(key: string, value: string): void {
  if (!canAccessStorage() || !hasPreferencesConsent()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota / private mode — ignore so UI never crashes.
  }
}

export function functionalStorageGet(key: string): string | null {
  if (!canAccessStorage() || !hasFunctionalConsent()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function functionalStorageSet(key: string, value: string): void {
  if (!canAccessStorage() || !hasFunctionalConsent()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function functionalStorageRemove(key: string): void {
  if (!canAccessStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
