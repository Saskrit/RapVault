import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_LINK_USER_COOKIE,
  OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
  createOAuthState,
} from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 10,
  path: "/",
};

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { googleId: true },
    });

    if (user?.googleId) {
      return NextResponse.redirect(
        new URL("/vault/settings?error=already_linked", origin),
      );
    }

    const state = createOAuthState();
    const url = buildGoogleAuthUrl(request, state);

    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
    response.cookies.set(OAUTH_INTENT_COOKIE, "link", cookieOptions);
    response.cookies.set(OAUTH_LINK_USER_COOKIE, session.id, cookieOptions);

    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/vault/settings?error=google_config", origin),
    );
  }
}
