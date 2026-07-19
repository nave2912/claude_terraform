import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const prNumber = req.nextUrl.searchParams.get("prNumber");
  if (!prNumber) {
    return NextResponse.json({ error: "query param required: prNumber" }, { status: 400 });
  }
  try {
    const res = await backendFetch(`/pr-status?prNumber=${encodeURIComponent(prNumber)}`);
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
