import { NextResponse, type NextRequest } from "next/server";

import { TOKEN_COOKIE, readClaims } from "./app/lib/auth";

/*
  Route protection — Architecture.md Section 2, Rules.md Section 4.

  Next.js 16 renamed the `middleware` file convention to `proxy`; the behaviour is
  unchanged. This is the navigation gate: it keeps unauthenticated or wrong-role
  users out of /seller/* and /admin/* without relying on conditional rendering.
  It is NOT the security boundary — the backend re-checks the verified JWT on
  every protected endpoint (Architecture.md Section 7).
*/

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const claims = readClaims(request.cookies.get(TOKEN_COOKIE)?.value);

  if (!claims) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const area = pathname.startsWith("/admin") ? "admin" : "seller";
  if (claims.role !== area) {
    // Signed in, wrong area — send the user to their own dashboard rather than
    // to the login page, which would look like a session failure.
    const target = claims.role === "admin" ? "/admin/dashboard" : "/seller/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/seller/:path*", "/admin/:path*"],
};
