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
      OR: [{ isPublic: true }, { userId: session.id }],
    },
  });

  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.songView.create({
      data: { songId: song.id, userId: session.id },
    });
    const updated = await prisma.song.update({
      where: { id: song.id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });
    return NextResponse.json({
      viewCount: updated.viewCount,
      counted: true,
    });
  } catch {
    // Unique constraint — already viewed
    return NextResponse.json({
      viewCount: song.viewCount,
      counted: false,
    });
  }
}
