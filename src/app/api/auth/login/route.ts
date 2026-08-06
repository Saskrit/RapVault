import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
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

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Create an account to get started." },
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
