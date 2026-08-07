import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { artistSelect, toNetworkArtist } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { areConnected, getAccessibleSong } from "@/lib/song-access";

type RouteContext = { params: Promise<{ id: string }> };

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

  const collaborators = song.collaborators.map((c) => ({
    id: c.id,
    userId: c.userId,
    createdAt: c.createdAt.toISOString(),
    artist: toNetworkArtist(c.user),
  }));

  // Network members available to invite (owner only)
  let candidates: ReturnType<typeof toNetworkArtist>[] = [];
  if (song.userId === session.id) {
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
      ...collaborators.map((c) => c.userId),
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
    candidates,
    isOwner: song.userId === session.id,
    viewerId: session.id,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await prisma.song.findFirst({
    where: { id, userId: session.id, deletedAt: null },
  });
  if (!song) {
    return NextResponse.json(
      { error: "Only the owner can add collaborators" },
      { status: 403 },
    );
  }

  const body = await request.json();
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

  try {
    const collab = await prisma.songCollaborator.create({
      data: { songId: id, userId },
      include: { user: { select: artistSelect } },
    });
    return NextResponse.json({
      collaborator: {
        id: collab.id,
        userId: collab.userId,
        createdAt: collab.createdAt.toISOString(),
        artist: toNetworkArtist(collab.user),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Already a collaborator" },
      { status: 409 },
    );
  }
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

  // Owner removes someone, or collaborator leaves
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
