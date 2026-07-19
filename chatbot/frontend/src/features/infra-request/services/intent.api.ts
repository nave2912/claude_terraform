export interface IntentClassifyResult {
  kind: "matched" | "clarification";
  resourceType?: string;
  environment?: string;
  question?: string;
}

/**
 * Calls this app's own /api/intent route (server-side Anthropic call, see
 * src/app/api/intent/route.ts). This is the one feature-service file that
 * talks to an LLM path rather than the structured backend — kept separate
 * from infraRequest.api.ts so that boundary stays visible in the code, not
 * just in a comment.
 */
export async function classifyResourceIntent(
  message: string,
  resourceTypes: { resourceType: string; description: string }[],
  allowedEnvironments: string[]
): Promise<IntentClassifyResult> {
  const res = await fetch("/api/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, resourceTypes, allowedEnvironments }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? "Intent classification failed");
  }
  return body as IntentClassifyResult;
}
