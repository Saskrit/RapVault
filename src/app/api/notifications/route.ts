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

  const incoming = await prisma.connection.findMany({
    where: {
      status: "pending",
      addresseeId: session.id,
    },
    include: {
      requester: { select: artistSelect },
    },
    orderBy: { createdAt: "desc" },
    ...(limit ? { take: limit } : { take: 100 }),
  });

  const notifications = incoming.map((row) => {
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

  const unreadCount = notifications.filter((n) => n.unread).length;

  // If limit is applied, still compute accurate unread from a count query
  const totalUnread =
    limit != null
      ? await prisma.connection.count({
          where: {
            status: "pending",
            addresseeId: session.id,
            ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
          },
        })
      : unreadCount;

  return NextResponse.json({
    notifications,
    counts: {
      total: notifications.length,
      unread: totalUnread,
      networkRequests: totalUnread,
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
