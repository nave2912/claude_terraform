import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vaultName: string }> }
) {
  const { vaultName } = await params;
  try {
    const res = await backendFetch(`/keyvault/${encodeURIComponent(vaultName)}/secrets`);
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * The only route in this app that writes a secret value directly to Azure
 * (no git/PR involved — see chatbot/backend's /keyvault/:vaultName/secrets).
 * This route is a pure passthrough: it never logs or inspects body.value.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vaultName: string }> }
) {
  const { vaultName } = await params;
  try {
    const payload = await req.json();
    const res = await backendFetch(`/keyvault/${encodeURIComponent(vaultName)}/secrets`, {
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
