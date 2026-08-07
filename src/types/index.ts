export type Folder = {
  id: string;
  name: string;
  sortOrder: number;
  _count: { songs: number };
};

export type Song = {
  id: string;
  title: string;
  content: string;
  genre: string;
  moodTags: string;
  status: string;
  isFavorite: boolean;
  isPublic: boolean;
  viewCount: number;
  beatUrl: string;
  voiceMemoPath: string;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isOwner?: boolean;
  isCollaborator?: boolean;
  owner?: {
    id: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  collaborators?: Array<{
    id: string;
    userId: string;
    createdAt: string;
    artist: {
      id: string;
      username: string | null;
      displayName: string;
      bio: string;
      avatarUrl: string | null;
    };
  }>;
};

export type ArtistSummary = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  publicSongCount: number;
};

export type ConnectionRelation =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";
