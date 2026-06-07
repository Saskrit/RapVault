"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/logo";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/login?reset=success");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
      <div className="mb-8 text-center">
        <div className="flex justify-center">
          <Logo size={56} priority />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-foreground">
          Set new password
        </h1>
        <p className="mt-2 text-sm text-muted">Choose a new password for your vault.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-muted">New password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-accent"
            placeholder="Min 6 characters"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Confirm password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-accent"
            placeholder="Repeat password"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
