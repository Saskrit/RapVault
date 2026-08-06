import { NextResponse } from "next/server";
import { createSession, getSession, verifyPassword } from "@/lib/auth";
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
    const newEmail = normalizeEmail(body.newEmail);
    const password = typeof body.password === "string" ? body.password : "";

    if (!newEmail) {
      return NextResponse.json({ error: "New email is required" }, { status: 400 });
    }

    if (!isValidEmail(newEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (newEmail === user.email) {
      return NextResponse.json(
        { error: "That is already your sign-in email" },
        { status: 400 },
      );
    }

    if (user.recoveryEmail && newEmail === user.recoveryEmail) {
      return NextResponse.json(
        {
          error:
            "That address is your recovery email. Clear or change recovery email first, or pick a different address.",
        },
        { status: 400 },
      );
    }

    if (user.password) {
      if (!password) {
        return NextResponse.json(
          { error: "Current password is required to change email" },
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

    const taken = await prisma.user.findFirst({
      where: {
        OR: [{ email: newEmail }, { recoveryEmail: newEmail }],
        NOT: { id: user.id },
      },
    });
    if (taken) {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail },
    });

    await createSession({
      id: updated.id,
      email: updated.email,
      name: updated.name,
    });

    return NextResponse.json({
      message: "Email updated successfully",
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
      { error: "Could not update email" },
      { status: 500 },
    );
  }
}
