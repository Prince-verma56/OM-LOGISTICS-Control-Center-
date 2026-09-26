import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

/**
 * Route guard (Next.js 16 `proxy.ts`, formerly `middleware.ts`).
 *
 * Built from `authConfig` rather than `@/auth` so the per-request bundle never
 * imports bcrypt or the seeded demo store. This is an optimistic check only —
 * it reads the session cookie and never touches repositories. Role checks stay
 * in `withApi` and server components, which run with the full instance.
 */
const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = ["/customers/tracking", "/api/v1/public/tracking"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/login")) {
    return isLoggedIn ? NextResponse.redirect(new URL("/control-tower", req.nextUrl)) : NextResponse.next();
  }

  if (!isLoggedIn) {
    const url = new URL("/login", req.nextUrl);
    if (pathname !== "/") {
      url.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
