import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { artistSelect, toNetworkArtist } from "@/lib/network";
import { prisma } from "@/lib/prisma";

/** Lightweight notifications feed for the vault bell. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incoming = await prisma.connection.findMany({
    where: {
      status: "pending",
      addresseeId: session.id,
    },
    include: {
      requester: { select: artistSelect },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const notifications = incoming.map((row) => ({
    id: `network:${row.id}`,
    type: "network_request" as const,
    title: "Connection request",
    body: `${toNetworkArtist(row.requester).displayName} wants to connect`,
    href: "/vault/network?tab=incoming",
    createdAt: row.createdAt.toISOString(),
    artist: toNetworkArtist(row.requester),
  }));

  return NextResponse.json({
    notifications,
    counts: {
      total: notifications.length,
      networkRequests: notifications.length,
    },
  });
}
