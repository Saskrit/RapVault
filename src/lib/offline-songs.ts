import type { Folder, Song } from "@/types";
import { hasFunctionalConsent } from "@/lib/cookie-consent";
import {
  functionalStorageGet,
  functionalStorageRemove,
  functionalStorageSet,
} from "@/lib/safe-storage";

const CACHE_PREFIX = "rapvault-song-v1:";
const PENDING_KEY = "rapvault-pending-patches-v1";
const CREATES_KEY = "rapvault-pending-creates-v1";
const INDEX_KEY = "rapvault-song-index-v1";
const FOLDERS_KEY = "rapvault-folders-v1";
const ACTIVE_LOCAL_KEY = "rapvault-active-local-song";
/** Stable editor URL that can be precached for offline creates. */
export const LOCAL_WRITE_PATH = "/vault/write/local";
/** Avoid `:` in ids — it breaks path routing / caching offline. */
const OFFLINE_ID_PREFIX = "offline_";
export const SONG_ID_REMAP_EVENT = "rapvault:song-id-remapped";

export type SongPatch = Partial<
  Pick<
    Song,
    | "title"
    | "content"
    | "genre"
    | "moodTags"
    | "status"
    | "beatUrl"
    | "voiceMemoPath"
    | "isFavorite"
    | "folderId"
    | "isPublic"
  >
>;

type PendingEntry = {
  patch: SongPatch;
  updatedAt: number;
};

type PendingStore = Record<string, PendingEntry>;
type CreatesStore = Record<string, { createdAt: number }>;

function canUseStorage() {
  return hasFunctionalConsent();
}

export function isOfflineSongId(id: string) {
  return id.startsWith(OFFLINE_ID_PREFIX) || id.startsWith("offline:");
}

export function setActiveLocalSongId(id: string) {
  if (canUseStorage()) {
    functionalStorageSet(ACTIVE_LOCAL_KEY, id);
  }
  try {
    sessionStorage.setItem(ACTIVE_LOCAL_KEY, id);
  } catch {
    // ignore
  }
}

export function getActiveLocalSongId(): string | null {
  const stored = functionalStorageGet(ACTIVE_LOCAL_KEY);
  if (stored) return stored;
  try {
    return sessionStorage.getItem(ACTIVE_LOCAL_KEY);
  } catch {
    return null;
  }
}

/**
 * Open the editor. Offline + local drafts use a stable precached route so
 * Next.js / SW soft-nav to a brand-new `/vault/write/[id]` does not 404.
 */
export function navigateToSongEditor(
  songId: string,
  router?: { push: (href: string) => void; replace?: (href: string) => void },
  options?: { replace?: boolean },
) {
  const useLocal = isBrowserOffline() || isOfflineSongId(songId);
  const href = useLocal ? LOCAL_WRITE_PATH : `/vault/write/${songId}`;

  if (useLocal) {
    setActiveLocalSongId(songId);
  }

  if (isBrowserOffline() || !router) {
    window.location.assign(href);
    return;
  }

  if (options?.replace && router.replace) {
    router.replace(href);
  } else {
    router.push(href);
  }
}

function readPendingStore(): PendingStore {
  if (!canUseStorage()) return {};
  try {
    const raw = functionalStorageGet(PENDING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PendingStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePendingStore(store: PendingStore) {
  if (!canUseStorage()) return;
  functionalStorageSet(PENDING_KEY, JSON.stringify(store));
}

function readCreatesStore(): CreatesStore {
  if (!canUseStorage()) return {};
  try {
    const raw = functionalStorageGet(CREATES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CreatesStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCreatesStore(store: CreatesStore) {
  if (!canUseStorage()) return;
  functionalStorageSet(CREATES_KEY, JSON.stringify(store));
}

function markPendingCreate(id: string) {
  const store = readCreatesStore();
  store[id] = { createdAt: Date.now() };
  writeCreatesStore(store);
}

function clearPendingCreate(id: string) {
  const store = readCreatesStore();
  if (!store[id]) return;
  delete store[id];
  writeCreatesStore(store);
}

export function isPendingCreate(id: string) {
  return Boolean(readCreatesStore()[id]) || isOfflineSongId(id);
}

function notifySongIdRemapped(from: string, to: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SONG_ID_REMAP_EVENT, { detail: { from, to } }),
  );
}

function readIndex(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = functionalStorageGet(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  if (!canUseStorage()) return;
  functionalStorageSet(INDEX_KEY, JSON.stringify([...new Set(ids)]));
}

export function cacheSong(song: Song) {
  if (!canUseStorage()) return;
  functionalStorageSet(`${CACHE_PREFIX}${song.id}`, JSON.stringify(song));
  const index = readIndex();
  if (!index.includes(song.id)) writeIndex([...index, song.id]);
}

export function cacheSongs(songs: Song[]) {
  for (const song of songs) cacheSong(song);
}

export function getCachedSong(id: string): Song | null {
  if (!canUseStorage()) return null;
  try {
    const raw = functionalStorageGet(`${CACHE_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as Song;
  } catch {
    return null;
  }
}

export function getCachedSongs(): Song[] {
  return readIndex()
    .map((id) => getCachedSong(id))
    .filter((song): song is Song => Boolean(song))
    .map((song) => applyPendingToSong(song));
}

export function removeCachedSong(id: string) {
  if (!canUseStorage()) return;
  functionalStorageRemove(`${CACHE_PREFIX}${id}`);
  writeIndex(readIndex().filter((item) => item !== id));
  const store = readPendingStore();
  if (store[id]) {
    delete store[id];
    writePendingStore(store);
  }
  clearPendingCreate(id);
}

/**
 * Create a local Untitled song that syncs via POST when back online.
 */
export function createOfflineSong(folderId: string | null = null): Song | null {
  if (!canUseStorage()) return null;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `${OFFLINE_ID_PREFIX}${crypto.randomUUID()}`
      : `${OFFLINE_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const folders = getCachedFolders();
  let resolvedFolderId = folderId;
  let folderName: string | null = null;

  if (resolvedFolderId) {
    folderName = folders.find((f) => f.id === resolvedFolderId)?.name ?? null;
  } else {
    const wip = folders.find((f) => f.name === "Work In Progress");
    if (wip) {
      resolvedFolderId = wip.id;
      folderName = wip.name;
    }
  }

  const now = new Date().toISOString();
  const song: Song = {
    id,
    title: "Untitled",
    content: "",
    genre: "",
    moodTags: "",
    status: "draft",
    isFavorite: false,
    isPublic: false,
    viewCount: 0,
    beatUrl: "",
    voiceMemoPath: "",
    folderId: resolvedFolderId,
    folder:
      resolvedFolderId && folderName
        ? { id: resolvedFolderId, name: folderName }
        : null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isOwner: true,
    isCollaborator: false,
    collaborators: [],
  };

  cacheSong(song);
  markPendingCreate(id);
  return song;
}

/**
 * POST a new song when online; fall back to a local offline draft.
 */
export async function createSong(folderId: string | null = null): Promise<Song | null> {
  if (!isBrowserOffline()) {
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { song: Song };
        cacheSong(data.song);
        return data.song;
      }
    } catch {
      // Network failure — create locally.
    }
  }

  return createOfflineSong(folderId);
}

export function getPendingPatch(id: string): SongPatch | null {
  const entry = readPendingStore()[id];
  return entry?.patch ?? null;
}

export function queueSongPatch(id: string, patch: SongPatch) {
  const store = readPendingStore();
  store[id] = {
    patch: { ...(store[id]?.patch ?? {}), ...patch },
    updatedAt: Date.now(),
  };
  writePendingStore(store);

  const cached = getCachedSong(id);
  if (cached) {
    cacheSong({ ...cached, ...patch, updatedAt: new Date().toISOString() });
  }
}

export function clearPendingPatch(id: string) {
  const store = readPendingStore();
  if (!store[id]) return;
  delete store[id];
  writePendingStore(store);
}

export function applyPendingToSong(song: Song): Song {
  const pending = getPendingPatch(song.id);
  if (!pending) return song;
  return { ...song, ...pending };
}

export function getPendingSongIds(): string[] {
  return [
    ...new Set([
      ...Object.keys(readPendingStore()),
      ...Object.keys(readCreatesStore()),
    ]),
  ];
}

function remainingPatchAfterSnapshot(
  id: string,
  snapshot: SongPatch,
): SongPatch {
  const current = readPendingStore()[id];
  const remaining: SongPatch = {};
  if (!current) return remaining;
  for (const key of Object.keys(current.patch) as (keyof SongPatch)[]) {
    if (current.patch[key] !== snapshot[key]) {
      (remaining as Record<string, unknown>)[key] = current.patch[key];
    }
  }
  return remaining;
}

function remapOfflineSong(
  tempId: string,
  serverSong: Song,
  remaining: SongPatch,
) {
  functionalStorageRemove(`${CACHE_PREFIX}${tempId}`);
  const index = readIndex().filter((item) => item !== tempId);
  if (!index.includes(serverSong.id)) index.push(serverSong.id);
  writeIndex(index);

  clearPendingCreate(tempId);
  clearPendingPatch(tempId);

  if (Object.keys(remaining).length === 0) {
    cacheSong(serverSong);
  } else {
    const next = readPendingStore();
    next[serverSong.id] = { patch: remaining, updatedAt: Date.now() };
    writePendingStore(next);
    cacheSong({ ...serverSong, ...remaining });
  }

  notifySongIdRemapped(tempId, serverSong.id);
}

function toApiBody(patch: SongPatch): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.content !== undefined) body.content = patch.content;
  if (patch.genre !== undefined) body.genre = patch.genre;
  if (patch.moodTags !== undefined) body.moodTags = patch.moodTags;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.beatUrl !== undefined) body.beatUrl = patch.beatUrl;
  if (patch.voiceMemoPath !== undefined) body.voiceMemoPath = patch.voiceMemoPath;
  if (patch.isFavorite !== undefined) body.isFavorite = patch.isFavorite;
  if (patch.folderId !== undefined) body.folderId = patch.folderId;
  if (patch.isPublic !== undefined) body.isPublic = patch.isPublic;
  return body;
}

/**
 * Create an offline song on the server, then remap local id → server id.
 */
export async function flushPendingCreate(
  id: string,
): Promise<"ok" | "fail" | "empty"> {
  if (!readCreatesStore()[id] && !isOfflineSongId(id)) return "empty";

  const cached = getCachedSong(id);
  if (!cached) {
    clearPendingCreate(id);
    clearPendingPatch(id);
    return "empty";
  }

  const pending = getPendingPatch(id) ?? {};
  const snapshot: SongPatch = {
    title: pending.title ?? cached.title,
    content: pending.content ?? cached.content,
    genre: pending.genre ?? cached.genre,
    moodTags: pending.moodTags ?? cached.moodTags,
    status: pending.status ?? cached.status,
    folderId: pending.folderId !== undefined ? pending.folderId : cached.folderId,
    beatUrl: pending.beatUrl ?? cached.beatUrl,
    voiceMemoPath: pending.voiceMemoPath ?? cached.voiceMemoPath,
    isFavorite: pending.isFavorite ?? cached.isFavorite,
    isPublic: pending.isPublic ?? cached.isPublic,
  };

  try {
    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: snapshot.title,
        content: snapshot.content,
        genre: snapshot.genre,
        moodTags: snapshot.moodTags,
        status: snapshot.status,
        folderId: snapshot.folderId,
      }),
    });
    if (!res.ok) return "fail";

    const data = (await res.json()) as { song: Song };
    const serverSong = data.song;

    // Fields not accepted on create stay as follow-up patches on the real id.
    const createKeys: (keyof SongPatch)[] = [
      "title",
      "content",
      "genre",
      "moodTags",
      "status",
      "folderId",
    ];
    const createSnapshot: SongPatch = {};
    for (const key of createKeys) {
      if (snapshot[key] !== undefined) {
        (createSnapshot as Record<string, unknown>)[key] = snapshot[key];
      }
    }
    const remaining = remainingPatchAfterSnapshot(id, createSnapshot);
    for (const key of Object.keys(snapshot) as (keyof SongPatch)[]) {
      if (createKeys.includes(key)) continue;
      const value = snapshot[key];
      if (value === undefined) continue;
      const defaults: Record<string, unknown> = {
        beatUrl: "",
        voiceMemoPath: "",
        isFavorite: false,
        isPublic: false,
      };
      if (value !== defaults[key]) {
        (remaining as Record<string, unknown>)[key] = value;
      }
    }

    remapOfflineSong(id, serverSong, remaining);

    if (Object.keys(remaining).length > 0) {
      await flushPendingSong(serverSong.id);
    }

    return "ok";
  } catch {
    return "fail";
  }
}

/**
 * Flush one song's queued edits to the server.
 * Keeps any fields that changed again while the request was in flight.
 */
export async function flushPendingSong(
  id: string,
): Promise<"ok" | "fail" | "empty"> {
  if (readCreatesStore()[id] || isOfflineSongId(id)) {
    return flushPendingCreate(id);
  }

  const store = readPendingStore();
  const entry = store[id];
  if (!entry || Object.keys(entry.patch).length === 0) return "empty";

  const snapshot = { ...entry.patch };

  try {
    const res = await fetch(`/api/songs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiBody(snapshot)),
    });
    if (!res.ok) return "fail";

    const data = (await res.json()) as { song: Song };
    const serverSong = data.song;
    const remaining = remainingPatchAfterSnapshot(id, snapshot);

    if (Object.keys(remaining).length === 0) {
      clearPendingPatch(id);
      cacheSong(serverSong);
    } else {
      const next = readPendingStore();
      next[id] = { patch: remaining, updatedAt: Date.now() };
      writePendingStore(next);
      cacheSong({ ...serverSong, ...remaining });
    }

    return "ok";
  } catch {
    return "fail";
  }
}

export async function flushAllPendingSongs(): Promise<{
  synced: number;
  failed: number;
}> {
  const createIds = Object.keys(readCreatesStore());
  const patchIds = Object.keys(readPendingStore()).filter(
    (id) => !createIds.includes(id) && !isOfflineSongId(id),
  );
  let synced = 0;
  let failed = 0;

  for (const id of createIds) {
    const result = await flushPendingCreate(id);
    if (result === "ok") synced += 1;
    else if (result === "fail") failed += 1;
  }

  for (const id of patchIds) {
    const result = await flushPendingSong(id);
    if (result === "ok") synced += 1;
    else if (result === "fail") failed += 1;
  }

  return { synced, failed };
}

export function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function cacheFolders(folders: Folder[]) {
  if (!canUseStorage()) return;
  functionalStorageSet(FOLDERS_KEY, JSON.stringify(folders));
}

export function getCachedFolders(): Folder[] {
  if (!canUseStorage()) return [];
  try {
    const raw = functionalStorageGet(FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Folder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
