import { NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
  createOAuthState,
} from "@/lib/google-auth";

export async function GET(request: Request) {
  try {
    const state = createOAuthState();
    const url = buildGoogleAuthUrl(request, state);

    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=google_config", request.url),
    );
  }
}
