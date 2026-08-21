import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const days = 30;
  const since = new Date(now);
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [
    ownedSongs,
    publicCount,
    networkCount,
    incomingRequests,
    collabOnMySongs,
    collabWithMe,
    reactionsOnOwned,
    viewsInRange,
  ] = await Promise.all([
    prisma.song.findMany({
      where: { userId: session.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        isPublic: true,
        viewCount: true,
        updatedAt: true,
        createdAt: true,
        _count: {
          select: {
            reactions: true,
            views: true,
            collaborators: { where: { status: "accepted" } },
          },
        },
      },
      orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.song.count({
      where: { userId: session.id, deletedAt: null, isPublic: true },
    }),
    prisma.connection.count({
      where: {
        status: "accepted",
        OR: [{ requesterId: session.id }, { addresseeId: session.id }],
      },
    }),
    prisma.connection.count({
      where: { status: "pending", addresseeId: session.id },
    }),
    prisma.songCollaborator.count({
      where: {
        status: "accepted",
        song: { userId: session.id, deletedAt: null },
      },
    }),
    prisma.songCollaborator.count({
      where: {
        status: "accepted",
        userId: session.id,
        song: { deletedAt: null },
      },
    }),
    prisma.songReaction.count({
      where: { song: { userId: session.id, deletedAt: null } },
    }),
    prisma.songView.findMany({
      where: {
        createdAt: { gte: since },
        song: { userId: session.id, deletedAt: null },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalViews = ownedSongs.reduce((sum, s) => sum + s.viewCount, 0);
  const draftCount = ownedSongs.filter((s) => s.status === "draft").length;
  const finishedCount = ownedSongs.length - draftCount;

  const viewsByDayMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    viewsByDayMap.set(dayKey(d), 0);
  }
  for (const view of viewsInRange) {
    const key = dayKey(view.createdAt);
    if (viewsByDayMap.has(key)) {
      viewsByDayMap.set(key, (viewsByDayMap.get(key) || 0) + 1);
    }
  }

  const viewsByDay = Array.from(viewsByDayMap.entries()).map(
    ([date, views]) => ({ date, views }),
  );

  const topSongs = ownedSongs.slice(0, 8).map((s) => ({
    id: s.id,
    title: s.title || "Untitled",
    isPublic: s.isPublic,
    viewCount: s.viewCount,
    fireCount: s._count.reactions,
    uniqueViewers: s._count.views,
    collaboratorCount: s._count.collaborators,
    updatedAt: s.updatedAt.toISOString(),
  }));

  const recentPublic = ownedSongs
    .filter((s) => s.isPublic)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      title: s.title || "Untitled",
      viewCount: s.viewCount,
      fireCount: s._count.reactions,
      updatedAt: s.updatedAt.toISOString(),
    }));

  return NextResponse.json({
    overview: {
      totalSongs: ownedSongs.length,
      publicSongs: publicCount,
      draftSongs: draftCount,
      finishedSongs: finishedCount,
      totalViews,
      totalFires: reactionsOnOwned,
      uniqueViewers30d: viewsInRange.length,
      networkSize: networkCount,
      incomingRequests,
      collaboratorsInvited: collabOnMySongs,
      collaborationsJoined: collabWithMe,
    },
    viewsByDay,
    topSongs,
    recentPublic,
  });
}
