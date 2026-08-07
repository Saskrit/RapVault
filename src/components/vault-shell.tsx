"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { NewFolderModal } from "@/components/new-folder-modal";
import { VaultFoldersPanel } from "@/components/vault-folders-panel";
import { VaultHeader, iconBtn } from "@/components/vault-header";
import type { Folder } from "@/types";
import {
  cacheFolders,
  getCachedFolders,
  isBrowserOffline,
} from "@/lib/offline-songs";
import {
  preferenceStorageGet,
  preferenceStorageSet,
} from "@/lib/safe-storage";

type VaultShellProps = {
  children: ReactNode;
  /** Optional search bar in header (library only) */
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  mobileSearchOpen?: boolean;
  onMobileSearchOpen?: (open: boolean) => void;
  centerLabel?: string;
  /** Extra UI under the main column (e.g. mobile bottom nav) */
  footer?: ReactNode;
  /** Called when folders change so library pages can refresh */
  onFoldersChange?: (folders: Folder[]) => void;
  /** Expose open folder drawer for mobile nav */
  folderDrawerOpen?: boolean;
  onFolderDrawerOpenChange?: (open: boolean) => void;
};

export function VaultShell({
  children,
  searchQuery,
  onSearchChange,
  mobileSearchOpen,
  onMobileSearchOpen,
  centerLabel,
  footer,
  onFoldersChange,
  folderDrawerOpen: controlledDrawer,
  onFolderDrawerOpenChange,
}: VaultShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [internalDrawer, setInternalDrawer] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const folderDrawerOpen = controlledDrawer ?? internalDrawer;
  const setFolderDrawerOpen = onFolderDrawerOpenChange ?? setInternalDrawer;

  const view = searchParams.get("view");
  const folderParam = searchParams.get("folder");
  const showFavorites = pathname === "/vault" && view === "favorites";
  const showTrash = pathname === "/vault" && view === "trash";
  const showCollaborations =
    pathname === "/vault" && view === "collaborations";
  const selectedFolderId =
    pathname === "/vault" &&
    folderParam &&
    !showFavorites &&
    !showTrash &&
    !showCollaborations
      ? folderParam
      : null;

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = (await res.json()) as { folders: Folder[] };
        cacheFolders(data.folders);
        setFolders(data.folders);
        onFoldersChange?.(data.folders);
        return;
      }
    } catch {
      // Fall through to cache when offline.
    }

    const cached = getCachedFolders();
    if (cached.length > 0 || isBrowserOffline()) {
      setFolders(cached);
      onFoldersChange?.(cached);
    }
  }, [onFoldersChange]);

  const fetchTrashCount = useCallback(async () => {
    try {
      const res = await fetch("/api/songs?trash=true");
      if (res.ok) {
        const data = await res.json();
        setTrashCount(data.songs.length);
      }
    } catch {
      // Keep last known count offline.
    }
  }, []);

  useEffect(() => {
    const saved = preferenceStorageGet("rapvault-sidebar");
    if (saved === "closed") setSidebarOpen(false);
  }, []);

  useEffect(() => {
    fetchFolders();
    fetchTrashCount();
  }, [fetchFolders, fetchTrashCount]);

  useEffect(() => {
    if (folderDrawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [folderDrawerOpen]);

  function toggleSidebar() {
    setSidebarOpen((open) => {
      const next = !open;
      preferenceStorageSet("rapvault-sidebar", next ? "open" : "closed");
      return next;
    });
  }

  function goLibrary(query?: Record<string, string>) {
    const params = new URLSearchParams(query);
    const qs = params.toString();
    router.push(qs ? `/vault?${qs}` : "/vault");
    setFolderDrawerOpen(false);
  }

  async function createFolder(name: string) {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchFolders();
      goLibrary({ folder: data.folder.id });
    }
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
          goLibrary();
        }
        setFolderToDelete(null);
        await fetchFolders();
      }
    } finally {
      setDeletingFolder(false);
    }
  }

  async function handleNewSong() {
    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderId: selectedFolderId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setFolderDrawerOpen(false);
      router.push(`/vault/write/${data.song.id}`);
    }
  }

  const folderPanelProps = {
    folders,
    selectedFolderId,
    showFavorites,
    showTrash,
    showCollaborations,
    trashCount,
    onSelectAll: () => goLibrary(),
    onSelectFavorites: () => goLibrary({ view: "favorites" }),
    onSelectTrash: () => goLibrary({ view: "trash" }),
    onSelectCollaborations: () => goLibrary({ view: "collaborations" }),
    onSelectFolder: (id: string) => goLibrary({ folder: id }),
    onDeleteFolder: (id: string) => {
      const folder = folders.find((f) => f.id === id) || null;
      setFolderToDelete(folder);
    },
    onNewFolder: () => setShowNewFolderModal(true),
    onNewSong: handleNewSong,
    onNavigate: () => setFolderDrawerOpen(false),
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <VaultHeader
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        mobileSearchOpen={mobileSearchOpen}
        onMobileSearchOpen={onMobileSearchOpen}
        centerLabel={centerLabel}
      >
        <button
          type="button"
          onClick={() => setFolderDrawerOpen(true)}
          className={`${iconBtn} lg:hidden`}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          className={`${iconBtn} hidden lg:flex`}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </VaultHeader>

      <div className="hidden min-h-0 flex-1 lg:flex">
        <aside
          className={`flex shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width] duration-300 ${
            sidebarOpen ? "w-60 xl:w-72" : "w-12"
          }`}
        >
          {sidebarOpen ? (
            <div className="flex h-full min-w-60 flex-col xl:min-w-72">
              <VaultFoldersPanel {...folderPanelProps} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center py-3">
              <button
                type="button"
                onClick={toggleSidebar}
                className={iconBtn}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          )}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
        {children}
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
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Navigate
                </p>
                <h2 className="text-base font-semibold tracking-tight">Menu</h2>
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

      {footer}

      <NewFolderModal
        open={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreate={createFolder}
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
    </div>
  );
}
