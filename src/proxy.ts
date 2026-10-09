import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

import { subdomainFromHost } from "@/lib/hosts";

const PROTECTED = /^\/(dashboard|editor|preview)(\/|$)/;
const INTERNAL_SITES_PREFIX = "/_sites";

/**
 * 1. Website hosts (<subdomain>.<root domain>) are rewritten to the published-site renderer.
 * 2. On the app host, an optimistic cookie check guards the dashboard, editor and draft previews.
 *    Real authorization happens in the Data Access Layer (`requireUser`) and every server action.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const subdomain = subdomainFromHost(request.headers.get("host"));

  if (subdomain) {
    const url = request.nextUrl.clone();
    url.pathname = `${INTERNAL_SITES_PREFIX}/${subdomain}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // The internal renderer is only reachable through a website host.
  if (pathname === INTERNAL_SITES_PREFIX || pathname.startsWith(`${INTERNAL_SITES_PREFIX}/`)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (PROTECTED.test(pathname) && !getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js assets, so website hosts can be routed too.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
