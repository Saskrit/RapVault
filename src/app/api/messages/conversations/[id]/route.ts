import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function requireParticipant(conversationId: string, userId: string) {
  return prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const member = await requireParticipant(id, session.id);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark incoming messages as read when opening the thread.
  await prisma.message.updateMany({
    where: {
      conversationId: id,
      senderId: { not: session.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
          readAt: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const other = conversation.participants.find(
    (p) => p.userId !== session.id,
  )?.user;

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      other: other
        ? {
            id: other.id,
            username: other.username,
            displayName: other.displayName || other.username || "Artist",
            avatarUrl: other.avatarUrl,
          }
        : null,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderId: m.senderId,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
        mine: m.senderId === session.id,
      })),
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const member = await requireParticipant(id, session.id);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json(
      { error: "Message is too long" },
      { status: 400 },
    );
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: session.id,
      body: text,
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      createdAt: message.createdAt.toISOString(),
      readAt: null,
      mine: true,
    },
  });
}
