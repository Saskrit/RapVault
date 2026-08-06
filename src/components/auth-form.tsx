"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Logo, BrandWordmark } from "@/components/logo";

const GOOGLE_ERRORS: Record<string, string> = {
  google_config: "Google sign-in is not configured yet.",
  google_denied: "Google sign-in was cancelled.",
  google_state: "Sign-in expired. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
};

type AuthFormProps = {
  mode: "login" | "register";
  /** Compact form for hero panel — no logo card chrome */
  embedded?: boolean;
  onSwitchMode?: (mode: "login" | "register") => void;
};

export function AuthForm({ mode, embedded = false, onSwitchMode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const googleError = searchParams.get("error");
    if (googleError && GOOGLE_ERRORS[googleError]) {
      setError(GOOGLE_ERRORS[googleError]);
    }
    if (searchParams.get("reset") === "success") {
      setError("");
    }
  }, [searchParams]);

  useEffect(() => {
    setError("");
    setEmail("");
    setPassword("");
    setName("");
  }, [mode]);

  const resetSuccess = searchParams.get("reset") === "success";

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

  const title = mode === "login" ? "Welcome back" : "Create your vault";
  const subtitle =
    mode === "login"
      ? "Sign in to access your lyrics."
      : "Start writing and never lose a bar.";

  const form = (
    <>
      {!embedded && (
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Logo size={56} priority />
            <BrandWordmark height={22} priority />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
        </div>
      )}

      {embedded && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted sm:text-lg">{subtitle}</p>
        </div>
      )}

      <GoogleSignInButton
        label={mode === "login" ? "Sign in with Google" : "Sign up with Google"}
      />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className={`${embedded ? "bg-editor" : "bg-card"} px-3 text-muted`}>or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {resetSuccess && (
          <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
            Password updated. You can sign in now.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-11 rounded-xl bg-accent py-3 font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            {onSwitchMode ? (
              <button
                type="button"
                onClick={() => onSwitchMode("register")}
                className="font-medium text-accent hover:underline"
              >
                Create an account
              </button>
            ) : (
              <Link href="/register" className="text-accent hover:underline">
                Create an account
              </Link>
            )}
          </>
        ) : (
          <>
            Already have an account?{" "}
            {onSwitchMode ? (
              <button
                type="button"
                onClick={() => onSwitchMode("login")}
                className="font-medium text-accent hover:underline"
              >
                Sign in
              </button>
            ) : (
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            )}
          </>
        )}
      </p>
    </>
  );

  if (embedded) {
    return <div className="mx-auto w-full max-w-md">{form}</div>;
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-8">
      {form}
    </div>
  );
}
