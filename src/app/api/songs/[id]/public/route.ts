import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const reacted = await prisma.songReaction.findUnique({
    where: {
      songId_userId: { songId: song.id, userId: session.id },
    },
  });

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
      isOwner: song.userId === session.id,
      author: {
        id: song.user.id,
        username: song.user.username,
        displayName: song.user.displayName || song.user.username || "Artist",
        avatarUrl: song.user.avatarUrl,
      },
      fireCount: song._count.reactions,
      fired: Boolean(reacted),
    },
  });
}
