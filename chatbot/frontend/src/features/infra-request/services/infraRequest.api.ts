import type {
  CommitStatusResponse,
  FixPrApplyOutcome,
  FixPrDiagnoseOutcome,
  MergeOutcome,
  ModelEntriesResponse,
  ModulesResponse,
  PreviewOutcome,
  ProposeOutcome,
  PrStatusResponse,
  ScaffoldGenerateOutcome,
  SchemaInfoResponse,
  StructuredProposalInput,
  TerraformRouteOutcome,
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

  getModules: () => requestJson<ModulesResponse>("/api/backend/modules"),

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

  getPrStatus: (prNumber: number) =>
    requestJson<PrStatusResponse>(`/api/backend/pr-status?prNumber=${prNumber}`),

  getCommitStatus: (sha: string) =>
    requestJson<CommitStatusResponse>(`/api/backend/commit-status?sha=${encodeURIComponent(sha)}`),

  scaffoldModuleGenerate: (resourceType: string, environment: string, requesterId?: string) =>
    requestJson<ScaffoldGenerateOutcome>("/api/backend/scaffold-module/generate", {
      method: "POST",
      body: JSON.stringify({ resourceType, environment, requesterId }),
    }),

  terraformRoute: (message: string) =>
    requestJson<TerraformRouteOutcome>("/api/backend/terraform-route", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  fixPrDiagnose: (prNumber: number, userReply?: string) =>
    requestJson<FixPrDiagnoseOutcome>("/api/backend/fix-pr/diagnose", {
      method: "POST",
      body: JSON.stringify({ prNumber, userReply }),
    }),

  fixPrApply: (prNumber: number, files: { filePath: string; newContent: string }[]) =>
    requestJson<FixPrApplyOutcome>("/api/backend/fix-pr/apply", {
      method: "POST",
      body: JSON.stringify({ prNumber, files }),
    }),
};
