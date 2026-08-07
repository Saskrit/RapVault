import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Total unread DMs for the signed-in user (messages from others with no readAt). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.message.count({
    where: {
      senderId: { not: session.id },
      readAt: null,
      conversation: {
        participants: { some: { userId: session.id } },
      },
    },
  });

  return NextResponse.json({ count });
}
