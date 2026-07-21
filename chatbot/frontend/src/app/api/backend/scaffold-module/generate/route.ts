import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

/** Forwards { resourceType, requesterId? } to the backend's
 * /scaffold-module/generate — the one route in this feature that has a
 * real side effect: opens a branch + PR adding a new module + schema
 * (never model entries, never an environment's main.tf). */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const res = await backendFetch("/scaffold-module/generate", {
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
