"use client";

import { ArrowLeft, CheckCircle2, KeyRound, Link2, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { VaultHeader } from "@/components/vault-header";

type ProfileUser = {
  id: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
};

const GOOGLE_ERRORS: Record<string, string> = {
  google_config: "Google sign-in is not configured yet.",
  google_denied: "Google sign-in was cancelled.",
  google_state: "Sign-in expired. Please try again.",
  google_failed: "Could not link Google account. Please try again.",
  google_in_use: "This Google account is already linked to another RapVault user.",
  google_email_mismatch:
    "Google email must match your RapVault account email to link.",
  already_linked: "Google is already linked to your account.",
};

export function VaultSettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setUser(data.user);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (searchParams.get("linked") === "1") {
      setBanner({ type: "success", text: "Google account linked successfully." });
      loadProfile();
      router.replace("/vault/settings");
      return;
    }

    const error = searchParams.get("error");
    if (error && GOOGLE_ERRORS[error]) {
      setBanner({ type: "error", text: GOOGLE_ERRORS[error] });
      router.replace("/vault/settings");
    }
  }, [searchParams, router, loadProfile]);

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const body: { newPassword: string; currentPassword?: string } = {
        newPassword,
      };
      if (user?.hasPassword) {
        body.currentPassword = currentPassword;
      }

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Could not update password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        user?.hasPassword ? "Password changed successfully." : "Password created successfully.",
      );
      await loadProfile();
    } catch {
      setPasswordError("Network error. Try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <VaultHeader>
        <Link
          href="/vault"
          className="flex h-11 w-auto shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
          aria-label="Back to library"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Library</span>
        </Link>
      </VaultHeader>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Profile &amp; settings</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your account, password, and sign-in methods.
          </p>
        </div>

        {banner && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              banner.type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {banner.text}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <User className="h-4 w-4 text-accent" />
            Profile
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <div className="min-w-0">
                <dt className="text-muted">Email</dt>
                <dd className="truncate font-medium">{user.email}</dd>
              </div>
            </div>
            {user.name && (
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-muted">Name</dt>
                  <dd className="font-medium">{user.name}</dd>
                </div>
              </div>
            )}
          </dl>
        </section>

        <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <KeyRound className="h-4 w-4 text-accent" />
            {user.hasPassword ? "Change password" : "Create a password"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {user.hasPassword
              ? "Update the password you use to sign in with email."
              : user.hasGoogle
                ? "You signed in with Google. Add a password to also sign in with email."
                : "Set a password for your account."}
          </p>

          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
            {user.hasPassword && (
              <div>
                <label htmlFor="current-password" className="mb-1 block text-sm text-muted">
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base outline-none focus:border-accent"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm text-muted">
                {user.hasPassword ? "New password" : "Password"}
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base outline-none focus:border-accent"
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm text-muted">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base outline-none focus:border-accent"
                required
                minLength={6}
              />
            </div>

            {passwordError && (
              <p className="text-sm text-red-400">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-400">{passwordSuccess}</p>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {passwordLoading
                ? "Saving..."
                : user.hasPassword
                  ? "Update password"
                  : "Create password"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="h-4 w-4 text-accent" />
            Google account
          </h2>
          <p className="mt-2 text-sm text-muted">
            {user.hasGoogle
              ? "Your account is linked to Google. You can sign in with Google or email."
              : "Link Google to sign in faster with your Google account."}
          </p>

          <div className="mt-4">
            {user.hasGoogle ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Google account connected
              </div>
            ) : (
              <GoogleSignInButton
                href="/api/auth/google/link"
                label="Link Google account"
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
