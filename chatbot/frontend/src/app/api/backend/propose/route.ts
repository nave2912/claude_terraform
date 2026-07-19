import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

/**
 * The only route in this app that can cause a real, visible side effect
 * (opens a branch + PR on GitHub via the backend). It still only ever
 * forwards a structured { resourceType, environment, key, fields } payload
 * — this route never sees or accepts free text.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const res = await backendFetch("/propose-structured", {
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
