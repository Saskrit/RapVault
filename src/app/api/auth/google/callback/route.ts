import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_LINK_USER_COOKIE,
  OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  getAppOrigin,
} from "@/lib/google-auth";
import { GoogleLinkError, findOrCreateGoogleUser, linkGoogleToUser } from "@/lib/oauth-user";

const LINK_ERRORS: Record<string, string> = {
  GOOGLE_IN_USE: "google_in_use",
  EMAIL_MISMATCH: "google_email_mismatch",
  ALREADY_LINKED: "already_linked",
  USER_NOT_FOUND: "google_failed",
};

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
  const intent = cookieStore.get(OAUTH_INTENT_COOKIE)?.value;
  const linkUserId = cookieStore.get(OAUTH_LINK_USER_COOKIE)?.value;

  cookieStore.delete(OAUTH_STATE_COOKIE);
  cookieStore.delete(OAUTH_INTENT_COOKIE);
  cookieStore.delete(OAUTH_LINK_USER_COOKIE);

  if (!savedState || savedState !== state) {
    const redirectPath =
      intent === "link" ? "/vault/settings?error=google_state" : "/login?error=google_state";
    return NextResponse.redirect(new URL(redirectPath, origin));
  }

  try {
    const profile = await exchangeGoogleCode(request, code);

    if (intent === "link" && linkUserId) {
      try {
        await linkGoogleToUser(linkUserId, profile);
        return NextResponse.redirect(new URL("/vault/settings?linked=1", origin));
      } catch (linkError) {
        const code =
          linkError instanceof GoogleLinkError
            ? LINK_ERRORS[linkError.code] ?? "google_failed"
            : "google_failed";
        return NextResponse.redirect(new URL(`/vault/settings?error=${code}`, origin));
      }
    }

    await findOrCreateGoogleUser(profile);
    return NextResponse.redirect(new URL("/vault", origin));
  } catch {
    const redirectPath =
      intent === "link" ? "/vault/settings?error=google_failed" : "/login?error=google_failed";
    return NextResponse.redirect(new URL(redirectPath, origin));
  }
}
