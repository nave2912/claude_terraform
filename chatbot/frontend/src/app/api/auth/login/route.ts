import { NextRequest, NextResponse } from "next/server";
import { createAccessToken, SESSION_COOKIE_NAME } from "@/lib/authSession";
import { appLoginUsername, appLoginPassword, backendApiKey } from "@/lib/serverEnv";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON: { username, password, target }" }, { status: 400 });
  }

  const { username, password, target } = (body ?? {}) as {
    username?: unknown;
    password?: unknown;
    target?: unknown;
  };
  if (typeof username !== "string" || typeof password !== "string" || typeof target !== "string" || !target.startsWith("/")) {
    return NextResponse.json({ error: "Body must be JSON: { username, password, target }" }, { status: 400 });
  }

  if (username !== appLoginUsername() || password !== appLoginPassword()) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  // Bound to `target` (e.g. "/infra") — proxy.ts only accepts this token
  // for that one workspace, and deletes it after the one page load it
  // grants. maxAge is just a safety net in case the client never actually
  // navigates through proxy.ts (e.g. the tab is closed mid-flow); it isn't
  // what makes this single-use, proxy.ts's delete-on-use is.
  const token = await createAccessToken(target, backendApiKey());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60,
  });
  return res;
}
