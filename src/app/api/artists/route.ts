import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";

  const artists = await prisma.user.findMany({
    where: {
      profilePublic: true,
      username: { not: null },
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      _count: {
        select: {
          songs: { where: { isPublic: true, deletedAt: null } },
        },
      },
    },
    orderBy: [{ displayName: "asc" }, { username: "asc" }],
    take: 100,
  });

  return NextResponse.json({
    artists: artists
      .filter((a) => a.username)
      .map((a) => ({
        id: a.id,
        username: a.username!,
        displayName: a.displayName || a.username!,
        bio: a.bio,
        publicSongCount: a._count.songs,
      })),
  });
}
