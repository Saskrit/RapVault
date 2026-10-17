import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeTotpCode,
  verifyTotp,
  verifyTotpLoginToken,
} from "@/lib/totp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pendingToken =
      typeof body.pendingToken === "string" ? body.pendingToken.trim() : "";
    const code = normalizeTotpCode(body.code);

    if (!pendingToken || code.length !== 6) {
      return NextResponse.json(
        { error: "Pending token and 6-digit code are required." },
        { status: 400 },
      );
    }

    const pending = await verifyTotpLoginToken(pendingToken);
    if (!pending) {
      return NextResponse.json(
        { error: "Sign-in expired. Enter your password again." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: "Two-step verification is not available for this account." },
        { status: 400 },
      );
    }

    if (!verifyTotp(user.totpSecret, code)) {
      return NextResponse.json(
        { error: "Invalid authenticator code. Try again." },
        { status: 401 },
      );
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("TOTP verify-login error:", error);
    return NextResponse.json(
      { error: "Could not verify authenticator code." },
      { status: 500 },
    );
  }
}
