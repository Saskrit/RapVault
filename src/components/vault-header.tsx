"use client";

import Link from "next/link";
import {
  Bell,
  CheckCheck,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo, BrandWordmark } from "@/components/logo";
import { Modal } from "@/components/modal";
import { UserAvatar } from "@/components/user-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useNotifications } from "@/hooks/use-notifications";
import {
  UnreadBadge,
  useUnreadMessages,
} from "@/hooks/use-unread-messages";
import {
  preferenceStorageGet,
  preferenceStorageSet,
} from "@/lib/safe-storage";
import { cacheMe, getCachedMe } from "@/lib/offline-songs";

type VaultHeaderProps = {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  mobileSearchOpen?: boolean;
  onMobileSearchOpen?: (open: boolean) => void;
  centerLabel?: string;
  children?: React.ReactNode;
};

const SKIP_LOGOUT_CONFIRM_KEY = "rapvault-skip-logout-confirm";

/** Touch-friendly on phones; same visual size on desktop (lg+). */
const iconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted transition active:scale-95 hover:border-foreground/20 hover:text-foreground sm:h-10 sm:w-10";

/** Labeled header/tool control — auto width so icon + text never clip. */
const labelBtn =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-background px-2.5 text-sm font-medium text-muted transition active:scale-95 hover:border-foreground/20 hover:text-foreground sm:h-10 sm:px-3";

const logoutBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-400/90 transition active:scale-95 hover:border-red-500/45 hover:bg-red-500/15 hover:text-red-400 sm:h-10 sm:w-10";

const headerIcon = "h-4 w-4";

function formatNotifTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

export function VaultHeader({
  searchQuery = "",
  onSearchChange,
  mobileSearchOpen = false,
  onMobileSearchOpen,
  centerLabel,
  children,
}: VaultHeaderProps) {
  const showSearch = onSearchChange !== undefined;
  const [label, setLabel] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useUnreadMessages();
  const {
    notifications,
    unreadCount: notifCount,
    refresh: refreshNotifs,
    markAllRead,
  } = useNotifications(20000, 5);

  useEffect(() => {
    void (async () => {
      const cached = await getCachedMe<{
        username?: string | null;
        displayName?: string | null;
        email?: string;
      }>();
      if (cached) {
        setLabel(
          cached.username
            ? `@${cached.username}`
            : cached.displayName || cached.email || null,
        );
      }

      try {
        const res = await fetch("/api/auth/me");
        const data = res.ok ? await res.json() : null;
        if (!data?.user) return;
        await cacheMe(data.user);
        setLabel(
          data.user.username
            ? `@${data.user.username}`
            : data.user.displayName || data.user.email,
        );
      } catch {
        // ignore offline
      }
    })();
  }, []);

  useEffect(() => {
    setSkipConfirm(preferenceStorageGet(SKIP_LOGOUT_CONFIRM_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    void refreshNotifs();
    function onPointerDown(event: PointerEvent) {
      if (!notifRef.current?.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNotifOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notifOpen, refreshNotifs]);

  async function performLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }

  function handleLogoutClick() {
    if (skipConfirm) {
      void performLogout();
      return;
    }
    setDontShowAgain(false);
    setLogoutOpen(true);
  }

  function handleConfirmLogout() {
    if (dontShowAgain) {
      preferenceStorageSet(SKIP_LOGOUT_CONFIRM_KEY, "1");
      setSkipConfirm(true);
    }
    setLogoutOpen(false);
    void performLogout();
  }

  async function handleMarkAllRead() {
    setMarking(true);
    try {
      await markAllRead();
    } finally {
      setMarking(false);
    }
  }

  return (
    <header className="shrink-0 border-b border-border bg-card pt-[max(0.5rem,env(safe-area-inset-top))] lg:pt-[max(0.625rem,env(safe-area-inset-top))]">
      {showSearch && mobileSearchOpen && (
        <div className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3 sm:py-2.5 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted sm:left-3.5 sm:h-4 sm:w-4" />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search songs..."
              className="w-full min-h-10 rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:min-h-11 sm:rounded-2xl sm:pl-11 sm:pr-4"
            />
          </div>
          <button
            type="button"
            onClick={() => onMobileSearchOpen?.(false)}
            className={iconBtn}
            aria-label="Close search"
          >
            <X className={headerIcon} />
          </button>
        </div>
      )}

      <div
        className={`relative items-center gap-1 px-1.5 py-1.5 sm:gap-1.5 sm:px-3 sm:py-2.5 lg:gap-3 lg:px-5 lg:py-3 ${
          showSearch && mobileSearchOpen ? "hidden" : "flex"
        }`}
      >
        {children}

        <div className="relative z-10 flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5 lg:gap-2">
          <span className="inline-flex lg:hidden">
            <Logo size={24} href="/vault" priority />
          </span>
          <span className="hidden lg:inline-flex">
            <Logo size={36} href="/vault" priority />
          </span>
          <BrandWordmark
            height={18}
            href="/vault"
            priority
            className="hidden lg:inline-flex"
          />
        </div>

        {showSearch && (
          <div className="relative mx-auto hidden min-w-0 max-w-lg flex-1 lg:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search title, lyrics, tags..."
              className="w-full min-h-10 rounded-2xl border border-border bg-background py-2 pl-11 pr-4 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
        )}

        {centerLabel && !showSearch && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 z-0 hidden -translate-y-1/2 justify-center px-20 sm:flex sm:px-24 lg:px-28">
            <span className="truncate text-xs font-semibold tracking-tight text-foreground sm:text-sm lg:text-base">
              {centerLabel}
            </span>
          </p>
        )}

        {centerLabel && showSearch && (
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-tight text-foreground lg:hidden">
            {centerLabel}
          </p>
        )}

        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 lg:gap-1.5">
          {showSearch && (
            <button
              type="button"
              onClick={() => onMobileSearchOpen?.(true)}
              className={`${iconBtn} lg:hidden`}
              aria-label="Search"
            >
              <Search className={headerIcon} />
            </button>
          )}

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((open) => !open)}
              className={`relative ${iconBtn}`}
              aria-label={
                notifCount > 0
                  ? `Notifications, ${notifCount} unread`
                  : "Notifications"
              }
              aria-expanded={notifOpen}
              title="Notifications"
            >
              <Bell className={headerIcon} />
              <UnreadBadge count={notifCount} />
            </button>

            {notifOpen && (
              <div className="fixed inset-x-2 top-[max(3.75rem,calc(env(safe-area-inset-top)+3.25rem))] z-40 flex max-h-[min(70dvh,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.4rem)] sm:max-h-[20rem] sm:w-[min(22rem,calc(100vw-1.5rem))]">
                <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight">
                      Notifications
                    </p>
                    {notifCount > 0 && (
                      <p className="text-[11px] text-muted">
                        {notifCount} unread
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    disabled={marking || notifCount === 0}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-sidebar hover:text-foreground disabled:opacity-40"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all as read
                  </button>
                </div>

                <div className="max-h-[20rem] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Bell className="mx-auto mb-2 h-7 w-7 text-muted opacity-50" />
                      <p className="text-sm font-medium">All caught up</p>
                      <p className="mt-1 text-xs text-muted">
                        Connection and collab requests will show up here.
                      </p>
                    </div>
                  ) : (
                    <ul>
                      {notifications.slice(0, 5).map((item) => (
                        <li
                          key={item.id}
                          className="border-b border-border last:border-b-0"
                        >
                          <Link
                            href={item.href}
                            onClick={() => setNotifOpen(false)}
                            className={`flex gap-3 px-3.5 py-3 transition hover:bg-sidebar ${
                              item.unread ? "bg-accent/[0.04]" : ""
                            }`}
                          >
                            <div className="relative shrink-0">
                              {item.artist ? (
                                <UserAvatar
                                  src={item.artist.avatarUrl}
                                  name={item.artist.displayName}
                                  size="sm"
                                />
                              ) : (
                                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted">
                                  <UserPlus className="h-4 w-4" />
                                </span>
                              )}
                              {item.unread && (
                                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-card" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm leading-snug ${
                                  item.unread
                                    ? "font-semibold"
                                    : "font-medium text-foreground/90"
                                }`}
                              >
                                {item.body}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted">
                                {item.title}
                                {item.createdAt
                                  ? ` · ${formatNotifTime(item.createdAt)}`
                                  : ""}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-border p-2">
                  <Link
                    href="/vault/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="flex min-h-9 items-center justify-center rounded-xl text-sm font-semibold text-accent transition hover:bg-accent/10"
                  >
                    See all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/vault/messages"
            className={`relative ${iconBtn}`}
            aria-label={
              unreadCount > 0
                ? `Messages, ${unreadCount} unread`
                : "Messages"
            }
            title="Messages"
          >
            <MessageSquare className={headerIcon} />
            <UnreadBadge count={unreadCount} />
          </Link>
          {label && (
            <Link
              href="/vault/settings"
              className="hidden max-w-[14rem] items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs text-muted transition hover:border-foreground/20 hover:text-foreground xl:flex"
              title="Profile & settings"
            >
              <span className="flex items-center gap-1 text-foreground/80">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <Settings className="h-3.5 w-3.5 shrink-0" />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          )}
          <Link
            href="/vault/settings"
            className={`${iconBtn} xl:hidden`}
            aria-label="Profile & settings"
            title="Profile & settings"
          >
            <Settings className={headerIcon} />
          </Link>
          <ThemeToggle className="hidden md:flex" />
          <button
            type="button"
            onClick={handleLogoutClick}
            disabled={loggingOut}
            className={logoutBtn}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className={headerIcon} />
          </button>
        </div>
      </div>

      <Modal
        open={logoutOpen}
        onClose={() => {
          if (!loggingOut) setLogoutOpen(false);
        }}
        title="Log out"
        description="Are you sure you want to log out?"
      >
        <label className="mb-5 flex cursor-pointer items-start gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-red-500"
          />
          <span>Do not show this box again</span>
        </label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setLogoutOpen(false)}
            disabled={loggingOut}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50 sm:w-auto sm:py-2"
          >
            No
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            disabled={loggingOut}
            className="w-full rounded-xl bg-red-500/90 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50 sm:w-auto sm:py-2"
          >
            {loggingOut ? "Logging out..." : "Yes"}
          </button>
        </div>
      </Modal>
    </header>
  );
}

export { iconBtn, labelBtn };
