import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/student", "/teacher", "/admin"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];
// Not gated, but still need an up-to-date session cookie: the role router and
// the auth callback that completes sign-in.
const SESSION_PREFIXES = ["/dashboard", "/auth"];

/**
 * Next.js 16 Proxy (previously "middleware"). Performs an optimistic auth
 * check only: it redirects clearly unauthenticated users away from protected
 * areas. Authoritative role/permission checks always run again inside each
 * dashboard layout and every server action / route handler.
 *
 * Public, cacheable content pages skip the Supabase `getUser()` round-trip
 * entirely — they do not depend on the session and are served from the cache.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const needsSession =
    isProtected ||
    AUTH_PAGES.includes(pathname) ||
    SESSION_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  if (!needsSession) {
    return NextResponse.next();
  }

  // Fast-path: if the visitor has no Supabase auth token cookie at all, skip
  // the remote Supabase auth network round-trip.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!hasAuthCookie) {
    if (isProtected || pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)",
  ],
};
