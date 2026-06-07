import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");
  const favorites = searchParams.get("favorites");
  const q = searchParams.get("q")?.trim();

  const songs = await prisma.song.findMany({
    where: {
      userId: user.id,
      ...(folderId ? { folderId } : {}),
      ...(favorites === "true" ? { isFavorite: true } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { content: { contains: q } },
              { moodTags: { contains: q } },
              { genre: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { folder: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ songs });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, folderId, genre, moodTags, status, content } = body;

  let targetFolderId = folderId;
  if (!targetFolderId) {
    const wip = await prisma.folder.findFirst({
      where: { userId: user.id, name: "Work In Progress" },
    });
    targetFolderId = wip?.id ?? null;
  }

  const song = await prisma.song.create({
    data: {
      title: title?.trim() || "Untitled",
      content: content ?? "",
      genre: genre ?? "",
      moodTags: moodTags ?? "",
      status: status ?? "draft",
      folderId: targetFolderId,
      userId: user.id,
    },
    include: { folder: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ song });
}
