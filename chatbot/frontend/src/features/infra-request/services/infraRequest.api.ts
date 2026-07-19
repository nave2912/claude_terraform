import type {
  MergeOutcome,
  ModelEntriesResponse,
  PreviewOutcome,
  ProposeOutcome,
  SchemaInfoResponse,
  StructuredProposalInput,
} from "@/types/schema";

/**
 * Every call here hits this Next.js app's own /api/backend/* Route
 * Handlers (never the Express backend directly from the browser) — see
 * src/app/api/backend/*. Components/hooks never call fetch() directly;
 * they go through this file, which is the only thing that knows the
 * request/response shapes for this feature.
 */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request to ${path} failed with ${res.status}`);
  }
  return body as T;
}

export const infraRequestApi = {
  getSchemaInfo: () => requestJson<SchemaInfoResponse>("/api/backend/schema-info"),

  getModelEntries: (resourceType: string, environment: string) =>
    requestJson<ModelEntriesResponse>(
      `/api/backend/model-entries?resourceType=${encodeURIComponent(resourceType)}&environment=${encodeURIComponent(environment)}`
    ),

  preview: (input: StructuredProposalInput) =>
    requestJson<PreviewOutcome>("/api/backend/preview", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  propose: (input: StructuredProposalInput) =>
    requestJson<ProposeOutcome>("/api/backend/propose", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  mergePullRequest: (input: { prNumber: number; branch?: string }) =>
    requestJson<MergeOutcome>("/api/backend/merge", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
