import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirects signed-out visitors to the login page.
 *
 * This is a convenience, not the security boundary. It checks only for the
 * presence of a session cookie and never validates it — the real gate is
 * `authorize()`, called at the top of every server action and scoped read.
 * Next 16 renamed `middleware` to `proxy`; the runtime is nodejs and cannot
 * be configured.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/admin/:path*", "/activity/:path*"],
};
