import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

/** Forwards { prNumber, files } to the backend's /fix-pr/apply — the one
 * route in this feature with a real side effect: commits + pushes the
 * previously-diagnosed fix to the PR's own existing branch. */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const res = await backendFetch("/fix-pr/apply", {
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
