import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/app-url";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalized = email?.toLowerCase()?.trim();

    if (!normalized) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (user) {
      const token = randomBytes(32).toString("hex");
      const resetTokenExpires = new Date(Date.now() + RESET_EXPIRY_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpires },
      });

      const resetUrl = `${getAppOrigin(request)}/reset-password?token=${token}`;
      const googleOnly = Boolean(user.googleId && !user.password);

      await sendPasswordResetEmail(user.email, resetUrl, { googleOnly });
    }

    return NextResponse.json({
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Could not send reset email. Try again later." },
      { status: 500 },
    );
  }
}
