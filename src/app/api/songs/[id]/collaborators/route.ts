import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { artistSelect, toNetworkArtist } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { areConnected, getAccessibleSong } from "@/lib/song-access";

type RouteContext = { params: Promise<{ id: string }> };

function serializeCollab(row: {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    bio: string;
    avatarUrl: string | null;
  };
}) {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    artist: toNetworkArtist(row.user),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await getAccessibleSong(id, session.id);
  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = song.userId === session.id;

  const accepted = await prisma.songCollaborator.findMany({
    where: { songId: id, status: "accepted" },
    include: { user: { select: artistSelect } },
    orderBy: { createdAt: "asc" },
  });

  const pending = isOwner
    ? await prisma.songCollaborator.findMany({
        where: { songId: id, status: "pending" },
        include: { user: { select: artistSelect } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const collaborators = accepted.map(serializeCollab);

  // Network members available to invite (owner only)
  let candidates: ReturnType<typeof toNetworkArtist>[] = [];
  if (isOwner) {
    const connections = await prisma.connection.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: session.id }, { addresseeId: session.id }],
      },
      include: {
        requester: { select: artistSelect },
        addressee: { select: artistSelect },
      },
    });

    const existingIds = new Set([
      song.userId,
      ...accepted.map((c) => c.userId),
      ...pending.map((c) => c.userId),
    ]);

    candidates = connections
      .map((c) =>
        c.requesterId === session.id ? c.addressee : c.requester,
      )
      .filter((u) => u.username && !existingIds.has(u.id))
      .map(toNetworkArtist);
  }

  return NextResponse.json({
    collaborators,
    pending: pending.map(serializeCollab),
    candidates,
    isOwner,
    viewerId: session.id,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action.trim() : "";

  // Connected artist requests collab on a public song they can view
  if (action === "request") {
    const song = await prisma.song.findFirst({
      where: { id, deletedAt: null, isPublic: true },
      select: { id: true, userId: true, title: true },
    });
    if (!song) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (song.userId === session.id) {
      return NextResponse.json(
        { error: "You already own this song" },
        { status: 400 },
      );
    }

    const connected = await areConnected(session.id, song.userId);
    if (!connected) {
      return NextResponse.json(
        { error: "Connect with the artist before requesting a collab" },
        { status: 403 },
      );
    }

    const existing = await prisma.songCollaborator.findUnique({
      where: { songId_userId: { songId: id, userId: session.id } },
    });
    if (existing?.status === "accepted") {
      return NextResponse.json(
        { error: "Already a collaborator" },
        { status: 409 },
      );
    }
    if (existing?.status === "pending") {
      return NextResponse.json({
        collaborator: existing,
        status: "pending",
        message: "Request already pending",
      });
    }

    const collab = await prisma.songCollaborator.create({
      data: { songId: id, userId: session.id, status: "pending" },
      include: { user: { select: artistSelect } },
    });

    return NextResponse.json({
      collaborator: serializeCollab(collab),
      status: "pending",
    });
  }

  // Owner invites a connected artist (immediate accept)
  const song = await prisma.song.findFirst({
    where: { id, userId: session.id, deletedAt: null },
  });
  if (!song) {
    return NextResponse.json(
      { error: "Only the owner can add collaborators" },
      { status: 403 },
    );
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId || userId === session.id) {
    return NextResponse.json(
      { error: "Choose a network artist to collaborate" },
      { status: 400 },
    );
  }

  const connected = await areConnected(session.id, userId);
  if (!connected) {
    return NextResponse.json(
      { error: "You can only collaborate with artists in your network" },
      { status: 403 },
    );
  }

  const other = await prisma.user.findUnique({
    where: { id: userId },
    select: artistSelect,
  });
  if (!other?.username) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  const existing = await prisma.songCollaborator.findUnique({
    where: { songId_userId: { songId: id, userId } },
  });

  if (existing?.status === "accepted") {
    return NextResponse.json(
      { error: "Already a collaborator" },
      { status: 409 },
    );
  }

  const collab = existing
    ? await prisma.songCollaborator.update({
        where: { id: existing.id },
        data: { status: "accepted" },
        include: { user: { select: artistSelect } },
      })
    : await prisma.songCollaborator.create({
        data: { songId: id, userId, status: "accepted" },
        include: { user: { select: artistSelect } },
      });

  return NextResponse.json({
    collaborator: serializeCollab(collab),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (!userId || (action !== "accept" && action !== "decline")) {
    return NextResponse.json(
      { error: "Send { userId, action: 'accept' | 'decline' }" },
      { status: 400 },
    );
  }

  const song = await prisma.song.findFirst({
    where: { id, userId: session.id, deletedAt: null },
    select: { id: true },
  });
  if (!song) {
    return NextResponse.json(
      { error: "Only the owner can respond to collab requests" },
      { status: 403 },
    );
  }

  const pending = await prisma.songCollaborator.findFirst({
    where: { songId: id, userId, status: "pending" },
    include: { user: { select: artistSelect } },
  });
  if (!pending) {
    return NextResponse.json(
      { error: "No pending request from that artist" },
      { status: 404 },
    );
  }

  if (action === "decline") {
    await prisma.songCollaborator.delete({ where: { id: pending.id } });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  const accepted = await prisma.songCollaborator.update({
    where: { id: pending.id },
    data: { status: "accepted" },
    include: { user: { select: artistSelect } },
  });

  return NextResponse.json({
    ok: true,
    status: "accepted",
    collaborator: serializeCollab(accepted),
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const userId =
    new URL(request.url).searchParams.get("userId")?.trim() || "";

  const song = await prisma.song.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Owner removes someone, or collaborator leaves / cancels pending request
  const targetUserId = userId || session.id;
  const isOwner = song.userId === session.id;
  const isSelfLeave = targetUserId === session.id;

  if (!isOwner && !isSelfLeave) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isSelfLeave && isOwner) {
    return NextResponse.json(
      { error: "Owner cannot leave — transfer or delete the song instead" },
      { status: 400 },
    );
  }

  await prisma.songCollaborator.deleteMany({
    where: { songId: id, userId: targetUserId },
  });

  return NextResponse.json({ ok: true });
}
