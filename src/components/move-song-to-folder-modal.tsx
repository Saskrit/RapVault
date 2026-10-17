"use client";

import { FolderInput, FolderMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import type { Folder, Song } from "@/types";

type MoveSongToFolderModalProps = {
  open: boolean;
  onClose: () => void;
  song: Song | null;
  folders: Folder[];
  onMoved: () => void;
};

export function MoveSongToFolderModal({
  open,
  onClose,
  song,
  folders,
  onMoved,
}: MoveSongToFolderModalProps) {
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setError("");
  }, [open, song?.id]);

  async function moveToFolder(folderId: string | null) {
    if (!song || moving) return;
    if (song.folderId === folderId) {
      onClose();
      return;
    }

    setMoving(true);
    setError("");
    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) throw new Error("Move failed");
      onMoved();
      onClose();
    } catch {
      setError("Could not move song. Try again.");
    } finally {
      setMoving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to folder"
      description={
        song
          ? `Choose a folder for "${song.title}".`
          : undefined
      }
    >
      <div className="space-y-4">
        {folders.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            Create a folder first from the sidebar.
          </p>
        ) : (
          <ul className="max-h-[min(50vh,320px)] space-y-1 overflow-y-auto rounded-xl border border-border p-1">
            {folders.map((folder) => {
              const isCurrent = song?.folderId === folder.id;
              return (
                <li key={folder.id}>
                  <button
                    type="button"
                    disabled={moving}
                    onClick={() => moveToFolder(folder.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition hover:bg-background disabled:opacity-50 ${
                      isCurrent ? "bg-accent/10 text-accent" : "text-foreground"
                    }`}
                  >
                    <span className="truncate font-medium">{folder.name}</span>
                    {isCurrent && (
                      <span className="shrink-0 text-xs">Current</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {song?.folderId && (
          <button
            type="button"
            disabled={moving}
            onClick={() => moveToFolder(null)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
          >
            <FolderMinus className="h-4 w-4" />
            Remove from folder
          </button>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            className="min-h-11 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50 sm:py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
