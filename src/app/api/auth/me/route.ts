import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      displayName: true,
      username: true,
      bio: true,
      profilePublic: true,
      password: true,
      googleId: true,
      recoveryEmail: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName || user.name,
      username: user.username,
      bio: user.bio,
      profilePublic: user.profilePublic,
      recoveryEmail: user.recoveryEmail,
      hasPassword: Boolean(user.password),
      hasGoogle: Boolean(user.googleId),
      createdAt: user.createdAt.toISOString(),
      needsUsername: !user.username,
    },
  });
}
