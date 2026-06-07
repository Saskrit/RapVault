import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedSong(id: string, userId: string) {
  return prisma.song.findFirst({
    where: { id, userId },
    include: { folder: { select: { id: true, name: true } } },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await getOwnedSong(id, user.id);
  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ song });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getOwnedSong(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const song = await prisma.song.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.genre !== undefined ? { genre: body.genre } : {}),
      ...(body.moodTags !== undefined ? { moodTags: body.moodTags } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.isFavorite !== undefined
        ? { isFavorite: body.isFavorite }
        : {}),
      ...(body.folderId !== undefined ? { folderId: body.folderId } : {}),
    },
    include: { folder: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ song });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getOwnedSong(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.song.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
