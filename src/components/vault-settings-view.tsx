"use client";

import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Link2,
  Mail,
  Shield,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Logo, BrandWordmark } from "@/components/logo";
import { VaultHeader } from "@/components/vault-header";

type ProfileUser = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  username: string | null;
  bio: string;
  profilePublic: boolean;
  recoveryEmail: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt?: string;
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

const inputClass =
  "w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent";

const sectionClass = "rounded-2xl border border-border bg-card";

function FieldMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500 dark:text-emerald-400">
        {success}
      </p>
    );
  }
  return null;
}

export function VaultSettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePublic, setProfilePublic] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setUser(data.user);
    setRecoveryInput(data.user.recoveryEmail || "");
    setDisplayName(data.user.displayName || data.user.name || "");
    setUsername(data.user.username || "");
    setBio(data.user.bio || "");
    setProfilePublic(data.user.profilePublic !== false);
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

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          bio,
          profilePublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Could not update profile.");
        return;
      }
      setProfileSuccess("Profile updated.");
      if (data.user) setUser(data.user);
      else await loadProfile();
    } catch {
      setProfileError("Network error. Try again.");
    } finally {
      setProfileLoading(false);
    }
  }

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
        user?.hasPassword ? "Password updated." : "Password created.",
      );
      await loadProfile();
    } catch {
      setPasswordError("Network error. Try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setEmailError("");
    setEmailSuccess("");
    setEmailLoading(true);

    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail,
          password: user?.hasPassword ? emailPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Could not update email.");
        return;
      }
      setNewEmail("");
      setEmailPassword("");
      setEmailSuccess("Sign-in email updated.");
      if (data.user) setUser(data.user);
      else await loadProfile();
    } catch {
      setEmailError("Network error. Try again.");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleRecoverySubmit(event: FormEvent) {
    event.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");
    setRecoveryLoading(true);

    try {
      const res = await fetch("/api/auth/recovery-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoveryEmail: recoveryInput.trim() || null,
          password: user?.hasPassword ? recoveryPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRecoveryError(data.error || "Could not update recovery email.");
        return;
      }
      setRecoveryPassword("");
      setRecoverySuccess(
        recoveryInput.trim() ? "Recovery email saved." : "Recovery email removed.",
      );
      if (data.user) {
        setUser(data.user);
        setRecoveryInput(data.user.recoveryEmail || "");
      } else {
        await loadProfile();
      }
    } catch {
      setRecoveryError("Network error. Try again.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function handleClearRecovery() {
    setRecoveryInput("");
    setRecoveryError("");
    setRecoverySuccess("");
    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/auth/recovery-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoveryEmail: null,
          password: user?.hasPassword ? recoveryPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRecoveryError(data.error || "Could not remove recovery email.");
        return;
      }
      setRecoveryPassword("");
      setRecoverySuccess("Recovery email removed.");
      if (data.user) {
        setUser(data.user);
        setRecoveryInput("");
      }
    } catch {
      setRecoveryError("Network error. Try again.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background text-muted">
        <Logo size={48} />
        <BrandWordmark height={18} />
        <p className="text-sm">Loading settings...</p>
      </div>
    );
  }

  if (!user) return null;

  const initials = (user.displayName || user.name || user.email)
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-16 sm:px-6 lg:py-10">
        <div className="mb-8 flex flex-col gap-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Account
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Profile &amp; settings
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted sm:text-base">
              Manage your artist profile, sign-in, recovery, and connected accounts.
            </p>
          </div>
        </div>

        {banner && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              banner.type === "success"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-red-500/25 bg-red-500/10 text-red-400"
            }`}
          >
            {banner.text}
          </div>
        )}

        {/* Profile summary */}
        <section className={`${sectionClass} mb-4 overflow-hidden sm:mb-5`}>
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-sidebar text-xl font-bold tracking-tight text-foreground">
              {initials || <UserRound className="h-7 w-7 text-muted" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">
                {user.displayName || user.name || user.email.split("@")[0]}
              </p>
              <p className="mt-0.5 truncate text-sm text-muted">
                {user.username ? `@${user.username}` : user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </span>
                {user.hasGoogle && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted">
                    <Link2 className="h-3 w-3" />
                    Google linked
                  </span>
                )}
                {user.recoveryEmail && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted">
                    <Shield className="h-3 w-3" />
                    Recovery set
                  </span>
                )}
                {memberSince && (
                  <span className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted">
                    Since {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:gap-5">
          {/* Artist profile */}
          <section className={sectionClass}>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <UserRound className="h-4 w-4 text-accent" />
                Artist profile
              </h2>
              <p className="mt-1 text-sm text-muted">
                Your public name and @username on Artists and song pages.
              </p>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-3 p-5 sm:p-6">
              <div>
                <label htmlFor="display-name" className="mb-1 block text-sm text-muted">
                  Display name
                </label>
                <input
                  id="display-name"
                  type="text"
                  maxLength={60}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="username" className="mb-1 block text-sm text-muted">
                  Username
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-muted">@</span>
                  <input
                    id="username"
                    type="text"
                    minLength={3}
                    maxLength={20}
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                      )
                    }
                    className={inputClass}
                    required
                    pattern="[a-z0-9_]{3,20}"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="bio" className="mb-1 block text-sm text-muted">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  maxLength={280}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className={`${inputClass} min-h-[5rem] resize-y`}
                  placeholder="A short line about your writing..."
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={profilePublic}
                  onChange={(e) => setProfilePublic(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Show me on the Artists directory
              </label>
              <FieldMessage error={profileError} success={profileSuccess} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {profileLoading ? "Saving..." : "Save profile"}
                </button>
                {user.username && (
                  <Link
                    href={`/vault/artists/${user.username}`}
                    className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 text-sm font-medium transition hover:border-accent hover:text-accent"
                  >
                    View public profile
                  </Link>
                )}
              </div>
            </form>
          </section>

          {/* Change email */}
          <section className={sectionClass}>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Mail className="h-4 w-4 text-accent" />
                Change email
              </h2>
              <p className="mt-1 text-sm text-muted">
                Current sign-in email:{" "}
                <span className="font-medium text-foreground">{user.email}</span>
              </p>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-3 p-5 sm:p-6">
              <div>
                <label htmlFor="new-email" className="mb-1 block text-sm text-muted">
                  New email
                </label>
                <input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputClass}
                  placeholder="new@example.com"
                  required
                />
              </div>
              {user.hasPassword && (
                <div>
                  <label
                    htmlFor="email-password"
                    className="mb-1 block text-sm text-muted"
                  >
                    Current password
                  </label>
                  <input
                    id="email-password"
                    type="password"
                    autoComplete="current-password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              )}
              <FieldMessage error={emailError} success={emailSuccess} />
              <button
                type="submit"
                disabled={emailLoading}
                className="min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {emailLoading ? "Saving..." : "Update email"}
              </button>
            </form>
          </section>

          {/* Recovery email */}
          <section className={sectionClass}>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Shield className="h-4 w-4 text-accent" />
                Recovery email
              </h2>
              <p className="mt-1 text-sm text-muted">
                A backup address for password reset if you lose access to your
                main inbox. Use either email on the forgot-password page.
              </p>
            </div>
            <form onSubmit={handleRecoverySubmit} className="space-y-3 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="recovery-email"
                  className="mb-1 block text-sm text-muted"
                >
                  Recovery email
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  className={inputClass}
                  placeholder="backup@example.com"
                />
              </div>
              {user.hasPassword && (
                <div>
                  <label
                    htmlFor="recovery-password"
                    className="mb-1 block text-sm text-muted"
                  >
                    Current password
                  </label>
                  <input
                    id="recovery-password"
                    type="password"
                    autoComplete="current-password"
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              )}
              <FieldMessage error={recoveryError} success={recoverySuccess} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {recoveryLoading
                    ? "Saving..."
                    : user.recoveryEmail
                      ? "Update recovery email"
                      : "Save recovery email"}
                </button>
                {user.recoveryEmail && (
                  <button
                    type="button"
                    onClick={handleClearRecovery}
                    disabled={recoveryLoading}
                    className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Password */}
          <section className={sectionClass}>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="h-4 w-4 text-accent" />
                {user.hasPassword ? "Change password" : "Create a password"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {user.hasPassword
                  ? "Update the password you use to sign in with email."
                  : user.hasGoogle
                    ? "Add a password so you can also sign in with email."
                    : "Set a password for your account."}
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-3 p-5 sm:p-6">
              {user.hasPassword && (
                <div>
                  <label
                    htmlFor="current-password"
                    className="mb-1 block text-sm text-muted"
                  >
                    Current password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1 block text-sm text-muted"
                >
                  {user.hasPassword ? "New password" : "Password"}
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1 block text-sm text-muted"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={6}
                />
              </div>
              <FieldMessage error={passwordError} success={passwordSuccess} />
              <button
                type="submit"
                disabled={passwordLoading}
                className="min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {passwordLoading
                  ? "Saving..."
                  : user.hasPassword
                    ? "Update password"
                    : "Create password"}
              </button>
            </form>
          </section>

          {/* Google */}
          <section className={sectionClass}>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Link2 className="h-4 w-4 text-accent" />
                Google account
              </h2>
              <p className="mt-1 text-sm text-muted">
                {user.hasGoogle
                  ? "You can sign in with Google or email."
                  : "Link Google for faster sign-in. Google email must match your RapVault email."}
              </p>
            </div>
            <div className="p-5 sm:p-6">
              {user.hasGoogle ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Google account connected
                </div>
              ) : (
                <div className="max-w-sm">
                  <GoogleSignInButton
                    href="/api/auth/google/link"
                    label="Link Google account"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
