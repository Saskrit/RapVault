"use client";

import { FolderPlus, Plus, Star, Trash2 } from "lucide-react";
import type { Folder } from "@/types";

type VaultFoldersPanelProps = {
  folders: Folder[];
  selectedFolderId: string | null;
  showFavorites: boolean;
  onSelectAll: () => void;
  onSelectFavorites: () => void;
  onSelectFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
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
  onDeleteFolder,
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
          <div
            key={folder.id}
            className={`group mb-1 flex items-center gap-1 rounded-xl transition ${
              selectedFolderId === folder.id
                ? "bg-accent/20"
                : "hover:bg-card"
            }`}
          >
            <button
              type="button"
              onClick={wrap(() => onSelectFolder(folder.id))}
              className={`min-w-0 flex-1 rounded-xl px-3 py-3 text-left text-sm transition active:scale-[0.98] ${
                selectedFolderId === folder.id
                  ? "text-accent"
                  : "text-foreground"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate">{folder.name}</span>
                <span className="ml-2 shrink-0 text-xs text-muted">
                  {folder._count.songs}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteFolder(folder.id)}
              className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted opacity-100 transition hover:bg-red-500/10 hover:text-red-400 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
              aria-label={`Delete ${folder.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
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
