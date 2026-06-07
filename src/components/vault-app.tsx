"use client";

import {
  ArrowLeft,
  Download,
  LogOut,
  PanelLeftClose,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { Logo } from "@/components/logo";
import { NewFolderModal } from "@/components/new-folder-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { VaultFoldersPanel } from "@/components/vault-folders-panel";
import {
  VaultMobileNav,
  type MobileTab,
} from "@/components/vault-mobile-nav";
import { GENRES } from "@/lib/constants";
import { buildTxtExport, downloadTxt } from "@/lib/export";
import { calculateLyricStats, formatDuration } from "@/lib/stats";
import type { Folder, Song } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";
type MobileView = "songs" | "editor";

const MOBILE_MQ = "(max-width: 1023px)";

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches;
}

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileView, setMobileView] = useState<MobileView>("songs");
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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
    const saved = localStorage.getItem("rapvault-sidebar");
    if (saved === "closed") setSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (folderDrawerOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [folderDrawerOpen]);

  function toggleSidebar() {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("rapvault-sidebar", next ? "open" : "closed");
      return next;
    });
  }

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
      if (isMobileViewport()) setMobileView("editor");
      setFolderDrawerOpen(false);
      await fetchFolders();
    }
  }

  function selectSong(song: Song) {
    setActiveSong(song);
    if (isMobileViewport()) setMobileView("editor");
  }

  async function confirmDeleteSong() {
    if (!activeSong) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/songs/${activeSong.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const remaining = songs.filter((s) => s.id !== activeSong.id);
        setSongs(remaining);
        setActiveSong(remaining[0] ?? null);
        if (isMobileViewport()) setMobileView("songs");
        await fetchFolders();
        setShowDeleteModal(false);
      }
    } finally {
      setDeleting(false);
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

  const folderLabel = showFavorites
    ? "Favorites"
    : selectedFolderId
      ? folders.find((f) => f.id === selectedFolderId)?.name ?? "Folder"
      : "All Songs";

  const mobileTab: MobileTab = folderDrawerOpen
    ? "folders"
    : mobileView === "editor"
      ? "editor"
      : "songs";

  const folderPanelProps = {
    folders,
    selectedFolderId,
    showFavorites,
    onSelectAll: () => {
      setShowFavorites(false);
      setSelectedFolderId(null);
    },
    onSelectFavorites: () => {
      setShowFavorites(true);
      setSelectedFolderId(null);
    },
    onSelectFolder: (id: string) => {
      setShowFavorites(false);
      setSelectedFolderId(id);
    },
    onNewFolder: () => setShowNewFolderModal(true),
    onNewSong: handleNewSong,
    onNavigate: () => {
      setFolderDrawerOpen(false);
      setMobileView("songs");
    },
  };

  const iconBtn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition active:scale-95 hover:border-accent hover:text-accent";

  function renderSongList(className = "") {
    return (
      <section className={`flex min-h-0 min-w-0 flex-col bg-card/50 ${className}`}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {folderLabel}
            </p>
            <p className="text-xs text-muted">
              {songs.length} song{songs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewSong}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white lg:hidden"
            aria-label="New song"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm text-muted">No songs in this view yet.</p>
              <button
                type="button"
                onClick={handleNewSong}
                className="min-h-11 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white"
              >
                New song
              </button>
            </div>
          ) : (
            songs.map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => selectSong(song)}
                className={`w-full border-b border-border px-4 py-4 text-left transition active:bg-card ${
                  activeSong?.id === song.id ? "bg-accent/10" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-medium">{song.title}</span>
                  {song.isFavorite && (
                    <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted">
                  {song.content.slice(0, 80) || "Empty draft"}
                </p>
                <p className="mt-1.5 text-xs text-muted">
                  {song.status === "draft" ? "Draft" : "Finished"} ·{" "}
                  {new Date(song.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </section>
    );
  }

  function renderEditor(className = "") {
    if (!activeSong) {
      return (
        <main
          className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-muted ${className}`}
        >
          <p className="text-center text-lg">Pick a song to write</p>
          <button
            type="button"
            onClick={handleNewSong}
            className="hidden min-h-11 rounded-xl bg-accent px-6 py-3 font-semibold text-white lg:inline-flex"
          >
            Write your first song
          </button>
          <button
            type="button"
            onClick={() => setMobileView("songs")}
            className="min-h-11 rounded-xl bg-accent px-6 py-3 font-semibold text-white lg:hidden"
          >
            Browse songs
          </button>
        </main>
      );
    }

    return (
      <main className={`flex min-h-0 min-w-0 flex-1 flex-col ${className}`}>
        <div className="shrink-0 border-b border-border px-4 py-3 lg:px-6 lg:py-4">
          <button
            type="button"
            onClick={() => setMobileView("songs")}
            className="mb-3 flex min-h-11 items-center gap-1 text-sm text-accent lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Songs
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <input
              type="text"
              value={activeSong.title}
              onChange={(e) => scheduleSave({ title: e.target.value })}
              className="min-w-0 w-full bg-transparent text-xl font-bold outline-none placeholder:text-muted sm:flex-1 lg:text-2xl"
              placeholder="Song title"
            />
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() =>
                  scheduleSave({ isFavorite: !activeSong.isFavorite })
                }
                className={iconBtn}
                aria-label="Toggle favorite"
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
                className={`${iconBtn} w-auto gap-1.5 px-3`}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span className="text-sm">TXT</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className={`${iconBtn} hover:border-red-500/50 hover:text-red-400`}
                aria-label="Delete song"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-4">
            <select
              value={activeSong.status}
              onChange={(e) => scheduleSave({ status: e.target.value })}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option value="draft">Draft</option>
              <option value="finished">Finished</option>
            </select>
            <select
              value={activeSong.genre}
              onChange={(e) => scheduleSave({ genre: e.target.value })}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
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
                scheduleSave({ folderId: e.target.value || null })
              }
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
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
              onChange={(e) => scheduleSave({ moodTags: e.target.value })}
              placeholder="Mood tags"
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent min-[420px]:col-span-2 xl:col-span-1"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{stats.words} words</span>
            <span>{stats.lines} lines</span>
            <span>~{formatDuration(stats.estimatedSeconds)}</span>
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
          onChange={(e) => scheduleSave({ content: e.target.value })}
          placeholder="Drop your bars here..."
          className="min-h-0 flex-1 resize-none bg-editor px-4 py-4 font-mono text-base leading-relaxed text-foreground outline-none placeholder:text-muted lg:px-6 lg:py-5"
          spellCheck
        />
      </main>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted">
        Loading your vault...
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-xl pt-[max(0.625rem,env(safe-area-inset-top))]">
        {/* Mobile search bar */}
        <div
          className={`items-center gap-2 px-3 py-2.5 lg:hidden ${
            mobileSearchOpen ? "flex" : "hidden"
          }`}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              autoFocus={mobileSearchOpen}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full min-h-11 rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-base outline-none focus:border-accent"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className={iconBtn}
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Default header */}
        <div
          className={`items-center gap-2 px-3 py-2.5 lg:gap-3 lg:px-4 lg:py-3 ${
            mobileSearchOpen ? "hidden" : "flex"
          }`}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className={`${iconBtn} hidden lg:flex`}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeftClose
              className={`h-4 w-4 transition ${sidebarOpen ? "" : "rotate-180"}`}
            />
          </button>

          <Logo size={32} href={null} priority />

          <div className="relative mx-auto hidden min-w-0 max-w-md flex-1 lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, lyrics, tags..."
              className="w-full min-h-10 rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-accent"
            />
          </div>

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted lg:hidden">
            {mobileView === "editor" && activeSong ? activeSong.title : folderLabel}
          </p>

          <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className={`${iconBtn} lg:hidden`}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className={`${iconBtn} hover:border-red-500/50 hover:text-red-400`}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop: 3-column */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <aside
          className={`flex shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width] duration-300 ${
            sidebarOpen ? "w-56 xl:w-64" : "w-0 border-r-0"
          }`}
        >
          <div className="flex h-full min-w-56 flex-col xl:min-w-64">
            <VaultFoldersPanel {...folderPanelProps} />
          </div>
        </aside>
        {renderSongList("w-56 shrink-0 border-r border-border xl:w-64")}
        {renderEditor("min-w-0")}
      </div>

      {/* Mobile / tablet: single panel + bottom nav */}
      <div className="flex min-h-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden">
        <div
          className={`min-h-0 flex-1 ${mobileView === "songs" ? "flex flex-col" : "hidden"}`}
        >
          {renderSongList("min-h-0 flex-1")}
        </div>
        <div
          className={`min-h-0 flex-1 ${mobileView === "editor" ? "flex flex-col" : "hidden"}`}
        >
          {renderEditor("min-h-0 flex-1")}
        </div>
      </div>

      {/* Folder drawer */}
      {folderDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFolderDrawerOpen(false)}
            aria-label="Close folders"
          />
          <aside className="absolute bottom-0 left-0 top-0 flex w-[min(88vw,320px)] max-w-full flex-col bg-sidebar shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <h2 className="font-semibold">Folders</h2>
              <button
                type="button"
                onClick={() => setFolderDrawerOpen(false)}
                className={iconBtn}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <VaultFoldersPanel {...folderPanelProps} />
            </div>
          </aside>
        </div>
      )}

      <VaultMobileNav
        active={mobileTab}
        onFolders={() => setFolderDrawerOpen(true)}
        onSongs={() => {
          setFolderDrawerOpen(false);
          setMobileView("songs");
        }}
        onEditor={() => {
          setFolderDrawerOpen(false);
          if (activeSong) setMobileView("editor");
        }}
        editorDisabled={!activeSong}
      />

      <NewFolderModal
        open={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreate={createFolder}
      />

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        onConfirm={confirmDeleteSong}
        title="Delete song?"
        description={`"${activeSong?.title ?? "This song"}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}
