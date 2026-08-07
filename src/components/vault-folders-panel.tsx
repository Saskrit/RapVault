"use client";

import {
  Folder,
  FolderPlus,
  ListMusic,
  MessageSquare,
  Plus,
  Recycle,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Folder as FolderType } from "@/types";

type VaultFoldersPanelProps = {
  folders: FolderType[];
  selectedFolderId: string | null;
  showFavorites: boolean;
  showTrash: boolean;
  trashCount?: number;
  onSelectAll: () => void;
  onSelectFavorites: () => void;
  onSelectTrash: () => void;
  onSelectFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onNewFolder: () => void;
  onNewSong: () => void;
  onNavigate?: () => void;
};

const navBtn =
  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.98]";

export function VaultFoldersPanel({
  folders,
  selectedFolderId,
  showFavorites,
  showTrash,
  trashCount = 0,
  onSelectAll,
  onSelectFavorites,
  onSelectTrash,
  onSelectFolder,
  onDeleteFolder,
  onNewFolder,
  onNewSong,
  onNavigate,
}: VaultFoldersPanelProps) {
  const pathname = usePathname();
  const onArtists = pathname.startsWith("/vault/artists");
  const onMessages = pathname.startsWith("/vault/messages");

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

  return (
    <>
      <div className="border-b border-border px-3 pb-3 pt-4">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Library
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={wrap(onSelectAll)}
            className={`${navBtn} ${itemClass(!selectedFolderId && !showFavorites && !showTrash)}`}
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
          <button
            type="button"
            onClick={wrap(onSelectTrash)}
            className={`${navBtn} ${itemClass(showTrash)}`}
          >
            <Recycle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Recycle Bin</span>
            {trashCount > 0 && (
              <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
                {trashCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="border-b border-border px-3 py-3">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
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
            href="/vault/messages"
            onClick={() => onNavigate?.()}
            className={`${navBtn} ${itemClass(onMessages)}`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Messages</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
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
                  <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
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
