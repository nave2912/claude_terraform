import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

/** Read-only: forwards { message, resourceType? } to the backend's
 * /scaffold-module/plan — no side effects, same shape as /propose's
 * preview-only counterpart. */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const res = await backendFetch("/scaffold-module/plan", {
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
