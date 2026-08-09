import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, SESSION_COOKIE_NAME } from "@/lib/authSession";

export const config = {
  matcher: ["/infra/:path*", "/observability/:path*"],
};

/**
 * Server-enforced, per-workspace, single-use login gate — not just a
 * hidden button on the home page, not a shared session either. Each
 * workspace (target = the first path segment, e.g. "/infra") needs its
 * own login: a token minted for "/infra" doesn't unlock "/observability".
 * And there's no lingering session to refresh into — the cookie is
 * deleted the instant it's used, so a plain page refresh always bounces
 * back to the login dialog too.
 *
 * Named `proxy` (not `middleware`) — Next.js renamed this file convention;
 * see https://nextjs.org/docs/messages/middleware-to-proxy.
 */
export default async function proxy(req: NextRequest) {
  const secret = process.env.BACKEND_API_KEY;
  const target = `/${req.nextUrl.pathname.split("/")[1]}`;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = secret ? await verifyAccessToken(token, target, secret) : false;

  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("login", "1");
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
