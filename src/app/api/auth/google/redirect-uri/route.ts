import { NextResponse } from "next/server";
import { getGoogleRedirectUri } from "@/lib/google-auth";

/** Dev helper: shows the exact redirect URI to add in Google Cloud Console. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const redirectUri = getGoogleRedirectUri(request);
  return NextResponse.json({
    redirectUri,
    hint: "Add this exact URI under Authorized redirect URIs in Google Cloud Console.",
  });
}
