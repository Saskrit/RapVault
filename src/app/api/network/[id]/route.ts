import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { artistSelect, toNetworkArtist } from "@/lib/network";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const action = typeof body.action === "string" ? body.action : "";

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "Action must be accept or decline" },
      { status: 400 },
    );
  }

  const connection = await prisma.connection.findUnique({
    where: { id },
    include: {
      requester: { select: artistSelect },
      addressee: { select: artistSelect },
    },
  });

  if (!connection || connection.status !== "pending") {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (connection.addresseeId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "decline") {
    await prisma.connection.delete({ where: { id } });
    return NextResponse.json({ ok: true, action: "declined" });
  }

  const updated = await prisma.connection.update({
    where: { id },
    data: { status: "accepted" },
  });

  return NextResponse.json({
    ok: true,
    action: "accepted",
    connection: {
      id: updated.id,
      status: updated.status,
      artist: toNetworkArtist(connection.requester),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const connection = await prisma.connection.findUnique({ where: { id } });

  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isParty =
    connection.requesterId === session.id ||
    connection.addresseeId === session.id;
  if (!isParty) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cancel outgoing pending, or remove an accepted connection
  if (
    connection.status === "pending" &&
    connection.requesterId !== session.id
  ) {
    return NextResponse.json(
      { error: "Use decline to reject incoming requests" },
      { status: 400 },
    );
  }

  await prisma.connection.delete({ where: { id } });
  return NextResponse.json({
    ok: true,
    action: connection.status === "accepted" ? "removed" : "cancelled",
  });
}
