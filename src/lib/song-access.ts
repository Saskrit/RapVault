import { prisma } from "@/lib/prisma";
import { artistSelect, toNetworkArtist } from "@/lib/network";

export const songAccessInclude = {
  folder: { select: { id: true, name: true } },
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  collaborators: {
    include: {
      user: { select: artistSelect },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export function serializeSong(
  song: {
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
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    folder: { id: string; name: string } | null;
    user?: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
    collaborators?: Array<{
      id: string;
      userId: string;
      createdAt: Date;
      user: {
        id: string;
        username: string | null;
        displayName: string | null;
        bio: string;
        avatarUrl: string | null;
      };
    }>;
  },
  viewerId: string,
) {
  const isOwner = song.userId === viewerId;
  return {
    id: song.id,
    title: song.title,
    content: song.content,
    genre: song.genre,
    moodTags: song.moodTags,
    status: song.status,
    isFavorite: song.isFavorite,
    isPublic: song.isPublic,
    viewCount: song.viewCount,
    beatUrl: song.beatUrl,
    voiceMemoPath: song.voiceMemoPath,
    folderId: song.folderId,
    folder: song.folder,
    userId: song.userId,
    createdAt: song.createdAt.toISOString(),
    updatedAt: song.updatedAt.toISOString(),
    deletedAt: song.deletedAt?.toISOString() ?? null,
    isOwner,
    isCollaborator: !isOwner,
    owner: song.user
      ? {
          id: song.user.id,
          username: song.user.username,
          displayName:
            song.user.displayName || song.user.username || "Artist",
          avatarUrl: song.user.avatarUrl,
        }
      : null,
    collaborators: (song.collaborators || []).map((c) => ({
      id: c.id,
      userId: c.userId,
      createdAt: c.createdAt.toISOString(),
      artist: toNetworkArtist(c.user),
    })),
  };
}

export async function getAccessibleSong(
  songId: string,
  userId: string,
  options?: { includeDeleted?: boolean },
) {
  return prisma.song.findFirst({
    where: {
      id: songId,
      ...(options?.includeDeleted ? {} : { deletedAt: null }),
      OR: [
        { userId },
        { collaborators: { some: { userId } } },
      ],
    },
    include: songAccessInclude,
  });
}

export async function areConnected(userA: string, userB: string) {
  const connection = await prisma.connection.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
    select: { id: true },
  });
  return Boolean(connection);
}
