"use client";

import {
  ArrowRight,
  AudioWaveform,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Eye,
  FileText,
  FolderInput,
  Globe,
  LayoutGrid,
  List,
  Lock,
  MoreVertical,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Trash2,
  User,
  UsersRound,
  X,
} from "lucide-react";
import { parseYouTubeVideoId } from "@/lib/youtube";
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
  createSong,
  getCachedFolders,
  getCachedSongs,
  isBrowserOffline,
  navigateToSongEditor,
  queueSongPatch,
  removeCachedSong,
  warmOfflineLibraryCache,
} from "@/lib/offline-songs";
import { hasFunctionalConsent } from "@/lib/cookie-consent";
import type { Folder, Song } from "@/types";
import { suggestUsernameFromEmail } from "@/lib/username";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_KEY = "rapvault-page-size";

type StatusFilter = "all" | "draft" | "finished";
type VisibilityFilter = "all" | "public" | "personal";
type SortOption = "latest" | "oldest" | "title-asc" | "title-desc";

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
  return `min-h-10 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition sm:min-h-0 sm:rounded-md sm:px-2.5 sm:py-1 sm:text-[11px] ${
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
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [menuSongId, setMenuSongId] = useState<string | null>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const playingSong = useMemo(
    () => songs.find((s) => s.id === playingSongId),
    [songs, playingSongId],
  );

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".vault-dropdown-anchor")) {
        setSortMenuOpen(false);
        setMenuSongId(null);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

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

  useEffect(() => {
    void warmOfflineLibraryCache();
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = (await res.json()) as { folders: Folder[] };
        await cacheFolders(data.folders);
        setFolders(data.folders);
        return;
      }
    } catch {
      // Fall through to cache when offline.
    }

    const cached = await getCachedFolders();
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
        await cacheSongs(data.songs);
        const merged = await Promise.all(
          data.songs.map((song) => applyPendingToSong(song)),
        );
        setSongs(merged);
        return;
      }
    } catch {
      // Fall through to cache when offline.
    }

    let cached = await getCachedSongs();
    if (showTrash) {
      cached = cached.filter((song) => Boolean(song.deletedAt));
    } else {
      cached = cached.filter((song) => !song.deletedAt);
      if (showFavorites) {
        cached = cached.filter((song) => song.isFavorite);
      } else if (showCollaborations) {
        cached = cached.filter(
          (song) =>
            song.isCollaborator ||
            (song.isOwner && (song.collaborators?.length ?? 0) > 0),
        );
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
    const list = showTrash
      ? songs
      : songs.filter((song) => {
          if (statusFilter === "draft" && song.status !== "draft") return false;
          if (statusFilter === "finished" && song.status !== "finished") return false;
          if (visibilityFilter === "public" && !song.isPublic) return false;
          if (visibilityFilter === "personal" && song.isPublic) return false;
          return true;
        });

    return [...list].sort((a, b) => {
      if (sortBy === "latest") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return 0;
    });
  }, [songs, showTrash, statusFilter, visibilityFilter, sortBy]);

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
    const song = await createSong(selectedFolderId);
    if (!song) {
      if (isBrowserOffline() && !hasFunctionalConsent()) {
        window.alert(
          "Turn on Functional cookies (offline cache) in cookie settings to create songs offline.",
        );
      }
      return;
    }
    setFolderDrawerOpen(false);
    navigateToSongEditor(song.id, router);
  }

  function openSong(song: Song) {
    if (showTrash) return;
    navigateToSongEditor(song.id, router);
  }

  function handlePlaySong(song: Song) {
    if (playingSongId === song.id) {
      setPlayingSongId(null);
      return;
    }
    if (song.beatUrl) {
      setPlayingSongId(song.id);
    } else {
      openSong(song);
    }
  }

  async function patchSongLocal(
    song: Song,
    patch: { isFavorite?: boolean; isPublic?: boolean; status?: string },
  ) {
    const optimistic = { ...song, ...patch };
    setSongs((prev) =>
      prev.map((item) => (item.id === song.id ? optimistic : item)),
    );
    await queueSongPatch(song.id, patch);

    if (isBrowserOffline()) return;

    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = (await res.json()) as { song: Song };
        await cacheSongs([data.song]);
        const merged = await applyPendingToSong(data.song);
        setSongs((prev) =>
          prev.map((item) => (item.id === song.id ? merged : item)),
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
      await removeCachedSong(song.id);
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
        await removeCachedSong(songToPurge.id);
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
        <div className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-4 lg:px-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {collectionTitle}
                  </h1>
                  {selectedFolder && !showTrash && (
                    <button
                      type="button"
                      onClick={() => setShowAddSongsModal(true)}
                      className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-medium text-muted transition hover:border-foreground/20 hover:text-foreground lg:min-h-7 lg:rounded-lg lg:px-2"
                    >
                      <FolderInput className="h-3.5 w-3.5 shrink-0" />
                      <span>Add songs</span>
                    </button>
                  )}
                </div>
              </div>

              {!showTrash && (
                <div className="flex shrink-0 items-center gap-2">
                  <p className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-muted xs:block sm:block">
                    <span className="hidden sm:inline">Total Songs</span>
                    <span className="ml-0 tabular-nums text-foreground sm:ml-1.5">
                      {filtersActive ? filteredSongs.length : songs.length}
                    </span>
                  </p>
                  <span className="text-sm font-semibold tabular-nums text-foreground sm:hidden">
                    {filtersActive ? filteredSongs.length : songs.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNewSong}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent/90 active:scale-95 lg:h-7 lg:w-7 lg:rounded-lg"
                    aria-label="New song"
                    title="New song"
                  >
                    <Plus className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {!showTrash && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div
                    className="inline-flex shrink-0 items-center rounded-xl bg-background p-0.5 ring-1 ring-border sm:rounded-lg"
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
                    className="inline-flex shrink-0 items-center rounded-xl bg-background p-0.5 ring-1 ring-border sm:rounded-lg"
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
                      className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-muted transition hover:text-foreground lg:min-h-7 lg:rounded-md lg:px-1.5 lg:text-[11px]"
                    >
                      <X className="h-3.5 w-3.5 lg:h-3 lg:w-3" />
                      Clear
                    </button>
                  )}
                </div>

                {/* Right: Sort Dropdown & Grid/List View Toggle matching screenshot */}
                <div className="flex items-center gap-2">
                  <div className="relative vault-dropdown-anchor">
                    <button
                      type="button"
                      onClick={() => setSortMenuOpen((o) => !o)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/80 bg-background px-3.5 text-xs font-semibold text-foreground transition hover:bg-sidebar shadow-2xs"
                      aria-label="Sort options"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
                      <span>
                        {sortBy === "latest"
                          ? "Latest"
                          : sortBy === "oldest"
                            ? "Oldest"
                            : sortBy === "title-asc"
                              ? "Title (A–Z)"
                              : "Title (Z–A)"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted" />
                    </button>

                    {sortMenuOpen && (
                      <div className="absolute right-0 top-full z-40 mt-1 min-w-[9.5rem] overflow-hidden rounded-xl border border-border bg-card py-1 text-xs shadow-xl animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy("latest");
                            setSortMenuOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-1.5 transition ${
                            sortBy === "latest"
                              ? "bg-amber-500/10 font-bold text-amber-700 dark:text-amber-400"
                              : "text-foreground hover:bg-sidebar"
                          }`}
                        >
                          Latest
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy("oldest");
                            setSortMenuOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-1.5 transition ${
                            sortBy === "oldest"
                              ? "bg-amber-500/10 font-bold text-amber-700 dark:text-amber-400"
                              : "text-foreground hover:bg-sidebar"
                          }`}
                        >
                          Oldest
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy("title-asc");
                            setSortMenuOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-1.5 transition ${
                            sortBy === "title-asc"
                              ? "bg-amber-500/10 font-bold text-amber-700 dark:text-amber-400"
                              : "text-foreground hover:bg-sidebar"
                          }`}
                        >
                          Title (A–Z)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy("title-desc");
                            setSortMenuOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-1.5 transition ${
                            sortBy === "title-desc"
                              ? "bg-amber-500/10 font-bold text-amber-700 dark:text-amber-400"
                              : "text-foreground hover:bg-sidebar"
                          }`}
                        >
                          Title (Z–A)
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition shadow-2xs ${
                        viewMode === "grid"
                          ? "bg-[#b07429] text-white shadow-xs"
                          : "border border-border/80 bg-background text-muted hover:border-foreground/20 hover:text-foreground"
                      }`}
                      title="Grid view"
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition shadow-2xs ${
                        viewMode === "list"
                          ? "bg-[#b07429] text-white shadow-xs"
                          : "border border-border/80 bg-background text-muted hover:border-foreground/20 hover:text-foreground"
                      }`}
                      title="List view"
                      aria-label="List view"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-2.5"
              }
            >
              {pageSongs.map((song) => {
                const isCollaborative =
                  song.isCollaborator ||
                  (song.collaborators && song.collaborators.length > 0);
                const collabName = song.isCollaborator
                  ? song.owner?.displayName || "Collaborator"
                  : song.collaborators?.[0]?.artist.displayName || "Collaborator";

                return (
                  <div
                    key={song.id}
                    className="group relative flex flex-col justify-between gap-3 overflow-visible rounded-2xl border border-border/80 bg-card p-3 sm:p-4 transition-all hover:border-foreground/20 hover:shadow-xs lg:flex-row lg:items-center"
                  >
                    <button
                      type="button"
                      onClick={() => openSong(song)}
                      disabled={showTrash}
                      className="min-w-0 flex-1 text-left transition active:opacity-80 disabled:cursor-default"
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
                              className="inline-flex max-w-[10rem] items-center gap-0.5 truncate text-xs font-semibold text-sky-500 sm:max-w-[14rem]"
                              title={song.collaborators
                                ?.map((c) => c.artist.displayName)
                                .join(", ")}
                            >
                              <UsersRound className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {song.collaborators!.length === 1
                                  ? song.collaborators![0]!.artist.displayName
                                  : `${song.collaborators!.length}`}
                              </span>
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
                          : (song.collaborators?.length || 0) > 0 &&
                              song.isOwner !== false
                            ? `Collab with ${song.collaborators!
                                .map((c) => c.artist.displayName)
                                .join(", ")} · ${new Date(song.updatedAt).toLocaleDateString()}`
                            : `${song.status === "draft" ? "Draft" : "Finished"} · ${new Date(song.updatedAt).toLocaleDateString()}`}
                    </p>
                  </button>

                  {/* Right: Modern Side Actions matching screenshot */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2 self-start lg:self-center lg:gap-3">
                    {/* 1. Status Pill Badge */}
                    {!showTrash && (
                      <div>
                        {song.status === "finished" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStatus(song);
                            }}
                            title="Finished (click to change)"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/20 active:scale-95 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Finished</span>
                          </button>
                        ) : song.beatUrl || (song.content && song.content.length > 50) ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStatus(song);
                            }}
                            title="Work in Progress (click to change)"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-500/20 active:scale-95 dark:text-amber-300"
                          >
                            <AudioWaveform className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                            <span>Work in Progress</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStatus(song);
                            }}
                            title="Draft (click to change)"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/70 active:scale-95 dark:text-foreground/80"
                          >
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Draft</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* 2. Collaborators / Visibility Column */}
                    {!showTrash && (
                      <div className="flex min-w-[3rem] items-center justify-center">
                        {isCollaborative ? (
                          <div
                            className="flex items-center gap-1 text-xs text-muted"
                            title={
                              song.isCollaborator
                                ? `Collab with ${collabName}`
                                : `Collab with ${song.collaborators?.map((c) => c.artist.displayName).join(", ")}`
                            }
                          >
                            {song.collaborators && song.collaborators.length > 1 ? (
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {song.collaborators.slice(0, 3).map((collab, i) => (
                                  <div
                                    key={collab.artist.id || i}
                                    className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-sidebar text-[9px] font-bold text-foreground"
                                  >
                                    {collab.artist.displayName?.[0]?.toUpperCase() || "C"}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex max-w-[6.5rem] items-center gap-1 truncate text-xs font-medium text-foreground/80">
                                <User className="h-3.5 w-3.5 shrink-0 text-muted" />
                                <span className="truncate">{collabName}</span>
                              </span>
                            )}
                          </div>
                        ) : song.isPublic ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (song.isOwner !== false) togglePublic(song);
                            }}
                            title="Public — visible to everyone"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-500 transition hover:bg-emerald-500/10"
                          >
                            <Globe className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (song.isOwner !== false) togglePublic(song);
                            }}
                            title="Personal — private to you"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-sidebar"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* 3. Action Buttons Group */}
                    {!showTrash ? (
                      <div className="flex items-center gap-1.5">
                        {/* Play Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySong(song);
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background transition hover:border-foreground/20 hover:bg-sidebar active:scale-95 shadow-2xs ${
                            playingSongId === song.id
                              ? "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "text-foreground"
                          }`}
                          title={
                            song.beatUrl
                              ? playingSongId === song.id
                                ? "Pause beat preview"
                                : "Play beat preview"
                              : "Open track in editor"
                          }
                          aria-label="Play song"
                        >
                          {playingSongId === song.id ? (
                            <Pause className="h-4 w-4 fill-current" />
                          ) : (
                            <Play className="h-4 w-4 fill-current translate-x-0.5" />
                          )}
                        </button>

                        {/* Favorite Star Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(song);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background transition hover:border-foreground/20 hover:bg-sidebar active:scale-95 shadow-2xs"
                          title={song.isFavorite ? "Remove from favorites" : "Add to favorites"}
                          aria-label={song.isFavorite ? "Favorited" : "Favorite"}
                        >
                          <Star
                            className={`h-4 w-4 transition ${
                              song.isFavorite
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted hover:text-amber-500"
                            }`}
                          />
                        </button>

                        {/* More Options Button */}
                        <div className="relative vault-dropdown-anchor">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuSongId(menuSongId === song.id ? null : song.id);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background text-muted transition hover:border-foreground/20 hover:bg-sidebar hover:text-foreground active:scale-95 shadow-2xs"
                            title="More options"
                            aria-label="More options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {menuSongId === song.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full z-40 mt-1 min-w-[11rem] overflow-hidden rounded-2xl border border-border bg-card py-1.5 text-xs shadow-xl animate-in fade-in zoom-in-95 duration-100"
                            >
                              {song.isOwner !== false && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuSongId(null);
                                    setSongToMove(song);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-foreground transition hover:bg-sidebar"
                                >
                                  <FolderInput className="h-3.5 w-3.5 text-muted" />
                                  <span>Add to folder</span>
                                </button>
                              )}
                              {song.isPublic && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuSongId(null);
                                    router.push(`/vault/s/${song.id}`);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-foreground transition hover:bg-sidebar"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted" />
                                  <span>Public view</span>
                                </button>
                              )}
                              {song.isOwner !== false && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuSongId(null);
                                    togglePublic(song);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-foreground transition hover:bg-sidebar"
                                >
                                  {song.isPublic ? (
                                    <>
                                      <Lock className="h-3.5 w-3.5 text-muted" />
                                      <span>Make personal</span>
                                    </>
                                  ) : (
                                    <>
                                      <Globe className="h-3.5 w-3.5 text-muted" />
                                      <span>Make public</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {song.isOwner !== false && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuSongId(null);
                                    toggleStatus(song);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-foreground transition hover:bg-sidebar"
                                >
                                  {song.status === "finished" ? (
                                    <>
                                      <FileText className="h-3.5 w-3.5 text-muted" />
                                      <span>Mark as draft</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5 text-muted" />
                                      <span>Mark as finished</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {song.isOwner !== false && (
                                <>
                                  <div className="my-1 border-t border-border" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuSongId(null);
                                      moveSongToBin(song);
                                    }}
                                    className="flex w-full items-center gap-2 px-3.5 py-2 text-red-500 transition hover:bg-sidebar"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Move to trash</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Open -> Button in warm bronze/amber styling */}
                        <button
                          type="button"
                          onClick={() => openSong(song)}
                          className="group/open inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-300/70 bg-[#fffaf5] px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-amber-900 transition hover:border-amber-400 hover:bg-amber-100/70 active:scale-95 shadow-2xs dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/40"
                          title={`Open "${song.title || "song"}"`}
                          aria-label={`Open "${song.title || "song"}"`}
                        >
                          <span>Open</span>
                          <ArrowRight className="h-3.5 w-3.5 text-amber-800 transition-transform group-hover/open:translate-x-0.5 dark:text-amber-300" />
                        </button>
                      </div>
                    ) : (
                      /* Trash Options */
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => restoreSong(song)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-muted transition hover:bg-sidebar hover:text-accent"
                          title="Restore song"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSongToPurge(song)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
                          title="Delete forever"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted sm:text-sm">
                <span>Per page</span>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => changePageSize(Number(e.target.value))}
                    className="h-8 appearance-none rounded-xl border border-border/80 bg-background pl-2.5 pr-6 text-xs font-semibold text-foreground outline-none transition hover:border-foreground/20 focus:border-accent cursor-pointer shadow-2xs"
                    aria-label="Songs per page"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                </div>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-background text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 shadow-2xs"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {(() => {
                  if (totalPages <= 5) {
                    return Array.from({ length: totalPages }, (_, i) => i + 1);
                  }
                  const pages: (number | "...")[] = [];
                  if (currentPage <= 3) {
                    pages.push(1, 2, 3, 4, "...", totalPages);
                  } else if (currentPage >= totalPages - 2) {
                    pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
                  }
                  return pages;
                })().map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="flex h-8 w-6 items-center justify-center text-xs text-muted"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition shadow-2xs ${
                        currentPage === p
                          ? "bg-[#b07429] text-white shadow-xs"
                          : "border border-border/80 bg-background text-muted hover:border-foreground/20 hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-background text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 shadow-2xs"
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
      <div className="flex min-h-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
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

      {/* Floating Beat Preview Player */}
      {playingSong && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-card/95 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#b07429]/20 text-[#a86523] dark:text-amber-400">
            <AudioWaveform className="h-4 w-4 animate-pulse" />
          </div>
          <div className="min-w-0 max-w-[180px] sm:max-w-xs">
            <p className="truncate text-xs font-semibold text-foreground">
              {playingSong.title || "Untitled Track"}
            </p>
            <p className="truncate text-[11px] text-muted">Playing beat preview</p>
          </div>
          {parseYouTubeVideoId(playingSong.beatUrl) ? (
            <iframe
              className="hidden"
              src={`https://www.youtube-nocookie.com/embed/${parseYouTubeVideoId(playingSong.beatUrl)}?autoplay=1&enablejsapi=1`}
              title="Beat preview audio"
              allow="autoplay"
            />
          ) : (
            <audio
              src={playingSong.beatUrl}
              autoPlay
              onEnded={() => setPlayingSongId(null)}
            />
          )}
          <button
            type="button"
            onClick={() => setPlayingSongId(null)}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-sidebar hover:text-foreground"
            aria-label="Stop preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </VaultShell>
  );
}
