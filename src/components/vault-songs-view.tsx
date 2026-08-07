"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Eye,
  FolderInput,
  Globe,
  Lock,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClaimUsernameModal } from "@/components/claim-username-modal";
import { MoveSongToFolderModal } from "@/components/move-song-to-folder-modal";
import { AddSongsToFolderModal } from "@/components/add-songs-to-folder-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  VaultMobileNav,
  type MobileTab,
} from "@/components/vault-mobile-nav";
import { VaultShell } from "@/components/vault-shell";
import { contentSnippet } from "@/lib/rich-text";
import { RapVaultLoading } from "@/components/rapvault-loading";
import {
  preferenceStorageGet,
  preferenceStorageSet,
} from "@/lib/safe-storage";
import {
  applyPendingToSong,
  cacheFolders,
  cacheSongs,
  getCachedFolders,
  getCachedSongs,
  isBrowserOffline,
  queueSongPatch,
  removeCachedSong,
} from "@/lib/offline-songs";
import type { Folder, Song } from "@/types";
import { suggestUsernameFromEmail } from "@/lib/username";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_KEY = "rapvault-page-size";

type StatusFilter = "all" | "draft" | "finished";
type VisibilityFilter = "all" | "public" | "personal";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "finished", label: "Finished" },
];

const VISIBILITY_FILTERS: { id: VisibilityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "public", label: "Public" },
  { id: "personal", label: "Personal" },
];

function filterChipClass(active: boolean) {
  return `rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide transition ${
    active
      ? "bg-foreground text-background shadow-sm"
      : "text-muted hover:text-foreground"
  }`;
}

export function VaultSongsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const folderParam = searchParams.get("folder");
  const showFavorites = view === "favorites";
  const showTrash = view === "trash";
  const showCollaborations = view === "collaborations";
  const selectedFolderId =
    folderParam && !showFavorites && !showTrash && !showCollaborations
      ? folderParam
      : null;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [songToMove, setSongToMove] = useState<Song | null>(null);
  const [songToPurge, setSongToPurge] = useState<Song | null>(null);
  const [purging, setPurging] = useState(false);
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [needsUsername, setNeedsUsername] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimDisplayName, setClaimDisplayName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.needsUsername) {
          setNeedsUsername(true);
          setClaimEmail(data.user.email || "");
          setClaimDisplayName(
            data.user.displayName ||
              data.user.name ||
              (data.user.email || "").split("@")[0] ||
              "Artist",
          );
        }
      })
      .catch(() => {});
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = (await res.json()) as { folders: Folder[] };
        cacheFolders(data.folders);
        setFolders(data.folders);
        return;
      }
    } catch {
      // Fall through to cache when offline.
    }

    const cached = getCachedFolders();
    if (cached.length > 0 || isBrowserOffline()) {
      setFolders(cached);
    }
  }, []);

  const fetchSongs = useCallback(async () => {
    const params = new URLSearchParams();
    if (showTrash) {
      params.set("trash", "true");
    } else if (showCollaborations) {
      params.set("collaborations", "true");
    } else {
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (showFavorites) params.set("favorites", "true");
    }
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    try {
      const res = await fetch(`/api/songs?${params}`);
      if (res.ok) {
        const data = (await res.json()) as { songs: Song[] };
        cacheSongs(data.songs);
        setSongs(data.songs.map(applyPendingToSong));
        return;
      }
    } catch {
      // Fall through to cache when offline.
    }

    if (isBrowserOffline() || getCachedSongs().length > 0) {
      let cached = getCachedSongs();
      if (showTrash) {
        cached = cached.filter((song) => Boolean(song.deletedAt));
      } else {
        cached = cached.filter((song) => !song.deletedAt);
        if (showFavorites) {
          cached = cached.filter((song) => song.isFavorite);
        } else if (showCollaborations) {
          cached = cached.filter((song) => song.isCollaborator);
        } else if (selectedFolderId) {
          cached = cached.filter((song) => song.folderId === selectedFolderId);
        }
      }
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        cached = cached.filter(
          (song) =>
            song.title.toLowerCase().includes(q) ||
            song.content.toLowerCase().includes(q) ||
            song.genre.toLowerCase().includes(q) ||
            song.moodTags.toLowerCase().includes(q),
        );
      }
      setSongs(cached);
    }
  }, [
    selectedFolderId,
    showFavorites,
    showTrash,
    showCollaborations,
    searchQuery,
  ]);

  useEffect(() => {
    const savedSize = Number(preferenceStorageGet(PAGE_SIZE_KEY));
    if (PAGE_SIZE_OPTIONS.includes(savedSize as (typeof PAGE_SIZE_OPTIONS)[number])) {
      setPageSize(savedSize);
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    selectedFolderId,
    showFavorites,
    showTrash,
    showCollaborations,
    searchQuery,
    pageSize,
    statusFilter,
    visibilityFilter,
  ]);

  useEffect(() => {
    setStatusFilter("all");
    setVisibilityFilter("all");
  }, [selectedFolderId, showFavorites, showTrash, showCollaborations]);

  const filtersActive =
    !showTrash && (statusFilter !== "all" || visibilityFilter !== "all");

  const filteredSongs = useMemo(() => {
    if (showTrash) return songs;
    return songs.filter((song) => {
      if (statusFilter === "draft" && song.status !== "draft") return false;
      if (statusFilter === "finished" && song.status !== "finished") return false;
      if (visibilityFilter === "public" && !song.isPublic) return false;
      if (visibilityFilter === "personal" && song.isPublic) return false;
      return true;
    });
  }, [songs, showTrash, statusFilter, visibilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSongs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSongs.slice(start, start + pageSize);
  }, [filteredSongs, currentPage, pageSize]);

  const rangeStart =
    filteredSongs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredSongs.length);

  function clearFilters() {
    setStatusFilter("all");
    setVisibilityFilter("all");
  }

  function changePageSize(next: number) {
    setPageSize(next);
    preferenceStorageSet(PAGE_SIZE_KEY, String(next));
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchSongs();
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [selectedFolderId, showFavorites, showTrash, showCollaborations, searchQuery, fetchSongs]);

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

  async function patchSongLocal(
    song: Song,
    patch: { isFavorite?: boolean; isPublic?: boolean; status?: string },
  ) {
    const optimistic = { ...song, ...patch };
    setSongs((prev) =>
      prev.map((item) => (item.id === song.id ? optimistic : item)),
    );
    queueSongPatch(song.id, patch);

    if (isBrowserOffline()) return;

    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = (await res.json()) as { song: Song };
        cacheSongs([data.song]);
        setSongs((prev) =>
          prev.map((item) =>
            item.id === song.id ? applyPendingToSong(data.song) : item,
          ),
        );
      }
    } catch {
      // Kept in local queue; OfflineProvider will sync later.
    }
  }

  async function toggleFavorite(song: Song) {
    await patchSongLocal(song, { isFavorite: !song.isFavorite });
  }

  async function togglePublic(song: Song) {
    await patchSongLocal(song, { isPublic: !Boolean(song.isPublic) });
  }

  async function toggleStatus(song: Song) {
    const nextStatus = song.status === "finished" ? "draft" : "finished";
    await patchSongLocal(song, { status: nextStatus });
  }

  async function restoreSong(song: Song) {
    const res = await fetch(`/api/songs/${song.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    if (res.ok) {
      setSongs((prev) => prev.filter((item) => item.id !== song.id));
      await fetchFolders();
    }
  }

  async function moveSongToBin(song: Song) {
    const res = await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
    if (res.ok) {
      removeCachedSong(song.id);
      setSongs((prev) => prev.filter((item) => item.id !== song.id));
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
        removeCachedSong(songToPurge.id);
        setSongs((prev) => prev.filter((item) => item.id !== songToPurge.id));
        setSongToPurge(null);
      }
    } finally {
      setPurging(false);
    }
  }

  async function handleSongMoved() {
    await fetchFolders();
    await fetchSongs();
  }

  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  const collectionTitle = useMemo(() => {
    if (showTrash) return "Recycle Bin";
    if (showCollaborations) return "Collaborations";
    if (showFavorites) return "Favorites";
    if (selectedFolderId) {
      return folders.find((f) => f.id === selectedFolderId)?.name ?? "Folder";
    }

    const statusPart =
      statusFilter === "draft"
        ? "Draft"
        : statusFilter === "finished"
          ? "Finished"
          : "All";
    const visibilityPart =
      visibilityFilter === "public"
        ? "Public"
        : visibilityFilter === "personal"
          ? "Personal"
          : null;

    return visibilityPart
      ? `${statusPart} ${visibilityPart} Songs`
      : `${statusPart} Songs`;
  }, [
    showTrash,
    showCollaborations,
    showFavorites,
    selectedFolderId,
    folders,
    statusFilter,
    visibilityFilter,
  ]);

  const mobileTab: MobileTab = folderDrawerOpen ? "folders" : "songs";

  function renderSongList(className = "") {
    return (
      <section className={`flex min-h-0 min-w-0 flex-1 flex-col bg-background ${className}`}>
        <div className="shrink-0 border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {collectionTitle}
                </h1>
                {selectedFolder && !showTrash && (
                  <button
                    type="button"
                    onClick={() => setShowAddSongsModal(true)}
                    className="flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-xs font-medium text-muted transition hover:border-foreground/20 hover:text-foreground"
                  >
                    <FolderInput className="h-3.5 w-3.5 shrink-0" />
                    <span>Add songs</span>
                  </button>
                )}
              </div>
            </div>

            {!showTrash ? (
              <div className="flex shrink-0 items-center gap-2 justify-self-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Total Songs
                  <span className="ml-1.5 tabular-nums text-foreground">
                    {filtersActive ? filteredSongs.length : songs.length}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleNewSong}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent/90 active:scale-95"
                  aria-label="New song"
                  title="New song"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div />
            )}

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              {!showTrash && (
                <>
                  <div
                    className="inline-flex items-center rounded-lg bg-background p-0.5 ring-1 ring-border"
                    role="group"
                    aria-label="Filter by status"
                  >
                    {STATUS_FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStatusFilter(item.id)}
                        className={filterChipClass(statusFilter === item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className="inline-flex items-center rounded-lg bg-background p-0.5 ring-1 ring-border"
                    role="group"
                    aria-label="Filter by visibility"
                  >
                    {VISIBILITY_FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setVisibilityFilter(item.id)}
                        className={filterChipClass(visibilityFilter === item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold text-muted transition hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </>
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
          ) : filteredSongs.length === 0 ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  No songs match these filters
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  Try a different status or visibility, or clear the filters.
                </p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 min-h-10 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:border-foreground/20"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pageSongs.map((song) => (
                <div
                  key={song.id}
                  className="group flex items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card px-2 py-1.5 transition hover:border-foreground/15 sm:gap-3 sm:px-3"
                >
                  <button
                    type="button"
                    onClick={() => openSong(song)}
                    disabled={showTrash}
                    className="min-w-0 flex-1 rounded-xl px-2 py-2 text-left transition active:bg-background disabled:cursor-default sm:px-3 sm:py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                        {song.title || "Untitled"}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {song.isCollaborator && !showTrash && (
                          <span
                            className="inline-flex"
                            title={
                              song.owner
                                ? `Shared by ${song.owner.displayName}`
                                : "Collaboration"
                            }
                          >
                            <UsersRound
                              className="h-3.5 w-3.5 shrink-0 text-sky-500"
                              aria-label="Collaboration"
                            />
                          </span>
                        )}
                        {(song.collaborators?.length || 0) > 0 &&
                          song.isOwner !== false &&
                          !showTrash && (
                            <span
                              className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums text-sky-500"
                              title="Collaborators"
                            >
                              <UsersRound className="h-3 w-3" />
                              {song.collaborators?.length}
                            </span>
                          )}
                        {song.folder && (
                          <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted">
                            {song.folder.name}
                          </span>
                        )}
                        {song.isFavorite && !showTrash && (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted sm:text-sm">
                      {contentSnippet(song.content) || "No lyrics yet"}
                    </p>
                    <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted">
                      {showTrash
                        ? `Deleted ${song.deletedAt ? new Date(song.deletedAt).toLocaleDateString() : ""}`
                        : song.isCollaborator && song.owner
                          ? `Collab with ${song.owner.displayName} · ${new Date(song.updatedAt).toLocaleDateString()}`
                          : `${song.status === "draft" ? "Draft" : "Finished"} · ${new Date(song.updatedAt).toLocaleDateString()}`}
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border bg-background/80 p-0.5">
                    {showTrash ? (
                      <>
                        <button
                          type="button"
                          onClick={() => restoreSong(song)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-accent"
                          aria-label={`Restore "${song.title}"`}
                          title="Restore"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSongToPurge(song)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-red-400"
                          aria-label={`Delete "${song.title}" forever`}
                          title="Delete forever"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        {song.isOwner !== false && (
                          <button
                            type="button"
                            onClick={() => toggleFavorite(song)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-amber-400"
                            aria-label={song.isFavorite ? "Remove from favorites" : "Add to favorites"}
                            title={song.isFavorite ? "Unfavorite" : "Favorite"}
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                song.isFavorite ? "fill-amber-400 text-amber-400" : ""
                              }`}
                            />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleStatus(song)}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-card ${
                            song.status === "finished"
                              ? "text-emerald-500 hover:text-emerald-400"
                              : "text-muted hover:text-accent"
                          }`}
                          aria-label={
                            song.status === "finished"
                              ? "Mark as draft"
                              : "Mark as finished"
                          }
                          title={
                            song.status === "finished"
                              ? "Finished — click to mark draft"
                              : "Draft — click to mark finished"
                          }
                        >
                          {song.status === "finished" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <CircleDashed className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                        {song.isOwner !== false && (
                          <button
                            type="button"
                            onClick={() => togglePublic(song)}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-card ${
                              song.isPublic
                                ? "text-emerald-500 hover:text-emerald-400"
                                : "text-amber-500 hover:text-amber-400"
                            }`}
                            aria-label={
                              song.isPublic ? "Make personal" : "Make public"
                            }
                            title={
                              song.isPublic
                                ? "Public — click to make personal"
                                : "Personal — click to make public"
                            }
                          >
                            {song.isPublic ? (
                              <Globe className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <Lock className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </button>
                        )}
                        {song.isPublic && (
                          <button
                            type="button"
                            onClick={() => router.push(`/vault/s/${song.id}`)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-accent"
                            aria-label={`Public view of "${song.title}"`}
                            title="Public view"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {song.isOwner !== false && (
                          <button
                            type="button"
                            onClick={() => setSongToMove(song)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-accent"
                            aria-label={`Add "${song.title}" to folder`}
                            title="Add to folder"
                          >
                            <FolderInput className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {song.isOwner !== false && (
                          <button
                            type="button"
                            onClick={() => moveSongToBin(song)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-red-400"
                            aria-label={`Move "${song.title}" to recycle bin`}
                            title="Move to recycle bin"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {filteredSongs.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-3 py-3 sm:px-5">
            <p className="text-xs text-muted sm:text-sm">
              Showing{" "}
              <span className="font-medium tabular-nums text-foreground">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-medium tabular-nums text-foreground">
                {filteredSongs.length}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="flex items-center gap-2 text-xs text-muted sm:text-sm">
                <span className="hidden sm:inline">Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => changePageSize(Number(e.target.value))}
                  className="h-9 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-accent"
                  aria-label="Songs per page"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted sm:text-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <VaultShell
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      mobileSearchOpen={mobileSearchOpen}
      onMobileSearchOpen={setMobileSearchOpen}
      centerLabel={collectionTitle}
      folderDrawerOpen={folderDrawerOpen}
      onFolderDrawerOpenChange={setFolderDrawerOpen}
      onFoldersChange={setFolders}
      footer={
        <VaultMobileNav
          active={mobileTab}
          onFolders={() => setFolderDrawerOpen(true)}
          onSongs={() => setFolderDrawerOpen(false)}
          onEditor={handleNewSong}
          editorDisabled={showTrash}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {loading ? (
          <RapVaultLoading label="Loading..." />
        ) : (
          renderSongList("min-h-0 flex-1")
        )}
      </div>

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
        open={songToPurge !== null}
        onClose={() => !purging && setSongToPurge(null)}
        onConfirm={confirmPurgeSong}
        title="Delete forever?"
        description={`"${songToPurge?.title || "This song"}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete forever"
        destructive
        loading={purging}
      />

      {needsUsername && (
        <ClaimUsernameModal
          suggestedUsername={suggestUsernameFromEmail(claimEmail || "artist")}
          suggestedDisplayName={claimDisplayName}
          onComplete={() => setNeedsUsername(false)}
        />
      )}
    </VaultShell>
  );
}
