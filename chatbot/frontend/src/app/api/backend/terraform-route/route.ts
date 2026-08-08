import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

/** Read-only: forwards { message } to the backend's /terraform-route, which
 * decides whether a /terraform chat command should instantiate an existing
 * resource type or scaffold a brand-new one. No side effects. */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const res = await backendFetch("/terraform-route", {
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
