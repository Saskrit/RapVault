import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Keep the signed-in user marked online while the app is open. */
export async function POST() {
  const session = await getSession();
  // Quiet no-op for guests — avoids red 401 noise if the beacon mounts publicly.
  if (!session) {
    return new NextResponse(null, { status: 204 });
  }

  await prisma.user.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
