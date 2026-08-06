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
  const [name, setName] = useState("");
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
        body: JSON.stringify({ email, password, name }),
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
    <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center px-5 py-5 sm:px-8 sm:py-6">
      <p className="text-base leading-relaxed text-muted sm:text-lg">
        {mode === "login"
          ? "Sign in to open your private lyrics vault and pick up where you left off."
          : "Create your free vault and start locking bars, hooks, and unfinished verses."}
      </p>

      <div className="mt-5 sm:mt-6">
        <GoogleSignInButton
          label={mode === "login" ? "Sign in with Google" : "Sign up with Google"}
        />
      </div>

      <div className="relative my-5 sm:my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-editor px-3 text-muted">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {mode === "register" && (
          <div>
            <label className="mb-1 block text-sm text-muted">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none focus:border-accent"
              placeholder="Your artist name"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none focus:border-accent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm text-muted">Password</label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-xs text-accent hover:underline"
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
            className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none focus:border-accent"
            placeholder="Min 6 characters"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-12 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted sm:mt-6">
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
