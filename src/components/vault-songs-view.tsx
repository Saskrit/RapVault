"use client";

import { FolderInput, PanelLeftClose, Plus, RotateCcw, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MoveSongToFolderModal } from "@/components/move-song-to-folder-modal";
import { AddSongsToFolderModal } from "@/components/add-songs-to-folder-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { NewFolderModal } from "@/components/new-folder-modal";
import { VaultFoldersPanel } from "@/components/vault-folders-panel";
import { VaultHeader } from "@/components/vault-header";
import {
  VaultMobileNav,
  type MobileTab,
} from "@/components/vault-mobile-nav";
import { contentSnippet } from "@/lib/rich-text";
import type { Folder, Song } from "@/types";

export function VaultSongsView() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [songToMove, setSongToMove] = useState<Song | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [songToPurge, setSongToPurge] = useState<Song | null>(null);
  const [purging, setPurging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (res.ok) {
      const data = await res.json();
      setFolders(data.folders);
    }
  }, []);

  const fetchTrashCount = useCallback(async () => {
    const res = await fetch("/api/songs?trash=true");
    if (res.ok) {
      const data = await res.json();
      setTrashCount(data.songs.length);
    }
  }, []);

  const fetchSongs = useCallback(async () => {
    const params = new URLSearchParams();
    if (showTrash) {
      params.set("trash", "true");
    } else {
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (showFavorites) params.set("favorites", "true");
    }
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    const res = await fetch(`/api/songs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSongs(data.songs);
      if (showTrash) setTrashCount(data.songs.length);
    }
  }, [selectedFolderId, showFavorites, showTrash, searchQuery]);

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
      await Promise.all([fetchFolders(), fetchSongs(), fetchTrashCount()]);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [selectedFolderId, showFavorites, showTrash, searchQuery, fetchSongs]);

  async function handleNewSong() {
    if (showTrash) return;
    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: selectedFolderId }),
    });
    if (res.ok) {
      const data = await res.json();
      setFolderDrawerOpen(false);
      router.push(`/vault/write/${data.song.id}`);
    }
  }

  function openSong(song: Song) {
    if (showTrash) return;
    router.push(`/vault/write/${song.id}`);
  }

  async function toggleFavorite(song: Song) {
    const res = await fetch(`/api/songs/${song.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !song.isFavorite }),
    });
    if (res.ok) {
      const data = await res.json();
      setSongs((prev) => prev.map((item) => (item.id === song.id ? data.song : item)));
    }
  }

  async function restoreSong(song: Song) {
    const res = await fetch(`/api/songs/${song.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    if (res.ok) {
      setSongs((prev) => prev.filter((item) => item.id !== song.id));
      setTrashCount((count) => Math.max(0, count - 1));
      await fetchFolders();
    }
  }

  async function confirmPurgeSong() {
    if (!songToPurge) return;
    setPurging(true);
    try {
      const res = await fetch(`/api/songs/${songToPurge.id}?permanent=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSongs((prev) => prev.filter((item) => item.id !== songToPurge.id));
        setTrashCount((count) => Math.max(0, count - 1));
        setSongToPurge(null);
      }
    } finally {
      setPurging(false);
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

  function requestDeleteFolder(id: string) {
    const folder = folders.find((f) => f.id === id);
    if (folder) setFolderToDelete(folder);
  }

  async function confirmDeleteFolder() {
    if (!folderToDelete) return;
    setDeletingFolder(true);
    try {
      const res = await fetch(`/api/folders/${folderToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedFolderId === folderToDelete.id) {
          setSelectedFolderId(null);
        }
        setFolderToDelete(null);
        await fetchFolders();
        await fetchSongs();
      }
    } finally {
      setDeletingFolder(false);
    }
  }

  async function handleSongMoved() {
    await fetchFolders();
    await fetchSongs();
  }

  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  const folderLabel = showTrash
    ? "Recycle Bin"
    : showFavorites
      ? "Favorites"
      : selectedFolderId
        ? folders.find((f) => f.id === selectedFolderId)?.name ?? "Folder"
        : "All Songs";

  const mobileTab: MobileTab = folderDrawerOpen ? "folders" : "songs";

  const folderPanelProps = {
    folders,
    selectedFolderId,
    showFavorites,
    showTrash,
    trashCount,
    onSelectAll: () => {
      setShowFavorites(false);
      setShowTrash(false);
      setSelectedFolderId(null);
    },
    onSelectFavorites: () => {
      setShowFavorites(true);
      setShowTrash(false);
      setSelectedFolderId(null);
    },
    onSelectTrash: () => {
      setShowTrash(true);
      setShowFavorites(false);
      setSelectedFolderId(null);
    },
    onSelectFolder: (id: string) => {
      setShowFavorites(false);
      setShowTrash(false);
      setSelectedFolderId(id);
    },
    onDeleteFolder: requestDeleteFolder,
    onNewFolder: () => setShowNewFolderModal(true),
    onNewSong: handleNewSong,
    onNavigate: () => setFolderDrawerOpen(false),
  };

  const iconBtn =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted transition active:scale-95 hover:border-foreground/20 hover:text-foreground";

  function renderSongList(className = "") {
    return (
      <section className={`flex min-h-0 min-w-0 flex-1 flex-col bg-background ${className}`}>
        <div className="shrink-0 border-b border-border bg-card px-4 py-4 lg:px-6">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {showTrash ? "Trash" : "Collection"}
              </p>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {folderLabel}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {songs.length} song{songs.length !== 1 ? "s" : ""}
                {showTrash ? " waiting to restore or delete" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedFolder && !showTrash && (
                <button
                  type="button"
                  onClick={() => setShowAddSongsModal(true)}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-medium text-muted transition hover:border-foreground/20 hover:text-foreground"
                >
                  <FolderInput className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Add songs</span>
                </button>
              )}
              {!showTrash && (
                <button
                  type="button"
                  onClick={handleNewSong}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-white transition hover:bg-accent/90 lg:hidden"
                  aria-label="New song"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-5">
          {songs.length === 0 ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-muted">
                {showTrash ? <Trash2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {showTrash ? "Recycle Bin is empty" : "No songs here yet"}
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  {showTrash
                    ? "Deleted songs will show up here so you can restore them."
                    : "Start a track and keep your bars organized in one place."}
                </p>
              </div>
              {!showTrash && (
                <button
                  type="button"
                  onClick={handleNewSong}
                  className="mt-2 min-h-11 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
                >
                  New song
                </button>
              )}
            </div>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col gap-2">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="group flex items-stretch overflow-hidden rounded-2xl border border-border bg-card transition hover:border-foreground/15"
                >
                  <button
                    type="button"
                    onClick={() => openSong(song)}
                    disabled={showTrash}
                    className="min-w-0 flex-1 px-4 py-3.5 text-left transition active:bg-background disabled:cursor-default sm:px-5 sm:py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                        {song.title || "Untitled"}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {song.folder && (
                          <span className="rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-[11px]">
                            {song.folder.name}
                          </span>
                        )}
                        {song.isFavorite && !showTrash && (
                          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-sm text-muted">
                      {contentSnippet(song.content) || "No lyrics yet"}
                    </p>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                      {showTrash
                        ? `Deleted ${song.deletedAt ? new Date(song.deletedAt).toLocaleDateString() : ""}`
                        : `${song.status === "draft" ? "Draft" : "Finished"} · ${new Date(song.updatedAt).toLocaleDateString()}`}
                    </p>
                  </button>
                  {showTrash ? (
                    <div className="flex shrink-0 border-l border-border">
                      <button
                        type="button"
                        onClick={() => restoreSong(song)}
                        className="flex w-12 items-center justify-center text-muted transition hover:bg-background hover:text-accent sm:w-14"
                        aria-label={`Restore "${song.title}"`}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSongToPurge(song)}
                        className="flex w-12 items-center justify-center border-l border-border text-muted transition hover:bg-background hover:text-red-400 sm:w-14"
                        aria-label={`Delete "${song.title}" forever`}
                        title="Delete forever"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 border-l border-border">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(song)}
                        className="flex w-12 items-center justify-center text-muted transition hover:bg-background hover:text-amber-400 sm:w-14"
                        aria-label={song.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        title={song.isFavorite ? "Unfavorite" : "Favorite"}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            song.isFavorite ? "fill-amber-400 text-amber-400" : ""
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSongToMove(song)}
                        className="flex w-12 items-center justify-center border-l border-border text-muted transition hover:bg-background hover:text-accent sm:w-14"
                        aria-label={`Add "${song.title}" to folder`}
                        title="Add to folder"
                      >
                        <FolderInput className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background text-muted">
        <div className="h-8 w-8 animate-pulse rounded-xl border border-border bg-card" />
        <p className="text-sm">Loading your vault...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <VaultHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        mobileSearchOpen={mobileSearchOpen}
        onMobileSearchOpen={setMobileSearchOpen}
        centerLabel={folderLabel}
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
      </VaultHeader>

      <div className="hidden min-h-0 flex-1 lg:flex">
        <aside
          className={`flex shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width] duration-300 ${
            sidebarOpen ? "w-60 xl:w-72" : "w-0 border-r-0"
          }`}
        >
          <div className="flex h-full min-w-60 flex-col xl:min-w-72">
            <VaultFoldersPanel {...folderPanelProps} />
          </div>
        </aside>
        {renderSongList()}
      </div>

      <div className="flex min-h-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden">
        {renderSongList("min-h-0 flex-1")}
      </div>

      {folderDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={() => setFolderDrawerOpen(false)}
            aria-label="Close folders"
          />
          <aside className="absolute bottom-0 left-0 top-0 flex w-[min(88vw,320px)] max-w-full flex-col border-r border-border bg-sidebar">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Navigate
                </p>
                <h2 className="text-base font-semibold tracking-tight">Folders</h2>
              </div>
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
        onSongs={() => setFolderDrawerOpen(false)}
        onEditor={handleNewSong}
        editorDisabled={showTrash}
      />

      <NewFolderModal
        open={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreate={createFolder}
      />

      {selectedFolder && (
        <AddSongsToFolderModal
          open={showAddSongsModal}
          onClose={() => setShowAddSongsModal(false)}
          folderId={selectedFolder.id}
          folderName={selectedFolder.name}
          onAdded={handleSongMoved}
        />
      )}

      <MoveSongToFolderModal
        open={songToMove !== null}
        onClose={() => setSongToMove(null)}
        song={songToMove}
        folders={folders}
        onMoved={handleSongMoved}
      />

      <ConfirmModal
        open={folderToDelete !== null}
        onClose={() => !deletingFolder && setFolderToDelete(null)}
        onConfirm={confirmDeleteFolder}
        title="Delete folder?"
        description={`"${folderToDelete?.name ?? "This folder"}" will be removed. Songs inside it will stay in your library under All Songs.`}
        confirmLabel="Delete folder"
        destructive
        loading={deletingFolder}
      />

      <ConfirmModal
        open={songToPurge !== null}
        onClose={() => !purging && setSongToPurge(null)}
        onConfirm={confirmPurgeSong}
        title="Delete forever?"
        description={`"${songToPurge?.title || "This song"}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete forever"
        destructive
        loading={purging}
      />
    </div>
  );
}
