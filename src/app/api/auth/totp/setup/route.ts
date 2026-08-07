import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildOtpauthUri,
  buildTotpQrDataUrl,
  createTotpSetupToken,
  generateTotpSecret,
} from "@/lib/totp";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "Set an email password first, then enable two-step verification.",
        },
        { status: 400 },
      );
    }

    if (user.totpEnabled && user.totpSecret) {
      return NextResponse.json(
        { error: "Two-step verification is already enabled." },
        { status: 400 },
      );
    }

    const secret = generateTotpSecret();
    const label = user.email;
    const otpauthUrl = buildOtpauthUri(label, secret);
    const [qrDataUrl, setupToken] = await Promise.all([
      buildTotpQrDataUrl(otpauthUrl),
      createTotpSetupToken(user.id, secret),
    ]);

    return NextResponse.json({
      secret,
      otpauthUrl,
      qrDataUrl,
      setupToken,
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Could not start two-step setup." },
      { status: 500 },
    );
  }
}
