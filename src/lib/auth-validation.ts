/** Shared auth input helpers */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: unknown): string {
  if (typeof email !== "string") return "";
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

export function validatePassword(
  password: unknown,
  { min = 6 }: { min?: number } = {},
): string | null {
  if (typeof password !== "string" || !password) {
    return "Password is required";
  }
  if (password.length < min) {
    return `Password must be at least ${min} characters`;
  }
  if (password.length > 128) {
    return "Password is too long";
  }
  return null;
}
