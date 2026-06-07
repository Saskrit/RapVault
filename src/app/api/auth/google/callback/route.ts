import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  getAppOrigin,
} from "@/lib/google-auth";
import { findOrCreateGoogleUser } from "@/lib/oauth-user";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const origin = getAppOrigin(request);

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/login?error=google_denied", origin));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/login?error=google_state", origin));
  }

  try {
    const profile = await exchangeGoogleCode(request, code);
    await findOrCreateGoogleUser(profile);
    return NextResponse.redirect(new URL("/vault", origin));
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_failed", origin));
  }
}
