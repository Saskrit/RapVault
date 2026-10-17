/** Username / profile helpers (client-safe) */

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.toLowerCase().trim();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function suggestUsernameFromEmail(email: string): string {
  const local = email.split("@")[0] || "artist";
  let base = local
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (base.length < 3) base = `user_${base}`.slice(0, 20);
  return base.slice(0, 20);
}

export function normalizeDisplayName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 60);
}
