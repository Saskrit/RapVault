"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type HeroAuthFormProps = {
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
};

export function HeroAuthForm({ mode, onSwitchMode }: HeroAuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAwaitingCode(false);
    setCode("");
    setInfo("");
    setError("");
  }, [mode]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "login") {
        const response = await fetch("/api/auth/login", {
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
        return;
      }

      if (!awaitingCode) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Something went wrong");
          return;
        }
        setAwaitingCode(true);
        setInfo(`Code sent to ${email}. Enter it to create your account.`);
        return;
      }

      const response = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
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

  async function handleResendCode() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not resend code");
        return;
      }
      setInfo(`A new code was sent to ${email}.`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero-auth-mode flex min-h-full w-full flex-col justify-start gap-4 overflow-y-auto overscroll-contain px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:justify-center lg:px-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!(mode === "register" && awaitingCode) && (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-12 rounded-xl border border-border bg-background px-3.5 py-3 text-base text-foreground outline-none focus:border-accent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm text-muted">Password</label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-sm text-accent hover:underline"
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
                className="w-full min-h-12 rounded-xl border border-border bg-background px-3.5 py-3 text-base text-foreground outline-none focus:border-accent"
                placeholder="Min 6 characters"
              />
            </div>
          </>
        )}

        {mode === "register" && awaitingCode && (
          <div>
            <label className="mb-1.5 block text-sm text-muted">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full min-h-12 rounded-xl border border-border bg-background px-3.5 py-3 text-center text-lg tracking-[0.35em] text-foreground outline-none focus:border-accent"
              placeholder="000000"
            />
            <p className="mt-1.5 text-xs text-muted">Sent to {email}</p>
          </div>
        )}

        {info && (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm leading-snug text-emerald-600 dark:text-emerald-400">
            {info}
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm leading-snug text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-12 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : awaitingCode
                ? "Verify & create account"
                : "Send verification code"}
        </button>

        {mode === "register" && awaitingCode && (
          <div className="flex flex-col gap-2 text-center text-sm">
            <button
              type="button"
              disabled={loading}
              onClick={handleResendCode}
              className="min-h-10 font-medium text-accent hover:underline disabled:opacity-60"
            >
              Resend code
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setAwaitingCode(false);
                setCode("");
                setInfo("");
                setError("");
              }}
              className="min-h-10 text-muted hover:text-foreground disabled:opacity-60"
            >
              Change email
            </button>
          </div>
        )}
      </form>

      {!(mode === "register" && awaitingCode) && (
        <>
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-editor px-2 text-muted">or</span>
            </div>
          </div>

          <GoogleSignInButton
            label={
              mode === "login" ? "Sign in with Google" : "Sign up with Google"
            }
            className="min-h-12 gap-2 rounded-xl px-3 py-3 text-sm"
          />
        </>
      )}

      <p className="pb-1 pt-1 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => onSwitchMode("register")}
              className="min-h-10 font-medium text-accent hover:underline"
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
              className="min-h-10 font-medium text-accent hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
