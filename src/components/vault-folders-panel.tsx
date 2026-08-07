"use client";

import {
  BarChart3,
  Folder,
  FolderPlus,
  ListMusic,
  MessageSquare,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Recycle,
  Star,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Folder as FolderType } from "@/types";
import {
  UnreadBadge,
  useUnreadMessages,
} from "@/hooks/use-unread-messages";

type VaultFoldersPanelProps = {
  folders: FolderType[];
  selectedFolderId: string | null;
  showFavorites: boolean;
  showTrash: boolean;
  showCollaborations?: boolean;
  trashCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectAll: () => void;
  onSelectFavorites: () => void;
  onSelectTrash: () => void;
  onSelectCollaborations?: () => void;
  onSelectFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onNewFolder: () => void;
  onNewSong: () => void;
  onNavigate?: () => void;
};

const navBtn =
  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.98]";

const collapsedBtn =
  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted transition hover:border-border hover:bg-background hover:text-foreground active:scale-95";

const collapsedActive =
  "border-accent/30 bg-accent/10 text-accent hover:border-accent/40 hover:bg-accent/15 hover:text-accent";

export function VaultFoldersPanel({
  folders,
  selectedFolderId,
  showFavorites,
  showTrash,
  showCollaborations = false,
  trashCount = 0,
  collapsed = false,
  onToggleCollapse,
  onSelectAll,
  onSelectFavorites,
  onSelectTrash,
  onSelectCollaborations,
  onSelectFolder,
  onDeleteFolder,
  onNewFolder,
  onNewSong,
  onNavigate,
}: VaultFoldersPanelProps) {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessages();
  const onArtists = pathname.startsWith("/vault/artists");
  const onNetwork = pathname.startsWith("/vault/network");
  const onMessages = pathname.startsWith("/vault/messages");
  const onStats = pathname.startsWith("/vault/stats");
  const onAllSongs =
    !selectedFolderId && !showFavorites && !showTrash && !showCollaborations;

  function wrap(action: () => void) {
    return () => {
      action();
      onNavigate?.();
    };
  }

  function itemClass(active: boolean) {
    return active
      ? "border border-accent/30 bg-accent/10 text-accent"
      : "border border-transparent text-foreground hover:bg-background";
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-1 overflow-y-auto px-1 py-3">
        <button
          type="button"
          onClick={wrap(onSelectAll)}
          className={`${collapsedBtn} ${onAllSongs ? collapsedActive : ""}`}
          aria-label="All Songs"
          title="All Songs"
        >
          <ListMusic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={wrap(onSelectFavorites)}
          className={`${collapsedBtn} ${showFavorites ? collapsedActive : ""}`}
          aria-label="Favorites"
          title="Favorites"
        >
          <Star className="h-4 w-4" />
        </button>
        {onSelectCollaborations && (
          <button
            type="button"
            onClick={wrap(onSelectCollaborations)}
            className={`${collapsedBtn} ${showCollaborations ? collapsedActive : ""}`}
            aria-label="Collaborations"
            title="Collaborations"
          >
            <UsersRound className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={wrap(onSelectTrash)}
          className={`${collapsedBtn} ${showTrash ? collapsedActive : ""}`}
          aria-label="Recycle Bin"
          title="Recycle Bin"
        >
          <Recycle className="h-4 w-4" />
          {trashCount > 0 && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
          )}
        </button>

        <div className="my-1.5 h-px w-6 bg-border" />

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={collapsedBtn}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <div className="my-1.5 h-px w-6 bg-border" />

        <Link
          href="/vault/artists"
          onClick={() => onNavigate?.()}
          className={`${collapsedBtn} ${onArtists ? collapsedActive : ""}`}
          aria-label="Artists"
          title="Artists"
        >
          <Users className="h-4 w-4" />
        </Link>
        <Link
          href="/vault/network"
          onClick={() => onNavigate?.()}
          className={`${collapsedBtn} ${onNetwork ? collapsedActive : ""}`}
          aria-label="Network"
          title="Network"
        >
          <Network className="h-4 w-4" />
        </Link>
        <Link
          href="/vault/messages"
          onClick={() => onNavigate?.()}
          className={`${collapsedBtn} ${onMessages ? collapsedActive : ""}`}
          aria-label={
            unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"
          }
          title="Messages"
        >
          <MessageSquare className="h-4 w-4" />
          <UnreadBadge count={unreadCount} className="-right-0.5 -top-0.5" />
        </Link>
        <Link
          href="/vault/stats"
          onClick={() => onNavigate?.()}
          className={`${collapsedBtn} ${onStats ? collapsedActive : ""}`}
          aria-label="Stats"
          title="Stats"
        >
          <BarChart3 className="h-4 w-4" />
        </Link>

        {folders.length > 0 && (
          <>
            <div className="my-1.5 h-px w-6 bg-border" />
            {folders.slice(0, 8).map((folder) => {
              const active = selectedFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={wrap(() => onSelectFolder(folder.id))}
                  className={`${collapsedBtn} ${active ? collapsedActive : ""}`}
                  aria-label={folder.name}
                  title={folder.name}
                >
                  <Folder className="h-4 w-4" />
                </button>
              );
            })}
          </>
        )}

        <div className="mt-auto flex flex-col items-center gap-1 pt-2">
          <button
            type="button"
            onClick={onNewFolder}
            className={collapsedBtn}
            aria-label="New folder"
            title="New folder"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={wrap(onNewSong)}
            disabled={showTrash}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="New song"
            title="New song"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-3 pb-3 py-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Library
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={wrap(onSelectAll)}
            className={`${navBtn} ${itemClass(onAllSongs)}`}
          >
            <ListMusic className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">All Songs</span>
          </button>
          <button
            type="button"
            onClick={wrap(onSelectFavorites)}
            className={`${navBtn} ${itemClass(showFavorites)}`}
          >
            <Star className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Favorites</span>
          </button>
          {onSelectCollaborations && (
            <button
              type="button"
              onClick={wrap(onSelectCollaborations)}
              className={`${navBtn} ${itemClass(showCollaborations)}`}
            >
              <UsersRound className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Collaborations</span>
            </button>
          )}
          <button
            type="button"
            onClick={wrap(onSelectTrash)}
            className={`${navBtn} ${itemClass(showTrash)}`}
          >
            <Recycle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Recycle Bin</span>
            {trashCount > 0 && (
              <span className="rounded-md bg-background px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted">
                {trashCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {onToggleCollapse ? (
        <div className="relative flex items-center px-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mx-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-sidebar text-muted transition hover:border-foreground/25 hover:bg-background hover:text-foreground"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
          <div className="h-px flex-1 bg-border" />
        </div>
      ) : (
        <div className="mx-3 h-px bg-border" />
      )}

      <div className="border-b border-border px-3 py-3">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Community
        </p>
        <div className="space-y-1">
          <Link
            href="/vault/artists"
            onClick={() => onNavigate?.()}
            className={`${navBtn} ${itemClass(onArtists)}`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Artists</span>
          </Link>
          <Link
            href="/vault/network"
            onClick={() => onNavigate?.()}
            className={`${navBtn} ${itemClass(onNetwork)}`}
          >
            <Network className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Network</span>
          </Link>
          <Link
            href="/vault/messages"
            onClick={() => onNavigate?.()}
            className={`${navBtn} ${itemClass(onMessages)}`}
            aria-label={
              unreadCount > 0
                ? `Messages, ${unreadCount} unread`
                : "Messages"
            }
          >
            <span className="relative shrink-0">
              <MessageSquare className="h-4 w-4" />
              <UnreadBadge count={unreadCount} className="-right-2 -top-2" />
            </span>
            <span className="min-w-0 flex-1 truncate">Messages</span>
            {unreadCount > 0 && (
              <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/vault/stats"
            onClick={() => onNavigate?.()}
            className={`${navBtn} ${itemClass(onStats)}`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Stats</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Folders
        </p>
        <div className="space-y-1">
          {folders.map((folder) => {
            const active = selectedFolderId === folder.id;
            return (
              <div
                key={folder.id}
                className={`group flex items-center gap-0.5 rounded-xl transition ${
                  active
                    ? "border border-accent/30 bg-accent/10"
                    : "border border-transparent hover:bg-background"
                }`}
              >
                <button
                  type="button"
                  onClick={wrap(() => onSelectFolder(folder.id))}
                  className={`${navBtn} min-w-0 flex-1 ${
                    active ? "text-accent" : "text-foreground"
                  }`}
                >
                  <Folder className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                  <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted">
                    {folder._count.songs}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteFolder(folder.id)}
                  className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted opacity-100 transition hover:bg-red-500/10 hover:text-red-400 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                  aria-label={`Delete ${folder.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onNewFolder}
            className={`${navBtn} border border-teal-500/30 bg-teal-500/10 text-teal-600 transition hover:border-teal-500/50 hover:bg-teal-500/15 dark:text-teal-400`}
          >
            <FolderPlus className="h-4 w-4 shrink-0" />
            New folder
          </button>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={wrap(onNewSong)}
          disabled={showTrash}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          New song
        </button>
      </div>
    </>
  );
}
