import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConnectionRelation } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/username";

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username: raw } = await context.params;
  const username = normalizeUsername(raw);

  const artist = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      profilePublic: true,
      youtubeUrl: true,
      facebookUrl: true,
      instagramUrl: true,
      spotifyUrl: true,
      appleMusicUrl: true,
      createdAt: true,
      songs: {
        where: { isPublic: true, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          genre: true,
          viewCount: true,
          updatedAt: true,
          _count: { select: { reactions: true } },
        },
      },
    },
  });

  if (
    !artist ||
    !artist.username ||
    (!artist.profilePublic && artist.id !== session.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const connection =
    artist.id === session.id
      ? { relation: "none" as const, connectionId: null }
      : await getConnectionRelation(session.id, artist.id);

  return NextResponse.json({
    artist: {
      id: artist.id,
      username: artist.username,
      displayName: artist.displayName || artist.username,
      bio: artist.bio,
      avatarUrl: artist.avatarUrl,
      youtubeUrl: artist.youtubeUrl || "",
      facebookUrl: artist.facebookUrl || "",
      instagramUrl: artist.instagramUrl || "",
      spotifyUrl: artist.spotifyUrl || "",
      appleMusicUrl: artist.appleMusicUrl || "",
      isSelf: artist.id === session.id,
      createdAt: artist.createdAt.toISOString(),
      connectionRelation: connection.relation,
      connectionId: connection.connectionId,
      songs: artist.songs.map((s) => ({
        id: s.id,
        title: s.title,
        genre: s.genre,
        viewCount: s.viewCount,
        fireCount: s._count.reactions,
        updatedAt: s.updatedAt.toISOString(),
      })),
    },
  });
}
