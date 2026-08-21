import type { Folder, Song } from "@/types";
import { hasFunctionalConsent } from "@/lib/cookie-consent";
import { deleteRapVaultDb, getRapVaultDb } from "@/lib/db";
import type { SongPatch } from "@/lib/offline-types";

export type { SongPatch } from "@/lib/offline-types";

const LEGACY_CACHE_PREFIX = "rapvault-song-v1:";
const LEGACY_PUBLIC_PREFIX = "rapvault-public-song-v1:";
const LEGACY_PENDING_KEY = "rapvault-pending-patches-v1";
const LEGACY_CREATES_KEY = "rapvault-pending-creates-v1";
const LEGACY_INDEX_KEY = "rapvault-song-index-v1";
const LEGACY_FOLDERS_KEY = "rapvault-folders-v1";
const LEGACY_ACTIVE_LOCAL_KEY = "rapvault-active-local-song";
const LEGACY_ME_KEY = "rapvault-me-v1";
const MIGRATION_FLAG = "rapvault-dexie-migrated-v1";

/** Stable editor URL that can be precached for offline creates. */
export const LOCAL_WRITE_PATH = "/vault/write/local";
/** Avoid `:` in ids — it breaks path routing / caching offline. */
const OFFLINE_ID_PREFIX = "offline_";
export const SONG_ID_REMAP_EVENT = "rapvault:song-id-remapped";

const META_ACTIVE = "activeLocalSongId";
const META_ME = "me";

let migrationPromise: Promise<void> | null = null;

function canUseStorage() {
  return hasFunctionalConsent();
}

async function ensureDb() {
  if (!canUseStorage()) return null;
  await migrateLegacyLocalStorageOnce();
  return getRapVaultDb();
}

function legacyGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function legacyRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * One-time copy from the old localStorage vault into IndexedDB.
 */
export async function migrateLegacyLocalStorageOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!canUseStorage()) return;

  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      if (legacyGet(MIGRATION_FLAG) === "1") return;

      const db = getRapVaultDb();
      if (!db) return;

      const indexRaw = legacyGet(LEGACY_INDEX_KEY);
      let ids: string[] = [];
      if (indexRaw) {
        try {
          const parsed = JSON.parse(indexRaw) as string[];
          if (Array.isArray(parsed)) ids = parsed;
        } catch {
          // ignore
        }
      }

      for (const id of ids) {
        const raw = legacyGet(`${LEGACY_CACHE_PREFIX}${id}`);
        if (!raw) continue;
        try {
          const song = JSON.parse(raw) as Song;
          if (song?.id) await db.songs.put(song);
        } catch {
          // skip bad rows
        }
      }

      // Also scan for song keys not listed in the index.
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith(LEGACY_CACHE_PREFIX)) continue;
          const id = key.slice(LEGACY_CACHE_PREFIX.length);
          if (ids.includes(id)) continue;
          const raw = legacyGet(key);
          if (!raw) continue;
          try {
            const song = JSON.parse(raw) as Song;
            if (song?.id) await db.songs.put(song);
          } catch {
            // skip
          }
        }
      } catch {
        // ignore
      }

      const foldersRaw = legacyGet(LEGACY_FOLDERS_KEY);
      if (foldersRaw) {
        try {
          const folders = JSON.parse(foldersRaw) as Folder[];
          if (Array.isArray(folders)) {
            await db.folders.clear();
            await db.folders.bulkPut(folders);
          }
        } catch {
          // ignore
        }
      }

      const pendingRaw = legacyGet(LEGACY_PENDING_KEY);
      if (pendingRaw) {
        try {
          const store = JSON.parse(pendingRaw) as Record<
            string,
            { patch: SongPatch; updatedAt: number }
          >;
          for (const [songId, entry] of Object.entries(store || {})) {
            if (!entry?.patch) continue;
            await db.pendingPatches.put({
              songId,
              patch: entry.patch,
              updatedAt: entry.updatedAt || Date.now(),
            });
          }
        } catch {
          // ignore
        }
      }

      const createsRaw = legacyGet(LEGACY_CREATES_KEY);
      if (createsRaw) {
        try {
          const store = JSON.parse(createsRaw) as Record<
            string,
            { createdAt: number }
          >;
          for (const [songId, entry] of Object.entries(store || {})) {
            await db.pendingCreates.put({
              songId,
              createdAt: entry?.createdAt || Date.now(),
            });
          }
        } catch {
          // ignore
        }
      }

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith(LEGACY_PUBLIC_PREFIX)) continue;
          const raw = legacyGet(key);
          if (!raw) continue;
          try {
            const payload = JSON.parse(raw) as Record<string, unknown> & {
              id: string;
            };
            if (payload?.id) {
              await db.publicSongs.put({ id: payload.id, payload });
            }
          } catch {
            // skip
          }
        }
      } catch {
        // ignore
      }

      const meRaw = legacyGet(LEGACY_ME_KEY);
      if (meRaw) {
        try {
          await db.meta.put({ key: META_ME, value: JSON.parse(meRaw) });
        } catch {
          // ignore
        }
      }

      const active = legacyGet(LEGACY_ACTIVE_LOCAL_KEY);
      if (active) {
        await db.meta.put({ key: META_ACTIVE, value: active });
      }

      // Clear legacy keys
      for (const id of ids) {
        legacyRemove(`${LEGACY_CACHE_PREFIX}${id}`);
      }
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key?.startsWith(LEGACY_CACHE_PREFIX) ||
            key?.startsWith(LEGACY_PUBLIC_PREFIX)
          ) {
            toRemove.push(key);
          }
        }
        toRemove.forEach(legacyRemove);
      } catch {
        // ignore
      }
      legacyRemove(LEGACY_PENDING_KEY);
      legacyRemove(LEGACY_CREATES_KEY);
      legacyRemove(LEGACY_INDEX_KEY);
      legacyRemove(LEGACY_FOLDERS_KEY);
      legacyRemove(LEGACY_ACTIVE_LOCAL_KEY);
      legacyRemove(LEGACY_ME_KEY);

      try {
        localStorage.setItem(MIGRATION_FLAG, "1");
      } catch {
        // ignore
      }
    } catch {
      // Migration failures should not block the app.
    }
  })();

  return migrationPromise;
}

export function isOfflineSongId(id: string) {
  return id.startsWith(OFFLINE_ID_PREFIX) || id.startsWith("offline:");
}

export async function setActiveLocalSongId(id: string) {
  try {
    sessionStorage.setItem(LEGACY_ACTIVE_LOCAL_KEY, id);
  } catch {
    // ignore
  }
  const db = await ensureDb();
  if (!db) return;
  await db.meta.put({ key: META_ACTIVE, value: id });
}

export async function getActiveLocalSongId(): Promise<string | null> {
  try {
    const fromSession = sessionStorage.getItem(LEGACY_ACTIVE_LOCAL_KEY);
    if (fromSession) return fromSession;
  } catch {
    // ignore
  }
  const db = await ensureDb();
  if (!db) return null;
  const row = await db.meta.get(META_ACTIVE);
  return typeof row?.value === "string" ? row.value : null;
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
    void setActiveLocalSongId(songId);
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

function notifySongIdRemapped(from: string, to: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SONG_ID_REMAP_EVENT, { detail: { from, to } }),
  );
}

export async function cacheSong(song: Song) {
  const db = await ensureDb();
  if (!db) return;
  await db.songs.put(song);
}

export async function cacheSongs(songs: Song[]) {
  const db = await ensureDb();
  if (!db || songs.length === 0) return;
  await db.songs.bulkPut(songs);
}

export async function getCachedSong(id: string): Promise<Song | null> {
  const db = await ensureDb();
  if (!db) return null;
  const song = await db.songs.get(id);
  return song ?? null;
}

export async function getCachedSongs(): Promise<Song[]> {
  const db = await ensureDb();
  if (!db) return [];
  const songs = await db.songs.toArray();
  const patches = await db.pendingPatches.toArray();
  const patchMap = new Map(patches.map((p) => [p.songId, p.patch]));
  return songs.map((song) => {
    const pending = patchMap.get(song.id);
    return pending ? { ...song, ...pending } : song;
  });
}

export async function removeCachedSong(id: string) {
  const db = await ensureDb();
  if (!db) return;
  await db.transaction(
    "rw",
    db.songs,
    db.pendingPatches,
    db.pendingCreates,
    async () => {
      await db.songs.delete(id);
      await db.pendingPatches.delete(id);
      await db.pendingCreates.delete(id);
    },
  );
}

/**
 * Create a local Untitled song that syncs via POST when back online.
 */
export async function createOfflineSong(
  folderId: string | null = null,
): Promise<Song | null> {
  const db = await ensureDb();
  if (!db) return null;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `${OFFLINE_ID_PREFIX}${crypto.randomUUID()}`
      : `${OFFLINE_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const folders = await getCachedFolders();
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

  await cacheSong(song);
  await db.pendingCreates.put({ songId: id, createdAt: Date.now() });
  return song;
}

/**
 * POST a new song when online; fall back to a local offline draft.
 */
export async function createSong(
  folderId: string | null = null,
): Promise<Song | null> {
  if (!isBrowserOffline()) {
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { song: Song };
        await cacheSong(data.song);
        return data.song;
      }
    } catch {
      // Network failure — create locally.
    }
  }

  return createOfflineSong(folderId);
}

export async function getPendingPatch(id: string): Promise<SongPatch | null> {
  const db = await ensureDb();
  if (!db) return null;
  const row = await db.pendingPatches.get(id);
  return row?.patch ?? null;
}

export async function isPendingCreate(id: string): Promise<boolean> {
  if (isOfflineSongId(id)) return true;
  const db = await ensureDb();
  if (!db) return false;
  const row = await db.pendingCreates.get(id);
  return Boolean(row);
}

export async function queueSongPatch(id: string, patch: SongPatch) {
  const db = await ensureDb();
  if (!db) return;

  const existing = await db.pendingPatches.get(id);
  await db.pendingPatches.put({
    songId: id,
    patch: { ...(existing?.patch ?? {}), ...patch },
    updatedAt: Date.now(),
  });

  const cached = await getCachedSong(id);
  if (cached) {
    await cacheSong({
      ...cached,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function clearPendingPatch(id: string) {
  const db = await ensureDb();
  if (!db) return;
  await db.pendingPatches.delete(id);
}

export async function applyPendingToSong(song: Song): Promise<Song> {
  const pending = await getPendingPatch(song.id);
  if (!pending) return song;
  return { ...song, ...pending };
}

export async function getPendingSongIds(): Promise<string[]> {
  const db = await ensureDb();
  if (!db) return [];
  const [patches, creates] = await Promise.all([
    db.pendingPatches.toCollection().primaryKeys(),
    db.pendingCreates.toCollection().primaryKeys(),
  ]);
  return [...new Set([...patches, ...creates])];
}

async function remainingPatchAfterSnapshot(
  id: string,
  snapshot: SongPatch,
): Promise<SongPatch> {
  const current = await getPendingPatch(id);
  const remaining: SongPatch = {};
  if (!current) return remaining;
  for (const key of Object.keys(current) as (keyof SongPatch)[]) {
    if (current[key] !== snapshot[key]) {
      (remaining as Record<string, unknown>)[key] = current[key];
    }
  }
  return remaining;
}

async function clearPendingCreate(id: string) {
  const db = await ensureDb();
  if (!db) return;
  await db.pendingCreates.delete(id);
}

async function remapOfflineSong(
  tempId: string,
  serverSong: Song,
  remaining: SongPatch,
) {
  const db = await ensureDb();
  if (!db) return;

  await db.transaction(
    "rw",
    db.songs,
    db.pendingPatches,
    db.pendingCreates,
    async () => {
      await db.songs.delete(tempId);
      await db.pendingCreates.delete(tempId);
      await db.pendingPatches.delete(tempId);

      if (Object.keys(remaining).length === 0) {
        await db.songs.put(serverSong);
      } else {
        await db.pendingPatches.put({
          songId: serverSong.id,
          patch: remaining,
          updatedAt: Date.now(),
        });
        await db.songs.put({ ...serverSong, ...remaining });
      }
    },
  );

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
  const db = await ensureDb();
  if (!db) return "empty";

  const createRow = await db.pendingCreates.get(id);
  if (!createRow && !isOfflineSongId(id)) return "empty";

  const cached = await getCachedSong(id);
  if (!cached) {
    await clearPendingCreate(id);
    await clearPendingPatch(id);
    return "empty";
  }

  const pending = (await getPendingPatch(id)) ?? {};
  const snapshot: SongPatch = {
    title: pending.title ?? cached.title,
    content: pending.content ?? cached.content,
    genre: pending.genre ?? cached.genre,
    moodTags: pending.moodTags ?? cached.moodTags,
    status: pending.status ?? cached.status,
    folderId:
      pending.folderId !== undefined ? pending.folderId : cached.folderId,
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
    const remaining = await remainingPatchAfterSnapshot(id, createSnapshot);
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

    await remapOfflineSong(id, serverSong, remaining);

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
  const db = await ensureDb();
  if (!db) return "empty";

  if ((await db.pendingCreates.get(id)) || isOfflineSongId(id)) {
    return flushPendingCreate(id);
  }

  const entry = await db.pendingPatches.get(id);
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
    const remaining = await remainingPatchAfterSnapshot(id, snapshot);

    if (Object.keys(remaining).length === 0) {
      await clearPendingPatch(id);
      await cacheSong(serverSong);
    } else {
      await db.pendingPatches.put({
        songId: id,
        patch: remaining,
        updatedAt: Date.now(),
      });
      await cacheSong({ ...serverSong, ...remaining });
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
  const db = await ensureDb();
  if (!db) return { synced: 0, failed: 0 };

  const createIds = await db.pendingCreates.toCollection().primaryKeys();
  const patchIds = (await db.pendingPatches.toCollection().primaryKeys()).filter(
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

export async function cacheFolders(folders: Folder[]) {
  const db = await ensureDb();
  if (!db) return;
  await db.transaction("rw", db.folders, async () => {
    await db.folders.clear();
    if (folders.length > 0) await db.folders.bulkPut(folders);
  });
}

export async function getCachedFolders(): Promise<Folder[]> {
  const db = await ensureDb();
  if (!db) return [];
  return db.folders.orderBy("sortOrder").toArray();
}

/** Cache a public lyrics payload for offline reading. */
export async function cachePublicSong(
  song: Record<string, unknown> & { id: string },
) {
  const db = await ensureDb();
  if (!db) return;
  await db.publicSongs.put({ id: song.id, payload: song });
}

export async function getCachedPublicSong(
  id: string,
): Promise<(Record<string, unknown> & { id: string }) | null> {
  const db = await ensureDb();
  if (!db) return null;
  const row = await db.publicSongs.get(id);
  return row?.payload ?? null;
}

export async function cacheMe(user: unknown) {
  const db = await ensureDb();
  if (!db) return;
  await db.meta.put({ key: META_ME, value: user });
}

export async function getCachedMe<T = unknown>(): Promise<T | null> {
  const db = await ensureDb();
  if (!db) return null;
  const row = await db.meta.get(META_ME);
  return (row?.value as T) ?? null;
}

/**
 * Prefetch the full library + folders so offline mode has a complete snapshot.
 */
export async function warmOfflineLibraryCache() {
  if (!canUseStorage() || isBrowserOffline()) return;
  await migrateLegacyLocalStorageOnce();
  try {
    const [songsRes, foldersRes, meRes] = await Promise.all([
      fetch("/api/songs"),
      fetch("/api/folders"),
      fetch("/api/auth/me"),
    ]);
    if (songsRes.ok) {
      const data = (await songsRes.json()) as { songs: Song[] };
      if (Array.isArray(data.songs)) await cacheSongs(data.songs);
    }
    if (foldersRes.ok) {
      const data = (await foldersRes.json()) as { folders: Folder[] };
      if (Array.isArray(data.folders)) await cacheFolders(data.folders);
    }
    if (meRes.ok) {
      const data = await meRes.json();
      if (data?.user) await cacheMe(data.user);
    }
  } catch {
    // ignore offline / network errors
  }
}

/** Wipe IndexedDB vault (consent revoke). */
export async function purgeOfflineVault() {
  migrationPromise = null;
  try {
    localStorage.removeItem(MIGRATION_FLAG);
  } catch {
    // ignore
  }
  await deleteRapVaultDb();
}
