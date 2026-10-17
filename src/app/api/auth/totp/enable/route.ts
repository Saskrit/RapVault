import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeTotpCode,
  verifyTotp,
  verifyTotpSetupToken,
} from "@/lib/totp";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const setupToken =
      typeof body.setupToken === "string" ? body.setupToken.trim() : "";
    const code = normalizeTotpCode(body.code);

    if (!setupToken || code.length !== 6) {
      return NextResponse.json(
        { error: "Setup token and 6-digit code are required." },
        { status: 400 },
      );
    }

    const pending = await verifyTotpSetupToken(setupToken);
    if (!pending || pending.userId !== session.id) {
      return NextResponse.json(
        { error: "Setup expired. Start two-step setup again." },
        { status: 400 },
      );
    }

    if (!verifyTotp(pending.secret, code)) {
      return NextResponse.json(
        { error: "Invalid authenticator code. Try again." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user?.password) {
      return NextResponse.json(
        { error: "Set an email password before enabling two-step." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: session.id },
      data: {
        totpSecret: pending.secret,
        totpEnabled: true,
      },
    });

    return NextResponse.json({
      message: "Two-step verification enabled.",
      hasTotp: true,
    });
  } catch (error) {
    console.error("TOTP enable error:", error);
    return NextResponse.json(
      { error: "Could not enable two-step verification." },
      { status: 500 },
    );
  }
}
