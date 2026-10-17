import { NextResponse } from "next/server";
import { getSession, verifyPassword } from "@/lib/auth";
import {
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const clear = body.recoveryEmail === null || body.recoveryEmail === "";
    const recoveryEmail = clear
      ? null
      : normalizeEmail(body.recoveryEmail);
    const password = typeof body.password === "string" ? body.password : "";

    if (!clear) {
      if (!recoveryEmail) {
        return NextResponse.json(
          { error: "Recovery email is required" },
          { status: 400 },
        );
      }
      if (!isValidEmail(recoveryEmail)) {
        return NextResponse.json(
          { error: "Enter a valid recovery email" },
          { status: 400 },
        );
      }
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.password) {
      if (!password) {
        return NextResponse.json(
          { error: "Current password is required" },
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
    }

    if (recoveryEmail && recoveryEmail === user.email) {
      return NextResponse.json(
        {
          error:
            "Recovery email must be different from your sign-in email",
        },
        { status: 400 },
      );
    }

    if (recoveryEmail) {
      const taken = await prisma.user.findFirst({
        where: {
          OR: [{ email: recoveryEmail }, { recoveryEmail }],
          NOT: { id: user.id },
        },
      });
      if (taken) {
        return NextResponse.json(
          { error: "This email is already in use" },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { recoveryEmail },
    });

    return NextResponse.json({
      message: recoveryEmail
        ? "Recovery email saved"
        : "Recovery email removed",
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        recoveryEmail: updated.recoveryEmail,
        hasPassword: Boolean(updated.password),
        hasGoogle: Boolean(updated.googleId),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update recovery email" },
      { status: 500 },
    );
  }
}
