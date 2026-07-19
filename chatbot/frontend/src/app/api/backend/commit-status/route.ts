import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const sha = req.nextUrl.searchParams.get("sha");
  if (!sha) {
    return NextResponse.json({ error: "query param required: sha" }, { status: 400 });
  }
  try {
    const res = await backendFetch(`/commit-status?sha=${encodeURIComponent(sha)}`);
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
