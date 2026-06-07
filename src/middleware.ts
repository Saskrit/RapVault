import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "rapvault_session";

async function isAuthenticated(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !process.env.AUTH_SECRET) return false;

  try {
    await jwtVerify(
      token,
      new TextEncoder().encode(process.env.AUTH_SECRET),
    );
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await isAuthenticated(request);

  if (pathname.startsWith("/vault") && !authed) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const authPages = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];

  if (authPages.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && authed) {
    return NextResponse.redirect(new URL("/vault", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/vault/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
