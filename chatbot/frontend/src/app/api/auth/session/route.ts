import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/authSession";

export async function GET(req: NextRequest) {
  const secret = process.env.BACKEND_API_KEY;
  if (!secret) {
    // Degrade to "not authenticated" rather than 500 — a misconfigured
    // deployment should show the login gate, not break the home page.
    return NextResponse.json({ authenticated: false });
  }
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { valid, username } = await verifySessionToken(token, secret);
  return NextResponse.json(valid ? { authenticated: true, username } : { authenticated: false });
}
