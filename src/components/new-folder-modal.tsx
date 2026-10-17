"use client";

import { FolderPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/modal";

type NewFolderModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export function NewFolderModal({ open, onClose, onCreate }: NewFolderModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Folder name is required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onCreate(trimmed);
      onClose();
    } catch {
      setError("Could not create folder. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New folder"
      description="Organize your songs — hooks, freestyles, ideas, and more."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="folder-name" className="mb-1.5 block text-sm text-muted">
            Folder name
          </label>
          <input
            id="folder-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer 2026, Collab Ideas"
            className="w-full min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none focus:border-accent"
            maxLength={60}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-11 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50 sm:py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50 sm:py-2"
          >
            <FolderPlus className="h-4 w-4" />
            {loading ? "Creating..." : "Create folder"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
