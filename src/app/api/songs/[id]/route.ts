import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAccessibleSong,
  serializeSong,
  songAccessInclude,
} from "@/lib/song-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await getAccessibleSong(id, user.id);
  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ song: serializeSong(song, user.id) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  if (body.restore === true) {
    const existing = await prisma.song.findFirst({
      where: { id, userId: user.id, deletedAt: { not: null } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const song = await prisma.song.update({
      where: { id },
      data: { deletedAt: null },
      include: songAccessInclude,
    });
    return NextResponse.json({ song: serializeSong(song, user.id) });
  }

  const existing = await getAccessibleSong(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = existing.userId === user.id;

  // Collaborators can edit creative fields only
  const data: Record<string, unknown> = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.content !== undefined ? { content: body.content } : {}),
    ...(body.genre !== undefined ? { genre: body.genre } : {}),
    ...(body.moodTags !== undefined ? { moodTags: body.moodTags } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.beatUrl !== undefined ? { beatUrl: body.beatUrl } : {}),
    ...(body.voiceMemoPath !== undefined
      ? { voiceMemoPath: body.voiceMemoPath }
      : {}),
  };

  if (isOwner) {
    if (body.isFavorite !== undefined) data.isFavorite = body.isFavorite;
    if (body.folderId !== undefined) data.folderId = body.folderId;
    if (body.isPublic !== undefined) data.isPublic = Boolean(body.isPublic);
  } else if (
    body.isFavorite !== undefined ||
    body.folderId !== undefined ||
    body.isPublic !== undefined
  ) {
    return NextResponse.json(
      { error: "Only the owner can change visibility, folder, or favorite" },
      { status: 403 },
    );
  }

  const song = await prisma.song.update({
    where: { id },
    data,
    include: songAccessInclude,
  });

  return NextResponse.json({ song: serializeSong(song, user.id) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const permanent =
    new URL(request.url).searchParams.get("permanent") === "true";

  const existing = await prisma.song.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Only the owner can delete this song" },
      { status: 403 },
    );
  }

  if (permanent) {
    if (!existing.deletedAt) {
      return NextResponse.json(
        { error: "Song must be in recycle bin first" },
        { status: 400 },
      );
    }
    await prisma.song.delete({ where: { id } });
    return NextResponse.json({ success: true, permanent: true });
  }

  if (existing.deletedAt) {
    return NextResponse.json({ success: true });
  }

  await prisma.song.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
