import { NextResponse } from "next/server";
import { getSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTotpCode, verifyTotp } from "@/lib/totp";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    const code = normalizeTotpCode(body.code);

    if (!password || code.length !== 6) {
      return NextResponse.json(
        { error: "Password and authenticator code are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.totpEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: "Two-step verification is not enabled." },
        { status: 400 },
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "Password is required to disable two-step verification." },
        { status: 400 },
      );
    }

    if (!(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 },
      );
    }

    if (!verifyTotp(user.totpSecret, code)) {
      return NextResponse.json(
        { error: "Invalid authenticator code. Try again." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: null,
        totpEnabled: false,
      },
    });

    return NextResponse.json({
      message: "Two-step verification disabled.",
      hasTotp: false,
    });
  } catch (error) {
    console.error("TOTP disable error:", error);
    return NextResponse.json(
      { error: "Could not disable two-step verification." },
      { status: 500 },
    );
  }
}
