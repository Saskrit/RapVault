import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Valid token and password (min 6 chars) are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 },
      );
    }

    const hashed = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch {
    return NextResponse.json(
      { error: "Could not reset password" },
      { status: 500 },
    );
  }
}
