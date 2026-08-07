import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  artistSelect,
  findConnectionBetween,
  toNetworkArtist,
} from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/username";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.connection.findMany({
    where: {
      OR: [{ requesterId: session.id }, { addresseeId: session.id }],
    },
    include: {
      requester: { select: artistSelect },
      addressee: { select: artistSelect },
    },
    orderBy: { updatedAt: "desc" },
  });

  const connections = [];
  const incoming = [];
  const outgoing = [];

  for (const row of rows) {
    const other =
      row.requesterId === session.id ? row.addressee : row.requester;
    const payload = {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      artist: toNetworkArtist(other),
    };

    if (row.status === "accepted") {
      connections.push(payload);
    } else if (row.addresseeId === session.id) {
      incoming.push(payload);
    } else {
      outgoing.push(payload);
    }
  }

  return NextResponse.json({
    connections,
    incoming,
    outgoing,
    counts: {
      connections: connections.length,
      incoming: incoming.length,
      outgoing: outgoing.length,
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  let otherId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!otherId && typeof body.username === "string") {
    const username = normalizeUsername(body.username);
    const other = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    });
    if (!other?.username) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    otherId = other.id;
  }

  if (!otherId || otherId === session.id) {
    return NextResponse.json(
      { error: "Choose another artist to connect with" },
      { status: 400 },
    );
  }

  const otherUser = await prisma.user.findUnique({
    where: { id: otherId },
    select: { ...artistSelect, profilePublic: true },
  });
  if (!otherUser?.username) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }
  if (!otherUser.profilePublic) {
    return NextResponse.json(
      { error: "This artist is not accepting connections" },
      { status: 403 },
    );
  }

  const existing = await findConnectionBetween(session.id, otherId);
  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json(
        { error: "Already connected", connectionId: existing.id },
        { status: 409 },
      );
    }
    if (existing.requesterId === session.id) {
      return NextResponse.json(
        { error: "Request already sent", connectionId: existing.id },
        { status: 409 },
      );
    }
    // They already sent you a request — accept it instead of creating a duplicate
    const accepted = await prisma.connection.update({
      where: { id: existing.id },
      data: { status: "accepted" },
    });
    return NextResponse.json({
      connection: {
        id: accepted.id,
        status: accepted.status,
        artist: toNetworkArtist(otherUser),
      },
      autoAccepted: true,
    });
  }

  const created = await prisma.connection.create({
    data: {
      requesterId: session.id,
      addresseeId: otherId,
      status: "pending",
    },
  });

  return NextResponse.json({
    connection: {
      id: created.id,
      status: created.status,
      artist: toNetworkArtist(otherUser),
    },
  });
}
