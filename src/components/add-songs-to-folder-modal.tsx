"use client";

import { FolderInput } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import type { Song } from "@/types";

type AddSongsToFolderModalProps = {
  open: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  onAdded: () => void;
};

export function AddSongsToFolderModal({
  open,
  onClose,
  folderId,
  folderName,
  onAdded,
}: AddSongsToFolderModalProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setSelected(new Set());
    setError("");
    setLoading(true);

    fetch("/api/songs")
      .then((res) => (res.ok ? res.json() : { songs: [] }))
      .then((data) => {
        setSongs(
          (data.songs as Song[]).filter((song) => song.folderId !== folderId),
        );
      })
      .finally(() => setLoading(false));
  }, [open, folderId]);

  function toggleSong(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;

    setAdding(true);
    setError("");
    try {
      const results = await Promise.all(
        [...selected].map((songId) =>
          fetch(`/api/songs/${songId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId }),
          }),
        ),
      );
      if (results.some((res) => !res.ok)) {
        throw new Error("Failed to add some songs");
      }
      onAdded();
      onClose();
    } catch {
      setError("Could not add songs. Try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add songs to folder"
      description={`Move existing songs into "${folderName}".`}
    >
      <div className="space-y-4">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted">Loading songs...</p>
        ) : songs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            All your songs are already in this folder.
          </p>
        ) : (
          <ul className="max-h-[min(50vh,320px)] space-y-1 overflow-y-auto rounded-xl border border-border p-1">
            {songs.map((song) => {
              const checked = selected.has(song.id);
              return (
                <li key={song.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition hover:bg-background ${
                      checked ? "bg-accent/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSong(song.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-accent"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {song.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {song.folder
                          ? `In ${song.folder.name}`
                          : "Not in a folder"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={adding}
            className="min-h-11 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50 sm:py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || selected.size === 0 || songs.length === 0}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50 sm:py-2"
          >
            <FolderInput className="h-4 w-4" />
            {adding
              ? "Adding..."
              : selected.size > 0
                ? `Add ${selected.size} song${selected.size !== 1 ? "s" : ""}`
                : "Add songs"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
