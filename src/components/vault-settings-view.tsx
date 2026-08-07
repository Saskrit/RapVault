"use client";

import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Cookie,
  Eye,
  ImagePlus,
  KeyRound,
  Link2,
  Mail,
  Pencil,
  Save,
  Share2,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AvatarCropModal } from "@/components/avatar-crop-modal";
import { CoverCropModal } from "@/components/cover-crop-modal";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { useCookieConsent } from "@/components/cookie-consent-provider";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { UserAvatar } from "@/components/user-avatar";
import { VaultHeader } from "@/components/vault-header";
import {
  emptySocialLinks,
  pickSocialLinks,
  SOCIAL_LINK_META,
  type SocialLinks,
} from "@/lib/social-links";

type ProfileUser = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  username: string | null;
  bio: string;
  avatarUrl: string | null;
  coverUrl?: string | null;
  profilePublic: boolean;
  youtubeUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  recoveryEmail: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt?: string;
};

type SettingsTab =
  | "profile"
  | "social"
  | "account"
  | "security"
  | "connected"
  | "privacy";

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
  "w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted/70 focus:border-foreground/30";

const TABS: { id: SettingsTab; label: string; icon: typeof UserRound }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "social", label: "Social Links", icon: Share2 },
  { id: "account", label: "Account", icon: Mail },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "connected", label: "Connected", icon: Link2 },
  { id: "privacy", label: "Privacy", icon: Cookie },
];

function FieldMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
        {success}
      </p>
    );
  }
  return null;
}

export function VaultSettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { consent } = useCookieConsent();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const photoMenuRef = useRef<HTMLDivElement>(null);
  const coverMenuRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [socialError, setSocialError] = useState("");
  const [socialLoading, setSocialLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePublic, setProfilePublic] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(emptySocialLinks());
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(
    null,
  );
  const [pendingRemoveAvatar, setPendingRemoveAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [pendingCoverPreview, setPendingCoverPreview] = useState<string | null>(
    null,
  );
  const [pendingRemoveCover, setPendingRemoveCover] = useState(false);
  const [coverError, setCoverError] = useState("");

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    };
  }, [pendingAvatarPreview]);

  useEffect(() => {
    return () => {
      if (pendingCoverPreview) URL.revokeObjectURL(pendingCoverPreview);
    };
  }, [pendingCoverPreview]);

  useEffect(() => {
    if (!photoMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!photoMenuRef.current?.contains(event.target as Node)) {
        setPhotoMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhotoMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [photoMenuOpen]);

  useEffect(() => {
    if (!coverMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!coverMenuRef.current?.contains(event.target as Node)) {
        setCoverMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCoverMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [coverMenuOpen]);

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
    setSocialLinks(pickSocialLinks(data.user));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (searchParams.get("linked") === "1") {
      showToast("success", "Google account linked successfully.");
      setTab("connected");
      loadProfile();
      router.replace("/vault/settings");
      return;
    }

    const error = searchParams.get("error");
    if (error && GOOGLE_ERRORS[error]) {
      showToast("error", GOOGLE_ERRORS[error]);
      setTab("connected");
      router.replace("/vault/settings");
    }
  }, [searchParams, router, loadProfile]);

  function clearPendingAvatarPreview() {
    setPendingAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function clearPendingCoverPreview() {
    setPendingCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleAvatarPick(file: File | null) {
    if (!file) return;
    setAvatarError("");
    setPhotoMenuOpen(false);
    setCropFile(file);
    setCropOpen(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleCoverPick(file: File | null) {
    if (!file) return;
    setCoverError("");
    setCoverMenuOpen(false);
    setCoverCropFile(file);
    setCoverCropOpen(true);
    if (coverFileRef.current) coverFileRef.current.value = "";
  }

  function handleCropCancel() {
    setCropOpen(false);
    setCropFile(null);
  }

  function handleCoverCropCancel() {
    setCoverCropOpen(false);
    setCoverCropFile(null);
  }

  function handleCropConfirm(cropped: File) {
    setCropOpen(false);
    setCropFile(null);
    clearPendingAvatarPreview();
    setPendingAvatarFile(cropped);
    setPendingAvatarPreview(URL.createObjectURL(cropped));
    setPendingRemoveAvatar(false);
    setAvatarError("");
  }

  function handleCoverCropConfirm(cropped: File) {
    setCoverCropOpen(false);
    setCoverCropFile(null);
    clearPendingCoverPreview();
    setPendingCoverFile(cropped);
    setPendingCoverPreview(URL.createObjectURL(cropped));
    setPendingRemoveCover(false);
    setCoverError("");
  }

  function handleRemoveAvatar() {
    setAvatarError("");
    setPhotoMenuOpen(false);
    clearPendingAvatarPreview();
    setPendingAvatarFile(null);
    setPendingRemoveAvatar(true);
  }

  function handleRemoveCover() {
    setCoverError("");
    setCoverMenuOpen(false);
    clearPendingCoverPreview();
    setPendingCoverFile(null);
    setPendingRemoveCover(true);
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    setProfileError("");
    setAvatarError("");
    setCoverError("");
    setProfileLoading(true);
    try {
      let nextUser = user;

      if (pendingRemoveAvatar) {
        const res = await fetch("/api/auth/avatar", { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setAvatarError(data.error || "Could not remove photo.");
          return;
        }
        if (data.user) nextUser = data.user;
      } else if (pendingAvatarFile) {
        const form = new FormData();
        form.append("avatar", pendingAvatarFile);
        const res = await fetch("/api/auth/avatar", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setAvatarError(data.error || "Could not upload photo.");
          return;
        }
        if (data.user) nextUser = data.user;
      }

      if (pendingRemoveCover) {
        const res = await fetch("/api/auth/cover", { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setCoverError(data.error || "Could not remove cover.");
          return;
        }
        if (data.user) nextUser = { ...nextUser!, ...data.user };
      } else if (pendingCoverFile) {
        const form = new FormData();
        form.append("cover", pendingCoverFile);
        const res = await fetch("/api/auth/cover", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setCoverError(data.error || "Could not upload cover.");
          return;
        }
        if (data.user) nextUser = { ...nextUser!, ...data.user };
      }

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
        if (nextUser) setUser(nextUser);
        return;
      }

      clearPendingAvatarPreview();
      setPendingAvatarFile(null);
      setPendingRemoveAvatar(false);
      clearPendingCoverPreview();
      setPendingCoverFile(null);
      setPendingRemoveCover(false);

      if (data.user) {
        setUser({
          ...data.user,
          avatarUrl:
            data.user.avatarUrl ?? nextUser?.avatarUrl ?? user?.avatarUrl ?? null,
          coverUrl:
            data.user.coverUrl ?? nextUser?.coverUrl ?? user?.coverUrl ?? null,
        });
        setSocialLinks(pickSocialLinks(data.user));
      } else if (nextUser) {
        setUser(nextUser);
      } else {
        await loadProfile();
      }

      showToast("success", "Profile saved.");
      setProfileEditing(false);
    } catch {
      setProfileError("Network error. Try again.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleSocialSubmit(event: FormEvent) {
    event.preventDefault();
    setSocialError("");
    setSocialLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(socialLinks),
      });
      const data = await res.json();
      if (!res.ok) {
        setSocialError(data.error || "Could not save social links.");
        return;
      }
      if (data.user) {
        setUser({
          ...data.user,
          avatarUrl: data.user.avatarUrl ?? user?.avatarUrl ?? null,
        });
        setSocialLinks(pickSocialLinks(data.user));
      }
      showToast("success", "Social links saved.");
    } catch {
      setSocialError("Network error. Try again.");
    } finally {
      setSocialLoading(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");

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
      showToast(
        "success",
        user?.hasPassword ? "Password updated." : "Password created.",
      );
      await loadProfile();
    } catch {
      setPasswordError("Network error. Try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!user?.email || forgotLoading) return;
    setPasswordError("");
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data.error || "Could not send reset email.");
        return;
      }
      showToast(
        "success",
        data.message || "Password reset link sent to your email.",
      );
    } catch {
      setPasswordError("Network error. Try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setEmailError("");
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
      showToast("success", "Sign-in email updated.");
      if (data.user) setUser({ ...data.user, avatarUrl: data.user.avatarUrl ?? user?.avatarUrl ?? null });
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
      showToast(
        "success",
        recoveryInput.trim() ? "Recovery email saved." : "Recovery email removed.",
      );
      if (data.user) {
        setUser({
          ...data.user,
          avatarUrl: data.user.avatarUrl ?? user?.avatarUrl ?? null,
        });
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
    setRecoveryError("");
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
      setRecoveryInput("");
      showToast("success", "Recovery email removed.");
      if (data.user) {
        setUser({
          ...data.user,
          avatarUrl: data.user.avatarUrl ?? user?.avatarUrl ?? null,
        });
      }
    } catch {
      setRecoveryError("Network error. Try again.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  if (loading) {
    return <RapVaultLoading fullScreen label="Loading..." />;
  }

  if (!user) return null;

  const display =
    displayName || user.displayName || user.name || user.email.split("@")[0] || "Artist";
  const avatarSrc = pendingRemoveAvatar
    ? null
    : pendingAvatarPreview || user.avatarUrl;
  const hasAvatar = Boolean(avatarSrc);
  const coverSrc = pendingRemoveCover
    ? null
    : pendingCoverPreview || user.coverUrl;
  const hasCover = Boolean(coverSrc);
  const photoDirty =
    Boolean(pendingAvatarFile) ||
    pendingRemoveAvatar ||
    Boolean(pendingCoverFile) ||
    pendingRemoveCover;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <VaultHeader>
        <Link
          href="/vault"
          className="flex h-11 w-auto shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-foreground/25 hover:text-foreground"
          aria-label="Back to library"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Library</span>
        </Link>
      </VaultHeader>

      {toast && (
        <div
          className={`pointer-events-none fixed left-1/2 top-[max(5rem,env(safe-area-inset-top))] z-[90] w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-card text-emerald-700 dark:text-emerald-400"
              : "border-red-500/30 bg-card text-red-400"
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <Shield className="h-4 w-4 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="mb-4 sm:mb-5">
          <p className="type-eyebrow text-muted">Account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Profile &amp; settings
          </h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6">
          {/* Side profile card */}
          <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="relative h-24 bg-sidebar sm:h-28" ref={coverMenuRef}>
                {coverSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverSrc}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-sidebar" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!profileEditing) {
                      setProfileEditing(true);
                    }
                    setCoverMenuOpen((open) => !open);
                    setPhotoMenuOpen(false);
                  }}
                  disabled={profileLoading}
                  className="absolute bottom-2 right-2 flex h-8 items-center gap-1.5 rounded-full border border-border bg-background/95 px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:border-foreground/30 disabled:opacity-50"
                  aria-label="Cover options"
                  aria-expanded={coverMenuOpen}
                  title="Cover photo"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Cover
                </button>
                {coverMenuOpen && (
                  <div className="absolute right-2 top-[calc(100%+0.35rem)] z-20 w-48 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => coverFileRef.current?.click()}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition hover:bg-background"
                    >
                      <ImagePlus className="h-4 w-4 text-muted" />
                      Change cover
                    </button>
                    {hasCover && (
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-400 transition hover:bg-background"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove cover
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleCoverPick(e.target.files?.[0] ?? null)
                  }
                />
              </div>
              <div className="-mt-10 flex flex-col items-center px-4 pb-4 text-center">
                <div className="relative" ref={photoMenuRef}>
                  <UserAvatar
                    src={avatarSrc}
                    name={display}
                    size="xl"
                    className="ring-4 ring-card"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!profileEditing) {
                        setProfileEditing(true);
                      }
                      setPhotoMenuOpen((open) => !open);
                      setCoverMenuOpen(false);
                    }}
                    disabled={profileLoading}
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition hover:border-foreground/30 disabled:opacity-50"
                    aria-label="Photo options"
                    aria-expanded={photoMenuOpen}
                    title="Photo options"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  {photoMenuOpen && (
                    <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-20 w-48 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition hover:bg-background"
                      >
                        <ImagePlus className="h-4 w-4 text-muted" />
                        Change photo
                      </button>
                      {hasAvatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-400 transition hover:bg-background"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove photo
                        </button>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleAvatarPick(e.target.files?.[0] ?? null)
                    }
                  />
                </div>

                <h2 className="mt-3 truncate text-base font-semibold tracking-tight">
                  {display}
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  {username ? `@${username}` : user.email}
                </p>
                {photoDirty && (
                  <p className="mt-2 text-xs text-accent">
                    Photo changes save with profile
                  </p>
                )}
                {avatarError && (
                  <p className="mt-2 text-xs text-red-400">{avatarError}</p>
                )}
                {coverError && (
                  <p className="mt-2 text-xs text-red-400">{coverError}</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-1.5">
              <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                {TABS.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-2xl px-3 text-sm font-medium transition ${
                        active
                          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                          : "text-muted hover:bg-background/70 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Panels */}
          <div className="min-w-0 pb-8">
            <div className="space-y-4">
            {tab === "profile" && (
              <section className="rounded-3xl border border-border bg-card">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight">
                      Artist profile
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      How you appear on Artists, public songs, and messages.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {profileEditing ? (
                      <>
                        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 text-sm font-medium text-accent">
                          <Pencil className="h-3.5 w-3.5" />
                          Editing
                        </span>
                        <button
                          type="submit"
                          form="profile-form"
                          disabled={profileLoading}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {profileLoading ? "Saving..." : "Save"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileError("");
                            setProfileEditing(true);
                          }}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        {user.username ? (
                          <Link
                            href={`/vault/artists/${user.username}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </Link>
                        ) : (
                          <span
                            className="inline-flex min-h-9 cursor-not-allowed items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted opacity-50"
                            title="Set a username to preview"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <form
                  id="profile-form"
                  onSubmit={handleProfileSubmit}
                  className="space-y-4 px-5 py-5 sm:px-6"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="display-name"
                        className="mb-1.5 block text-sm font-medium"
                      >
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
                        disabled={!profileEditing}
                        readOnly={!profileEditing}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="username"
                        className="mb-1.5 block text-sm font-medium"
                      >
                        Username
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted">@</span>
                        <input
                          id="username"
                          type="text"
                          minLength={3}
                          maxLength={20}
                          value={username}
                          onChange={(e) =>
                            setUsername(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_]/g, ""),
                            )
                          }
                          className={inputClass}
                          required
                          pattern="[a-z0-9_]{3,20}"
                          disabled={!profileEditing}
                          readOnly={!profileEditing}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        3–20 characters · lowercase letters, numbers, underscores
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="bio"
                        className="mb-1.5 block text-sm font-medium"
                      >
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        rows={2}
                        maxLength={280}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className={`${inputClass} min-h-[4.5rem] resize-y`}
                        placeholder="Hooks, freestyles, unfinished verses…"
                        disabled={!profileEditing}
                        readOnly={!profileEditing}
                      />
                      <p className="mt-1.5 text-right text-xs text-muted">
                        {bio.length}/280
                      </p>
                    </div>
                  </div>

                  <label
                    className={`flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3 ${
                      profileEditing ? "cursor-pointer" : "cursor-default opacity-80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={profilePublic}
                      onChange={(e) => setProfilePublic(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border"
                      disabled={!profileEditing}
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        Show on Artists directory
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        Others can find your profile and public songs.
                      </span>
                    </span>
                  </label>

                  <FieldMessage error={profileError} />
                </form>
              </section>
            )}

            {tab === "social" && (
              <section className="rounded-3xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4 sm:px-6">
                  <h3 className="text-lg font-semibold tracking-tight">
                    Social Links
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Add YouTube, Instagram, Spotify, and more to your public
                    profile.
                  </p>
                </div>
                <form
                  onSubmit={handleSocialSubmit}
                  className="space-y-4 px-5 py-5 sm:px-6"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SOCIAL_LINK_META.map((item) => (
                      <div key={item.key} className="sm:col-span-1">
                        <label
                          htmlFor={item.key}
                          className="mb-1.5 block text-sm font-medium"
                        >
                          {item.label}
                        </label>
                        <input
                          id={item.key}
                          type="url"
                          value={socialLinks[item.key]}
                          onChange={(e) =>
                            setSocialLinks((prev) => ({
                              ...prev,
                              [item.key]: e.target.value,
                            }))
                          }
                          placeholder={item.placeholder}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                  <FieldMessage error={socialError} />
                  <button
                    type="submit"
                    disabled={socialLoading}
                    className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
                  >
                    {socialLoading ? "Saving..." : "Save social links"}
                  </button>
                </form>
              </section>
            )}

            {tab === "account" && (
              <>
                <section className="rounded-3xl border border-border bg-card">
                  <div className="border-b border-border px-5 py-5 sm:px-7">
                    <h3 className="text-lg font-semibold tracking-tight">
                      Sign-in email
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      Current:{" "}
                      <span className="font-medium text-foreground">
                        {user.email}
                      </span>
                    </p>
                  </div>
                  <form
                    onSubmit={handleEmailSubmit}
                    className="space-y-4 px-5 py-6 sm:px-7"
                  >
                    <div>
                      <label
                        htmlFor="new-email"
                        className="mb-1.5 block text-sm font-medium"
                      >
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
                          className="mb-1.5 block text-sm font-medium"
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
                    <FieldMessage error={emailError} />
                    <button
                      type="submit"
                      disabled={emailLoading}
                      className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
                    >
                      {emailLoading ? "Saving..." : "Update email"}
                    </button>
                  </form>
                </section>

                <section className="rounded-3xl border border-border bg-card">
                  <div className="border-b border-border px-5 py-5 sm:px-7">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted" />
                      <h3 className="text-lg font-semibold tracking-tight">
                        Recovery email
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Backup address for password reset if you lose your main
                      inbox.
                    </p>
                  </div>
                  <form
                    onSubmit={handleRecoverySubmit}
                    className="space-y-4 px-5 py-6 sm:px-7"
                  >
                    <div>
                      <label
                        htmlFor="recovery-email"
                        className="mb-1.5 block text-sm font-medium"
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
                          className="mb-1.5 block text-sm font-medium"
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
                    <FieldMessage error={recoveryError} />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={recoveryLoading}
                        className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
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
                          className="min-h-11 rounded-xl border border-border px-5 text-sm font-medium text-muted transition hover:text-foreground disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </form>
                </section>
              </>
            )}

            {tab === "security" && (
              <section className="rounded-3xl border border-border bg-card">
                <div className="border-b border-border px-5 py-5 sm:px-7">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {user.hasPassword ? "Change password" : "Create a password"}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {user.hasPassword
                      ? "Update the password you use with email sign-in."
                      : user.hasGoogle
                        ? "Add a password so you can also sign in with email."
                        : "Set a password for your account."}
                  </p>
                </div>
                <form
                  onSubmit={handlePasswordSubmit}
                  className="space-y-4 px-5 py-6 sm:px-7"
                >
                  {user.hasPassword && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label
                          htmlFor="current-password"
                          className="block text-sm font-medium"
                        >
                          Current password
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={forgotLoading || passwordLoading}
                          className="text-xs font-medium text-accent transition hover:underline disabled:opacity-50"
                        >
                          {forgotLoading ? "Sending..." : "Forgot password?"}
                        </button>
                      </div>
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="new-password"
                        className="mb-1.5 block text-sm font-medium"
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
                        className="mb-1.5 block text-sm font-medium"
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
                  </div>
                  <FieldMessage error={passwordError} />
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
                  >
                    {passwordLoading
                      ? "Saving..."
                      : user.hasPassword
                        ? "Update password"
                        : "Create password"}
                  </button>
                </form>
              </section>
            )}

            {tab === "connected" && (
              <section className="rounded-3xl border border-border bg-card">
                <div className="border-b border-border px-5 py-5 sm:px-7">
                  <h3 className="text-lg font-semibold tracking-tight">
                    Google account
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {user.hasGoogle
                      ? "You can sign in with Google or email."
                      : "Link Google for faster sign-in. Google email must match your RapVault email."}
                  </p>
                </div>
                <div className="px-5 py-6 sm:px-7">
                  {user.hasGoogle ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-medium">Google connected</p>
                        <p className="text-xs opacity-80">{user.email}</p>
                      </div>
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
            )}

            {tab === "privacy" && (
              <section className="rounded-3xl border border-border bg-card">
                <div className="border-b border-border px-5 py-5 sm:px-7">
                  <h3 className="text-lg font-semibold tracking-tight">
                    Cookies &amp; storage
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Control optional preferences and offline cache. Essential
                    sign-in cookies always stay on.
                  </p>
                </div>
                <div className="space-y-5 px-5 py-6 sm:px-7">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: "Essential",
                        value: "Always on",
                        on: true,
                      },
                      {
                        label: "Preferences",
                        value: consent?.preferences ? "Allowed" : "Off",
                        on: Boolean(consent?.preferences),
                      },
                      {
                        label: "Offline & cache",
                        value: consent?.functional ? "Allowed" : "Off",
                        on: Boolean(consent?.functional),
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="rounded-2xl border border-border bg-background px-4 py-3"
                      >
                        <p className="text-xs uppercase tracking-wide text-muted">
                          {row.label}
                        </p>
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            row.on ? "text-emerald-500" : "text-muted"
                          }`}
                        >
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <CookiePreferencesButton label="Manage preferences" />
                    <Link
                      href="/privacy"
                      className="inline-flex min-h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/terms"
                      className="inline-flex min-h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground"
                    >
                      Terms of Service
                    </Link>
                    <Link
                      href="/cookies"
                      className="inline-flex min-h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground"
                    >
                      Cookie Policy
                    </Link>
                  </div>
                </div>
              </section>
            )}
            </div>
          </div>
        </div>
      </main>

      <AvatarCropModal
        open={cropOpen}
        file={cropFile}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
      <CoverCropModal
        open={coverCropOpen}
        file={coverCropFile}
        onCancel={handleCoverCropCancel}
        onConfirm={handleCoverCropConfirm}
      />
    </div>
  );
}
