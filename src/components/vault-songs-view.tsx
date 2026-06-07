"use client";

import { FolderInput, PanelLeftClose, Plus, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AddSongsToFolderModal } from "@/components/add-songs-to-folder-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { NewFolderModal } from "@/components/new-folder-modal";
import { VaultFoldersPanel } from "@/components/vault-folders-panel";
import { VaultHeader } from "@/components/vault-header";
import {
  VaultMobileNav,
  type MobileTab,
} from "@/components/vault-mobile-nav";
import type { Folder, Song } from "@/types";

export function VaultSongsView() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
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

  const fetchSongs = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedFolderId) params.set("folderId", selectedFolderId);
    if (showFavorites) params.set("favorites", "true");
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    const res = await fetch(`/api/songs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSongs(data.songs);
    }
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
      await fetchSongs();
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [selectedFolderId, showFavorites, searchQuery, fetchSongs]);

  async function handleNewSong() {
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
    router.push(`/vault/write/${song.id}`);
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

  async function handleSongsAddedToFolder() {
    await fetchFolders();
    await fetchSongs();
  }

  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  const folderLabel = showFavorites
    ? "Favorites"
    : selectedFolderId
      ? folders.find((f) => f.id === selectedFolderId)?.name ?? "Folder"
      : "All Songs";

  const mobileTab: MobileTab = folderDrawerOpen ? "folders" : "songs";

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
    onDeleteFolder: requestDeleteFolder,
    onNewFolder: () => setShowNewFolderModal(true),
    onNewSong: handleNewSong,
    onNavigate: () => setFolderDrawerOpen(false),
  };

  const iconBtn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition active:scale-95 hover:border-accent hover:text-accent";

  function renderSongList(className = "") {
    return (
      <section className={`flex min-h-0 min-w-0 flex-1 flex-col bg-card/50 ${className}`}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {folderLabel}
            </p>
            <p className="text-xs text-muted">
              {songs.length} song{songs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {selectedFolder && (
              <button
                type="button"
                onClick={() => setShowAddSongsModal(true)}
                className="flex h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
              >
                <FolderInput className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Add songs</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleNewSong}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white lg:hidden"
              aria-label="New song"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
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
                onClick={() => openSong(song)}
                className="w-full border-b border-border px-4 py-4 text-left transition active:bg-card hover:bg-card/80"
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

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted">
        Loading your vault...
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
            sidebarOpen ? "w-56 xl:w-64" : "w-0 border-r-0"
          }`}
        >
          <div className="flex h-full min-w-56 flex-col xl:min-w-64">
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
        onSongs={() => setFolderDrawerOpen(false)}
        onEditor={handleNewSong}
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
          onAdded={handleSongsAddedToFolder}
        />
      )}

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
    </div>
  );
}
