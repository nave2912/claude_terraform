/**
 * Mirrors chatbot/backend/src/config/schemaRegistry.ts's JsonSchema /
 * ResourceTypeDefinition shapes, and the /schema-info response shape from
 * chatbot/backend/src/api/server.ts. Kept as plain types (not zod) since
 * this is what the backend sends us, not something we validate — we
 * validate what we SEND, not what we receive from our own trusted backend.
 */
export interface JsonSchemaProperty {
  type?: string;
  format?: string;
  description?: string;
  pattern?: string;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  default?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  /** true/false (allow/forbid extra keys) or a schema every extra key's
   * value must satisfy — the latter is what makes an object a "map"
   * (dynamic keys), same pattern this repo's own model files use at the
   * top level (e.g. resource_groups: { <any key>: {...} }). */
  additionalProperties?: boolean | JsonSchemaProperty;
  /** Present when type === "array" — the schema every array element must
   * satisfy. Absent/untyped items fall back to a raw-JSON editor. */
  items?: JsonSchemaProperty;
  [key: string]: unknown;
}

/** The per-entry schema (schema.properties[containerKey].additionalProperties)
 * is just another JsonSchemaProperty node — kept as a distinct name only
 * for readability at call sites, not a different shape. */
export type EntrySchema = JsonSchemaProperty;

export interface ResourceTypeInfo {
  resourceType: string;
  containerKey: string;
  schema: {
    title?: string;
    description?: string;
    properties: Record<
      string,
      { description?: string; additionalProperties: EntrySchema }
    >;
  };
}

export interface SchemaInfoResponse {
  allowedEnvironments: string[];
  resourceTypes: ResourceTypeInfo[];
}

export interface ModelEntriesResponse {
  entries: Record<string, Record<string, unknown>>;
}

export interface ModulesResponse {
  modules: string[];
}

export type PreviewOutcome =
  | { status: "validation_failed"; errors: string[] }
  | { status: "merged_file_invalid"; errors: string[] }
  | {
      status: "valid_proposal";
      resourceType: string;
      environment: string;
      key: string;
      fields: Record<string, unknown>;
      wouldWriteTo: string;
      mergedFileContent: string;
    };

export type ProposeOutcome =
  | { status: "validation_failed"; errors: string[] }
  | { status: "merged_file_invalid"; errors: string[] }
  | { status: "environment_blocked"; environment: string; allowed: string[] }
  | {
      status: "pr_opened";
      resourceType: string;
      environment: string;
      key: string;
      fields: Record<string, unknown>;
      branch: string;
      prUrl: string;
    }
  | {
      status: "pushed_no_pr";
      resourceType: string;
      environment: string;
      key: string;
      fields: Record<string, unknown>;
      branch: string;
      compareUrl: string | null;
    };

export interface StructuredProposalInput {
  resourceType: string;
  environment: string;
  key: string;
  fields: Record<string, unknown>;
}

export type MergeOutcome =
  | { status: "merged"; sha: string; prNumber: number }
  | { status: "merge_failed"; error: string };

export interface PrCheck {
  name: string;
  state: "success" | "failure" | "pending";
}

export interface PrStatusResponse {
  overall: "success" | "failure" | "pending" | "none";
  checks: PrCheck[];
  planSummary?: string | null;
  error?: string;
}

export type CommitStatusResponse = Omit<PrStatusResponse, "planSummary">;

/** Mirrors chatbot/backend/src/moduleScaffold/fieldExtraction.ts's FieldSpec
 * + the `description` merged on by planIntent.ts's summarizeFields. */
export interface ScaffoldFieldSummary {
  name: string;
  hclType: string;
  required: boolean;
  description: string;
  nesting?: "single" | "list" | "set" | "map";
  nestedFields?: ScaffoldFieldSummary[];
}

export type ScaffoldPlanOutcome =
  | { status: "clarification_needed"; question: string }
  | { status: "no_action"; message: string }
  | { status: "denied"; resourceType: string; reason: string }
  | { status: "unknown_resource_type"; resourceType: string }
  | {
      status: "plan_ready";
      providerResourceType: string;
      moduleName: string;
      summary: string;
      mandatoryFields: ScaffoldFieldSummary[];
      optionalFields: ScaffoldFieldSummary[];
    };

export type ScaffoldGenerateOutcome =
  | { status: "denied"; resourceType: string; reason: string }
  | { status: "unknown_resource_type"; resourceType: string }
  | { status: "self_check_failed"; errors: string[] }
  | {
      status: "pr_opened";
      providerResourceType: string;
      moduleName: string;
      branch: string;
      prUrl: string;
      filesChanged: string[];
    }
  | {
      status: "pushed_no_pr";
      providerResourceType: string;
      moduleName: string;
      branch: string;
      compareUrl: string | null;
      filesChanged: string[];
    };
