"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Logo, BrandWordmark } from "@/components/logo";
import { UserAvatar } from "@/components/user-avatar";

type SessionUser = {
  email: string;
  username: string | null;
  displayName: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.user) return;
        const user = data.user as SessionUser;
        setSessionUser(user);
        setEmail(user.email || "");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setMessage(
        sessionUser
          ? `Reset link sent to ${email}. Open it to choose a new password.`
          : data.message,
      );
      if (!sessionUser) setEmail("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const displayName =
    sessionUser?.displayName ||
    sessionUser?.name ||
    sessionUser?.username ||
    "Artist";
  const usernameLabel = sessionUser?.username
    ? `@${sessionUser.username}`
    : sessionUser?.email;

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-8">
      <div className="mb-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <Logo size={56} priority />
          <BrandWordmark height={22} priority />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-foreground">
          Forgot password?
        </h1>
        <p className="mt-2 text-sm text-muted">
          {sessionUser
            ? "We'll email a reset link to your sign-in address."
            : "Enter your sign-in email or recovery email and we'll send a reset link to that address."}
        </p>
      </div>

      {!sessionLoading && sessionUser && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left">
          <UserAvatar
            src={sessionUser.avatarUrl}
            name={displayName}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted">{usernameLabel}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={Boolean(sessionUser)}
            className={`w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none focus:border-accent ${
              sessionUser ? "cursor-default text-muted" : ""
            }`}
            placeholder="Sign-in or recovery email"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || sessionLoading}
          className="w-full min-h-11 rounded-xl bg-accent py-3 font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {sessionUser ? (
          <Link href="/vault/settings" className="text-accent hover:underline">
            Back to settings
          </Link>
        ) : (
          <Link href="/login" className="text-accent hover:underline">
            Back to sign in
          </Link>
        )}
      </p>
    </div>
  );
}
