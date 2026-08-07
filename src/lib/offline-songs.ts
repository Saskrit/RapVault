import type { Folder, Song } from "@/types";

const CACHE_PREFIX = "rapvault-song-v1:";
const PENDING_KEY = "rapvault-pending-patches-v1";
const INDEX_KEY = "rapvault-song-index-v1";
const FOLDERS_KEY = "rapvault-folders-v1";

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

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readPendingStore(): PendingStore {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PendingStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePendingStore(store: PendingStore) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — ignore; in-memory editor state still works.
  }
}

function readIndex(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // ignore
  }
}

export function cacheSong(song: Song) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${song.id}`, JSON.stringify(song));
    const index = readIndex();
    if (!index.includes(song.id)) writeIndex([...index, song.id]);
  } catch {
    // ignore
  }
}

export function cacheSongs(songs: Song[]) {
  for (const song of songs) cacheSong(song);
}

export function getCachedSong(id: string): Song | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${id}`);
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
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${id}`);
    writeIndex(readIndex().filter((item) => item !== id));
    const store = readPendingStore();
    if (store[id]) {
      delete store[id];
      writePendingStore(store);
    }
  } catch {
    // ignore
  }
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
  return Object.keys(readPendingStore());
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
 * Flush one song's queued edits to the server.
 * Keeps any fields that changed again while the request was in flight.
 */
export async function flushPendingSong(
  id: string,
): Promise<"ok" | "fail" | "empty"> {
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

    const current = readPendingStore()[id];
    const remaining: SongPatch = {};
    if (current) {
      for (const key of Object.keys(current.patch) as (keyof SongPatch)[]) {
        if (current.patch[key] !== snapshot[key]) {
          (remaining as Record<string, unknown>)[key] = current.patch[key];
        }
      }
    }

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
  const ids = getPendingSongIds();
  let synced = 0;
  let failed = 0;
  for (const id of ids) {
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
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    // ignore
  }
}

export function getCachedFolders(): Folder[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Folder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
