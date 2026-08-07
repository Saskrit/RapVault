import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (session) {
    await prisma.user
      .update({
        where: { id: session.id },
        data: { lastSeenAt: null },
      })
      .catch(() => {});
  }
  await destroySession();
  return NextResponse.json({ success: true });
}
