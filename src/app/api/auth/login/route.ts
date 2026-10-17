import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import {
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from "@/lib/auth-validation";
import { createTotpLoginToken } from "@/lib/totp";
import { isValidUsername, normalizeUsername } from "@/lib/username";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier =
      typeof body.email === "string"
        ? body.email.trim()
        : typeof body.identifier === "string"
          ? body.identifier.trim()
          : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!rawIdentifier) {
      return NextResponse.json(
        { error: "Email or username is required" },
        { status: 400 },
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const email = normalizeEmail(rawIdentifier);
    const username = normalizeUsername(rawIdentifier);

    let user = null;
    if (isValidEmail(email)) {
      user = await prisma.user.findUnique({ where: { email } });
    } else if (isValidUsername(username)) {
      user = await prisma.user.findUnique({ where: { username } });
    } else {
      return NextResponse.json(
        { error: "Enter a valid email or username" },
        { status: 400 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: isValidEmail(email)
            ? "No account found with this email. Create an account to get started."
            : "No account found with this username. Check the spelling or sign in with email.",
        },
        { status: 401 },
      );
    }

    if (!user.password) {
      if (user.googleId) {
        return NextResponse.json(
          {
            error:
              "This account uses Google sign-in. Continue with Google instead, or use Forgot password to set a password.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error:
            "This account has no password set. Use Forgot password to create one.",
        },
        { status: 401 },
      );
    }

    if (!(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 },
      );
    }

    if (user.totpEnabled && user.totpSecret) {
      const pendingToken = await createTotpLoginToken(user.id);
      return NextResponse.json({
        requiresTotp: true,
        pendingToken,
      });
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
