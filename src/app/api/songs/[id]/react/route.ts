import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await prisma.song.findFirst({
    where: {
      id,
      deletedAt: null,
      isPublic: true,
    },
  });

  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.songReaction.findUnique({
    where: {
      songId_userId: { songId: song.id, userId: session.id },
    },
  });

  if (existing) {
    await prisma.songReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.songReaction.create({
      data: { songId: song.id, userId: session.id, type: "fire" },
    });
  }

  const fireCount = await prisma.songReaction.count({
    where: { songId: song.id },
  });

  return NextResponse.json({
    fired: !existing,
    fireCount,
  });
}
