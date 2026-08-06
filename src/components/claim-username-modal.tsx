"use client";

import { FormEvent, useState } from "react";

type ClaimUsernameModalProps = {
  suggestedUsername: string;
  suggestedDisplayName: string;
  onComplete: () => void;
};

export function ClaimUsernameModal({
  suggestedUsername,
  suggestedDisplayName,
  onComplete,
}: ClaimUsernameModalProps) {
  const [displayName, setDisplayName] = useState(suggestedDisplayName);
  const [username, setUsername] = useState(suggestedUsername);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save profile");
        return;
      }
      onComplete();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-username-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6"
      >
        <h2
          id="claim-username-title"
          className="text-xl font-bold tracking-tight"
        >
          Claim your artist name
        </h2>
        <p className="mt-2 text-sm text-muted">
          Pick a display name and unique @username so others can find and message
          you.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted">Display name</label>
            <input
              type="text"
              required
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="Your artist name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Username</label>
            <div className="flex items-center gap-2">
              <span className="text-muted">@</span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
                placeholder="your_handle"
                pattern="[a-z0-9_]{3,20}"
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              3–20 characters: lowercase letters, numbers, underscores
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
