import { createHash, randomInt } from "crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import {
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from "@/lib/auth-validation";
import { sendSignupVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 15 * 60 * 1000;

function hashCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET || "rapvault";
  return createHash("sha256")
    .update(`${email}:${code}:${secret}`)
    .digest("hex");
}

function generateCode() {
  return String(randomInt(100000, 1000000));
}

/** Step 1: validate credentials, email a 6-digit code, do not create User yet. */
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

    const code = generateCode();
    const passwordHash = await hashPassword(password);
    const codeHash = hashCode(email, code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await prisma.pendingSignup.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        codeHash,
        expiresAt,
        attempts: 0,
      },
      update: {
        passwordHash,
        codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    try {
      await sendSignupVerificationEmail(email, code);
    } catch (error) {
      console.error("Signup verification email failed:", error);
      await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
      return NextResponse.json(
        {
          error:
            "Could not send verification email. Check email settings and try again.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      message: "Verification code sent",
      email,
      expiresInMinutes: 15,
    });
  } catch (error) {
    console.error("Register request error:", error);
    return NextResponse.json(
      { error: "Could not start registration" },
      { status: 500 },
    );
  }
}
