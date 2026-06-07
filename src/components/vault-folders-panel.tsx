"use client";

import { FolderPlus, Plus, Star } from "lucide-react";
import type { Folder } from "@/types";

type VaultFoldersPanelProps = {
  folders: Folder[];
  selectedFolderId: string | null;
  showFavorites: boolean;
  onSelectAll: () => void;
  onSelectFavorites: () => void;
  onSelectFolder: (id: string) => void;
  onNewFolder: () => void;
  onNewSong: () => void;
  onNavigate?: () => void;
};

export function VaultFoldersPanel({
  folders,
  selectedFolderId,
  showFavorites,
  onSelectAll,
  onSelectFavorites,
  onSelectFolder,
  onNewFolder,
  onNewSong,
  onNavigate,
}: VaultFoldersPanelProps) {
  function wrap(action: () => void) {
    return () => {
      action();
      onNavigate?.();
    };
  }

  return (
    <>
      <div className="border-b border-border p-3">
        <button
          type="button"
          onClick={wrap(onSelectAll)}
          className={`mb-1 w-full rounded-xl px-3 py-3 text-left text-sm transition active:scale-[0.98] ${
            !selectedFolderId && !showFavorites
              ? "bg-accent/20 text-accent"
              : "text-foreground hover:bg-card"
          }`}
        >
          All Songs
        </button>
        <button
          type="button"
          onClick={wrap(onSelectFavorites)}
          className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm transition active:scale-[0.98] ${
            showFavorites
              ? "bg-accent/20 text-accent"
              : "text-foreground hover:bg-card"
          }`}
        >
          <Star className="h-4 w-4" />
          Favorites
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted">
          Folders
        </p>
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={wrap(() => onSelectFolder(folder.id))}
            className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition active:scale-[0.98] ${
              selectedFolderId === folder.id
                ? "bg-accent/20 text-accent"
                : "text-foreground hover:bg-card"
            }`}
          >
            <span className="truncate">{folder.name}</span>
            <span className="ml-2 text-xs text-muted">{folder._count.songs}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onNewFolder}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm text-muted transition hover:bg-card hover:text-foreground active:scale-[0.98]"
        >
          <FolderPlus className="h-4 w-4" />
          New folder
        </button>
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={wrap(onNewSong)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New song
        </button>
      </div>
    </>
  );
}
