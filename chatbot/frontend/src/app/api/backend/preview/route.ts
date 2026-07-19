import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const res = await backendFetch("/preview-structured", {
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
