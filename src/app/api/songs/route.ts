import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeSong, songAccessInclude } from "@/lib/song-access";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");
  const favorites = searchParams.get("favorites");
  const collaborations = searchParams.get("collaborations") === "true";
  const trash = searchParams.get("trash") === "true";
  const q = searchParams.get("q")?.trim();

  const textFilter = q
    ? {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { moodTags: { contains: q } },
          { genre: { contains: q } },
        ],
      }
    : null;

  if (collaborations) {
    const songs = await prisma.song.findMany({
      where: {
        deletedAt: null,
        OR: [
          { collaborators: { some: { userId: user.id, status: "accepted" } } },
          {
            userId: user.id,
            collaborators: { some: { status: "accepted" } },
          },
        ],
        ...(textFilter ? textFilter : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: songAccessInclude,
    });
    return NextResponse.json({
      songs: songs.map((song) => serializeSong(song, user.id)),
    });
  }

  if (trash) {
    const songs = await prisma.song.findMany({
      where: {
        userId: user.id,
        deletedAt: { not: null },
        ...(textFilter ? textFilter : {}),
      },
      orderBy: { deletedAt: "desc" },
      include: songAccessInclude,
    });
    return NextResponse.json({
      songs: songs.map((song) => serializeSong(song, user.id)),
    });
  }

  const songs = await prisma.song.findMany({
    where: {
      deletedAt: null,
      AND: [
        {
          OR: [
            {
              userId: user.id,
              ...(folderId ? { folderId } : {}),
              ...(favorites === "true" ? { isFavorite: true } : {}),
            },
            ...(!folderId && favorites !== "true"
              ? [
                  {
                    collaborators: {
                      some: { userId: user.id, status: "accepted" },
                    },
                  },
                ]
              : []),
          ],
        },
        ...(textFilter ? [textFilter] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: songAccessInclude,
  });

  return NextResponse.json({
    songs: songs.map((song) => serializeSong(song, user.id)),
  });
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
    include: songAccessInclude,
  });

  return NextResponse.json({ song: serializeSong(song, user.id) });
}
