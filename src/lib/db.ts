import Dexie, { type EntityTable, type Table } from "dexie";
import type { Folder, Song } from "@/types";
import type { SongPatch } from "@/lib/offline-types";

export type PendingPatchRow = {
  songId: string;
  patch: SongPatch;
  updatedAt: number;
};

export type PendingCreateRow = {
  songId: string;
  createdAt: number;
};

export type PublicSongRow = {
  id: string;
  payload: Record<string, unknown> & { id: string };
};

export type MetaRow = {
  key: string;
  value: unknown;
};

export const RAPVAULT_DB_NAME = "rapvault-local-v1";

export class RapVaultDB extends Dexie {
  songs!: EntityTable<Song, "id">;
  folders!: EntityTable<Folder, "id">;
  pendingPatches!: Table<PendingPatchRow, string>;
  pendingCreates!: Table<PendingCreateRow, string>;
  publicSongs!: Table<PublicSongRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super(RAPVAULT_DB_NAME);
    this.version(1).stores({
      songs: "id, folderId, updatedAt, deletedAt, isFavorite, userId",
      folders: "id, sortOrder, name",
      pendingPatches: "songId, updatedAt",
      pendingCreates: "songId, createdAt",
      publicSongs: "id",
      meta: "key",
    });
  }
}

let dbInstance: RapVaultDB | null = null;

/** Lazily open the IndexedDB database (browser only). */
export function getRapVaultDb(): RapVaultDB | null {
  if (typeof window === "undefined") return null;
  if (!dbInstance) {
    dbInstance = new RapVaultDB();
  }
  return dbInstance;
}

/** Delete the entire local vault (used when functional consent is revoked). */
export async function deleteRapVaultDb(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    await Dexie.delete(RAPVAULT_DB_NAME);
  } catch {
    // ignore private-mode / already-deleted
  }
}
