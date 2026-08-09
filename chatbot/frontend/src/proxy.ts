import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/authSession";

export const config = {
  matcher: ["/infra/:path*", "/observability/:path*"],
};

/**
 * Server-enforced login gate — not just a hidden button on the home page.
 * Navigating straight to /infra or /observability without a valid signed
 * session cookie bounces back to "/" with the original path preserved in
 * `next`, so the home page can reopen the login dialog and, on success,
 * send the user straight on to where they were headed.
 *
 * Named `proxy` (not `middleware`) — Next.js renamed this file convention;
 * see https://nextjs.org/docs/messages/middleware-to-proxy. Same request
 * hook either way, now always on the Node.js runtime, which is why
 * verifySessionToken (Web Crypto) works here unchanged.
 */
export default async function proxy(req: NextRequest) {
  const secret = process.env.BACKEND_API_KEY;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { valid } = secret ? await verifySessionToken(token, secret) : { valid: false };

  if (valid) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("login", "1");
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
