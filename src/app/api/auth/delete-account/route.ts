import { NextResponse } from "next/server";
import {
  destroySession,
  getSession,
  verifyPassword,
} from "@/lib/auth";
import {
  deleteStoredAvatar,
  deleteStoredCover,
} from "@/lib/avatar-storage";
import { prisma } from "@/lib/prisma";

/** Permanently delete the signed-in user's account and related data. */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    const confirm =
      typeof body.confirm === "string" ? body.confirm.trim().toUpperCase() : "";

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        password: true,
        googleId: true,
        avatarUrl: true,
        coverUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.password) {
      if (!password) {
        return NextResponse.json(
          { error: "Enter your password to delete your account" },
          { status: 400 },
        );
      }
      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 401 },
        );
      }
    } else {
      // Google-only accounts: require typing DELETE
      if (confirm !== "DELETE") {
        return NextResponse.json(
          { error: 'Type DELETE to confirm account deletion' },
          { status: 400 },
        );
      }
    }

    await deleteStoredAvatar(user.avatarUrl);
    await deleteStoredCover(user.coverUrl);

    await prisma.user.delete({ where: { id: user.id } });

    // Clean up conversations left with zero participants
    await prisma.conversation.deleteMany({
      where: { participants: { none: {} } },
    });

    await destroySession();

    return NextResponse.json({
      message: "Account deleted",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Could not delete account" },
      { status: 500 },
    );
  }
}
