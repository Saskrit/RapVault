import type { Song } from "@/types";

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
    | "annotations"
    | "isFavorite"
    | "folderId"
    | "isPublic"
  >
>;
