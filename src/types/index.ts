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
  folderId: string | null;
  folder: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};
