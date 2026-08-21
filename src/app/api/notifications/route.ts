import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { artistSelect, toNetworkArtist } from "@/lib/network";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), 100)
      : null;

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { notificationsSeenAt: true },
  });
  const seenAt = me?.notificationsSeenAt ?? null;

  const [incoming, collabRequests] = await Promise.all([
    prisma.connection.findMany({
      where: {
        status: "pending",
        addresseeId: session.id,
      },
      include: {
        requester: { select: artistSelect },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.songCollaborator.findMany({
      where: {
        status: "pending",
        song: {
          userId: session.id,
          deletedAt: null,
        },
      },
      include: {
        user: { select: artistSelect },
        song: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const networkNotifications = incoming.map((row) => {
    const artist = toNetworkArtist(row.requester);
    const createdAt = row.createdAt;
    const unread = !seenAt || createdAt > seenAt;
    return {
      id: `network:${row.id}`,
      type: "network_request" as const,
      title: "Connection request",
      body: `${artist.displayName} wants to connect`,
      href: "/vault/network?tab=incoming",
      createdAt: createdAt.toISOString(),
      unread,
      artist,
    };
  });

  const collabNotifications = collabRequests.map((row) => {
    const artist = toNetworkArtist(row.user);
    const createdAt = row.createdAt;
    const unread = !seenAt || createdAt > seenAt;
    const title = row.song.title?.trim() || "Untitled";
    return {
      id: `collab:${row.id}`,
      type: "collab_request" as const,
      title: "Collab request",
      body: `${artist.displayName} wants to collab on “${title}”`,
      href: `/vault/write/${row.song.id}?collab=requests`,
      createdAt: createdAt.toISOString(),
      unread,
      artist,
    };
  });

  const notifications = [...networkNotifications, ...collabNotifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const sliced = limit ? notifications.slice(0, limit) : notifications;
  const unreadCount = notifications.filter((n) => n.unread).length;

  const [networkUnread, collabUnread] = await Promise.all([
    prisma.connection.count({
      where: {
        status: "pending",
        addresseeId: session.id,
        ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
      },
    }),
    prisma.songCollaborator.count({
      where: {
        status: "pending",
        song: { userId: session.id, deletedAt: null },
        ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
      },
    }),
  ]);

  return NextResponse.json({
    notifications: sliced,
    counts: {
      total: notifications.length,
      unread: networkUnread + collabUnread,
      networkRequests: networkUnread,
      collabRequests: collabUnread,
      listedUnread: unreadCount,
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.all !== true) {
    return NextResponse.json(
      { error: "Send { all: true } to mark all as read" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: { notificationsSeenAt: new Date() },
    select: { notificationsSeenAt: true },
  });

  return NextResponse.json({
    message: "All notifications marked as read",
    seenAt: updated.notificationsSeenAt?.toISOString() ?? null,
  });
}
