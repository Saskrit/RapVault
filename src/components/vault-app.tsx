"use client";

import {
  Download,
  FolderPlus,
  LogOut,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { NewFolderModal } from "@/components/new-folder-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { GENRES } from "@/lib/constants";
import { buildTxtExport, downloadTxt } from "@/lib/export";
import { calculateLyricStats, formatDuration } from "@/lib/stats";
import type { Folder, Song } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function VaultApp() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Partial<Song> | null>(null);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (res.ok) {
      const data = await res.json();
      setFolders(data.folders);
    }
  }, []);

  const fetchSongs = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedFolderId) params.set("folderId", selectedFolderId);
    if (showFavorites) params.set("favorites", "true");
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    const res = await fetch(`/api/songs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSongs(data.songs);
      return data.songs as Song[];
    }
    return [];
  }, [selectedFolderId, showFavorites, searchQuery]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchFolders();
      const list = await fetchSongs();
      if (list.length > 0 && !activeSong) {
        setActiveSong(list[0]);
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSongs().then((list) => {
      setActiveSong((current) => {
        if (current) {
          const updated = list.find((s: Song) => s.id === current.id);
          if (updated) return updated;
          return list[0] ?? null;
        }
        return list[0] ?? null;
      });
    });
  }, [selectedFolderId, showFavorites, searchQuery, fetchSongs]);

  const persistSong = useCallback(
    async (songId: string, patch: Partial<Song>) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/songs/${songId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        setActiveSong(data.song);
        setSongs((prev) =>
          prev.map((s) => (s.id === data.song.id ? data.song : s)),
        );
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("error");
      }
    },
    [],
  );

  const scheduleSave = useCallback(
    (patch: Partial<Song>) => {
      if (!activeSong) return;
      const songId = activeSong.id;
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      setActiveSong((prev) => (prev ? { ...prev, ...patch } : prev));

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (pendingPatch.current) {
          const toSave = pendingPatch.current;
          pendingPatch.current = null;
          persistSong(songId, toSave);
        }
      }, 2000);
    },
    [activeSong, persistSong],
  );

  async function handleNewSong() {
    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: selectedFolderId }),
    });
    if (res.ok) {
      const data = await res.json();
      setSongs((prev) => [data.song, ...prev]);
      setActiveSong(data.song);
      await fetchFolders();
    }
  }

  async function handleDeleteSong() {
    if (!activeSong || !confirm("Delete this song permanently?")) return;
    const res = await fetch(`/api/songs/${activeSong.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const remaining = songs.filter((s) => s.id !== activeSong.id);
      setSongs(remaining);
      setActiveSong(remaining[0] ?? null);
      await fetchFolders();
    }
  }

  async function createFolder(name: string) {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create folder");
    }
    await fetchFolders();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleExport() {
    if (!activeSong) return;
    const txt = buildTxtExport({
      title: activeSong.title,
      content: activeSong.content,
      genre: activeSong.genre,
      moodTags: activeSong.moodTags,
      status: activeSong.status,
      createdAt: activeSong.createdAt,
      updatedAt: activeSong.updatedAt,
    });
    downloadTxt(activeSong.title, txt);
  }

  const stats = activeSong
    ? calculateLyricStats(activeSong.content)
    : { words: 0, lines: 0, estimatedSeconds: 0 };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted">
        Loading your vault...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-4 border-b border-border px-4 py-3">
        <Logo size={36} href={null} priority />

        <div className="relative mx-auto w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, lyrics, tags..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-border p-2 text-muted transition hover:border-red-500/50 hover:text-red-400"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 flex-col border-r border-border bg-sidebar lg:w-64">
          <div className="border-b border-border p-3">
            <button
              type="button"
              onClick={() => {
                setShowFavorites(false);
                setSelectedFolderId(null);
              }}
              className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                !selectedFolderId && !showFavorites
                  ? "bg-accent/20 text-accent"
                  : "text-foreground hover:bg-card"
              }`}
            >
              All Songs
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFavorites(true);
                setSelectedFolderId(null);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
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
                onClick={() => {
                  setShowFavorites(false);
                  setSelectedFolderId(folder.id);
                }}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  selectedFolderId === folder.id
                    ? "bg-accent/20 text-accent"
                    : "text-foreground hover:bg-card"
                }`}
              >
                <span className="truncate">{folder.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {folder._count.songs}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowNewFolderModal(true)}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-card hover:text-foreground"
            >
              <FolderPlus className="h-4 w-4" />
              New folder
            </button>
          </div>

          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={handleNewSong}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              New song
            </button>
          </div>
        </aside>

        <section className="flex w-64 flex-col border-r border-border bg-card/50 lg:w-72">
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-muted">
            {songs.length} song{songs.length !== 1 ? "s" : ""}
          </div>
          <div className="flex-1 overflow-y-auto">
            {songs.length === 0 ? (
              <p className="p-4 text-sm text-muted">
                No songs yet. Hit &quot;New song&quot; to start writing.
              </p>
            ) : (
              songs.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => setActiveSong(song)}
                  className={`w-full border-b border-border px-4 py-3 text-left transition hover:bg-card ${
                    activeSong?.id === song.id ? "bg-accent/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-medium">{song.title}</span>
                    {song.isFavorite && (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {song.content.slice(0, 60) || "Empty draft"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {song.status === "draft" ? "Draft" : "Finished"} ·{" "}
                    {new Date(song.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>

        <main className="flex min-w-0 flex-1 flex-col">
          {activeSong ? (
            <>
              <div className="border-b border-border px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <input
                    type="text"
                    value={activeSong.title}
                    onChange={(e) =>
                      scheduleSave({ title: e.target.value })
                    }
                    className="min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-muted"
                    placeholder="Song title"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        scheduleSave({
                          isFavorite: !activeSong.isFavorite,
                        })
                      }
                      className="rounded-lg border border-border p-2 transition hover:border-amber-400"
                      title="Toggle favorite"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          activeSong.isFavorite
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-accent"
                    >
                      <Download className="h-4 w-4" />
                      TXT
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSong}
                      className="rounded-lg border border-border p-2 text-muted transition hover:border-red-500/50 hover:text-red-400"
                      title="Delete song"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <select
                    value={activeSong.status}
                    onChange={(e) =>
                      scheduleSave({ status: e.target.value })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-accent"
                  >
                    <option value="draft">Draft</option>
                    <option value="finished">Finished</option>
                  </select>

                  <select
                    value={activeSong.genre}
                    onChange={(e) =>
                      scheduleSave({ genre: e.target.value })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-accent"
                  >
                    <option value="">Genre</option>
                    {GENRES.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={activeSong.folderId ?? ""}
                    onChange={(e) =>
                      scheduleSave({
                        folderId: e.target.value || null,
                      })
                    }
                    className="rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-accent"
                  >
                    <option value="">No folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={activeSong.moodTags}
                    onChange={(e) =>
                      scheduleSave({ moodTags: e.target.value })
                    }
                    placeholder="Mood tags (dark, hype, melodic...)"
                    className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-accent"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
                  <span>{stats.words} words</span>
                  <span>{stats.lines} lines</span>
                  <span>~{formatDuration(stats.estimatedSeconds)} rap time</span>
                  <span>
                    Created {new Date(activeSong.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    Modified{" "}
                    {new Date(activeSong.updatedAt).toLocaleString()}
                  </span>
                  <span
                    className={
                      saveState === "error"
                        ? "text-red-400"
                        : saveState === "saving"
                          ? "text-accent"
                          : saveState === "saved"
                            ? "text-green-400"
                            : ""
                    }
                  >
                    {saveState === "saving"
                      ? "Saving..."
                      : saveState === "saved"
                        ? "Saved"
                        : saveState === "error"
                          ? "Save failed"
                          : ""}
                  </span>
                </div>
              </div>

              <textarea
                value={activeSong.content}
                onChange={(e) =>
                  scheduleSave({ content: e.target.value })
                }
                placeholder="Drop your bars here..."
                className="min-h-0 flex-1 resize-none bg-editor px-6 py-5 font-mono text-base leading-relaxed text-foreground outline-none placeholder:text-muted"
                spellCheck
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted">
              <p className="text-lg">Your notebook is empty</p>
              <button
                type="button"
                onClick={handleNewSong}
                className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition hover:bg-violet-500"
              >
                Write your first song
              </button>
            </div>
          )}
        </main>
      </div>

      <NewFolderModal
        open={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreate={createFolder}
      />
    </div>
  );
}
