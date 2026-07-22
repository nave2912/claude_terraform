import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

export async function GET() {
  try {
    const res = await backendFetch("/keyvault/list");
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
