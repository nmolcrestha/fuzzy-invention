import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic auth check only: redirects visitors without a session cookie away from the dashboard,
 * editor and draft previews.
 * Real authorization happens in the Data Access Layer (`requireUser`) and in every server action.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/editor/:path*", "/preview/:path*"],
};
