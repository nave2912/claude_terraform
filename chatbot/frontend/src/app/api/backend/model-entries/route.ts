import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const resourceType = req.nextUrl.searchParams.get("resourceType");
  const environment = req.nextUrl.searchParams.get("environment");
  if (!resourceType || !environment) {
    return NextResponse.json(
      { error: "query params required: resourceType, environment" },
      { status: 400 }
    );
  }
  try {
    const res = await backendFetch(
      `/model-entries?resourceType=${encodeURIComponent(resourceType)}&environment=${encodeURIComponent(environment)}`
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
