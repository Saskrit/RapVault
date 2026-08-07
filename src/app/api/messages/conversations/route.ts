import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isUserOnline } from "@/lib/presence";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: session.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  lastSeenAt: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
      },
    },
  });

  const unreadGroups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      senderId: { not: session.id },
      readAt: null,
      conversationId: { in: participations.map((p) => p.conversationId) },
    },
    _count: { _all: true },
  });
  const unreadByConversation = new Map(
    unreadGroups.map((g) => [g.conversationId, g._count._all]),
  );

  const conversations = participations
    .map((p) => {
      const other = p.conversation.participants.find(
        (x) => x.userId !== session.id,
      )?.user;
      const last = p.conversation.messages[0] || null;
      return {
        id: p.conversation.id,
        updatedAt: p.conversation.updatedAt.toISOString(),
        unreadCount: unreadByConversation.get(p.conversation.id) ?? 0,
        other: other
          ? {
              id: other.id,
              username: other.username,
              displayName: other.displayName || other.username || "Artist",
              avatarUrl: other.avatarUrl,
              online: isUserOnline(other.lastSeenAt),
            }
          : null,
        lastMessage: last
          ? {
              id: last.id,
              body: last.body,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
            }
          : null,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  let otherId =
    typeof body.userId === "string" ? body.userId.trim() : "";

  if (!otherId && typeof body.username === "string") {
    const other = await prisma.user.findUnique({
      where: { username: body.username.toLowerCase().trim() },
      select: { id: true },
    });
    if (!other) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    otherId = other.id;
  }

  if (!otherId || otherId === session.id) {
    return NextResponse.json(
      { error: "Choose another artist to message" },
      { status: 400 },
    );
  }

  const otherUser = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, username: true },
  });
  if (!otherUser?.username) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: session.id } } },
        { participants: { some: { userId: otherId } } },
      ],
    },
    include: {
      participants: true,
    },
  });

  const pair = existing?.participants.filter(
    (p) => p.userId === session.id || p.userId === otherId,
  );
  if (existing && pair && pair.length === 2 && existing.participants.length === 2) {
    return NextResponse.json({ conversationId: existing.id });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: session.id }, { userId: otherId }],
      },
    },
  });

  return NextResponse.json({ conversationId: conversation.id });
}
