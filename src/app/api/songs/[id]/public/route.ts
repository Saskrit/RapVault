import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { areConnected } from "@/lib/song-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await prisma.song.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [{ isPublic: true }, { userId: session.id }],
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: { select: { reactions: true } },
    },
  });

  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = song.userId === session.id;

  const [reacted, collabRow, connected] = await Promise.all([
    prisma.songReaction.findUnique({
      where: {
        songId_userId: { songId: song.id, userId: session.id },
      },
    }),
    isOwner
      ? Promise.resolve(null)
      : prisma.songCollaborator.findUnique({
          where: {
            songId_userId: { songId: song.id, userId: session.id },
          },
          select: { status: true },
        }),
    isOwner
      ? Promise.resolve(false)
      : areConnected(session.id, song.userId),
  ]);

  let collabStatus: "none" | "pending" | "accepted" | "owner" = "none";
  if (isOwner) {
    collabStatus = "owner";
  } else if (collabRow?.status === "accepted") {
    collabStatus = "accepted";
  } else if (collabRow?.status === "pending") {
    collabStatus = "pending";
  }

  const canRequestCollab =
    Boolean(song.isPublic) &&
    !isOwner &&
    connected &&
    collabStatus === "none";

  return NextResponse.json({
    song: {
      id: song.id,
      title: song.title,
      content: song.content,
      genre: song.genre,
      moodTags: song.moodTags,
      beatUrl: song.beatUrl,
      isPublic: song.isPublic,
      viewCount: song.viewCount,
      updatedAt: song.updatedAt.toISOString(),
      createdAt: song.createdAt.toISOString(),
      isOwner,
      author: {
        id: song.user.id,
        username: song.user.username,
        displayName: song.user.displayName || song.user.username || "Artist",
        avatarUrl: song.user.avatarUrl,
      },
      fireCount: song._count.reactions,
      fired: Boolean(reacted),
      connected: Boolean(connected),
      collabStatus,
      canRequestCollab,
    },
  });
}
