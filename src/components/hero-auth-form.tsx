"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type HeroAuthFormProps = {
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
};

export function HeroAuthForm({ mode, onSwitchMode }: HeroAuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/vault");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero-auth-mode flex h-full min-h-0 w-full flex-col justify-center gap-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <label className="mb-0.5 block text-xs text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="mb-0.5 flex items-center justify-between">
            <label className="text-xs text-muted">Password</label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-[11px] text-accent hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            placeholder="Min 6 characters"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs leading-snug text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-10 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
          <span className="bg-editor px-2 text-muted">or</span>
        </div>
      </div>

      <GoogleSignInButton
        label={mode === "login" ? "Sign in with Google" : "Sign up with Google"}
        className="min-h-10 gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm"
      />

      <p className="text-center text-xs text-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => onSwitchMode("register")}
              className="font-medium text-accent hover:underline"
            >
              Get started
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => onSwitchMode("login")}
              className="font-medium text-accent hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
