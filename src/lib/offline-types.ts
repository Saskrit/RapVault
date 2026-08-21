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
    | "isFavorite"
    | "folderId"
    | "isPublic"
  >
>;
