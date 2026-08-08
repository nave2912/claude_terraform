import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

/** Read-only: forwards { prNumber, userReply? } to the backend's
 * /fix-pr/diagnose — no side effects, never commits or pushes. */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const res = await backendFetch("/fix-pr/diagnose", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
