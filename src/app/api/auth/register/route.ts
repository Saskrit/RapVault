import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  hashPassword,
  seedDefaultFolders,
} from "@/lib/auth";
import {
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from "@/lib/auth-validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.googleId && !existing.password) {
        return NextResponse.json(
          {
            error:
              "This email is already registered with Google. Sign in with Google, or use Forgot password to set an email password.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error:
            "This email is already registered. Sign in instead, or use Forgot password if you need access.",
        },
        { status: 409 },
      );
    }

    const hashed = await hashPassword(password);
    const { allocateUniqueUsername } = await import("@/lib/allocate-username");
    const { suggestUsernameFromEmail } = await import("@/lib/username");
    const username = await allocateUniqueUsername(
      suggestUsernameFromEmail(email),
    );
    const displayName = email.split("@")[0] || "Artist";

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        username,
        displayName,
      },
    });

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
  } catch {
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 },
    );
  }
}
