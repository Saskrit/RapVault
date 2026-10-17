import type { ConnectionRelation } from "@/types";
import { prisma } from "@/lib/prisma";

export type { ConnectionRelation };
export type NetworkArtist = {
  id: string;
  username: string | null;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
};

const artistSelect = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
} as const;

export function toNetworkArtist(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string;
  avatarUrl: string | null;
}): NetworkArtist {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username || "Artist",
    bio: user.bio || "",
    avatarUrl: user.avatarUrl,
  };
}

/** Ordered pair so A→B and B→A can be found as one undirected edge search. */
export async function findConnectionBetween(userA: string, userB: string) {
  return prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
}

export async function getConnectionRelation(
  viewerId: string,
  otherId: string,
): Promise<{
  relation: ConnectionRelation;
  connectionId: string | null;
}> {
  if (viewerId === otherId) {
    return { relation: "none", connectionId: null };
  }

  const connection = await findConnectionBetween(viewerId, otherId);
  if (!connection) {
    return { relation: "none", connectionId: null };
  }

  if (connection.status === "accepted") {
    return { relation: "connected", connectionId: connection.id };
  }

  if (connection.requesterId === viewerId) {
    return { relation: "pending_sent", connectionId: connection.id };
  }

  return { relation: "pending_received", connectionId: connection.id };
}

export { artistSelect };
