import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { allocateUniqueUsername } from "@/lib/allocate-username";
import { createSession, seedDefaultFolders } from "@/lib/auth";
import { isValidEmail, normalizeEmail } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";
import { suggestUsernameFromEmail } from "@/lib/username";

const MAX_ATTEMPTS = 5;

function hashCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET || "rapvault";
  return createHash("sha256")
    .update(`${email}:${code}:${secret}`)
    .digest("hex");
}

/** Step 2: verify email code, then create the User account. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const code =
      typeof body.code === "string"
        ? body.code.trim().replace(/\s+/g, "")
        : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter the 6-digit code from your email" },
        { status: 400 },
      );
    }

    const pending = await prisma.pendingSignup.findUnique({
      where: { email },
    });

    if (!pending) {
      return NextResponse.json(
        {
          error: "No pending signup for this email. Start registration again.",
        },
        { status: 400 },
      );
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
      return NextResponse.json(
        { error: "Code expired. Request a new one." },
        { status: 400 },
      );
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
      return NextResponse.json(
        { error: "Too many attempts. Start registration again." },
        { status: 429 },
      );
    }

    const expected = hashCode(email, code);
    if (expected !== pending.codeHash) {
      await prisma.pendingSignup.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: "Incorrect code. Check your email and try again." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
      return NextResponse.json(
        { error: "This email is already registered. Sign in instead." },
        { status: 409 },
      );
    }

    const username = await allocateUniqueUsername(
      suggestUsernameFromEmail(email),
    );
    const displayName = email.split("@")[0] || "Artist";

    const user = await prisma.user.create({
      data: {
        email,
        password: pending.passwordHash,
        username,
        displayName,
      },
    });

    await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
    await seedDefaultFolders(user.id);
    await createSession({
      id: user.id,
      email: user.email,
      name: user.displayName,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Register verify error:", error);
    return NextResponse.json(
      { error: "Could not verify email" },
      { status: 500 },
    );
  }
}
