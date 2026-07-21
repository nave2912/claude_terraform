import { checkDenylist } from "../moduleScaffold/denylist.js";
import { getProviderSchema } from "../moduleScaffold/providerSchema.js";
import { extractFields } from "../moduleScaffold/fieldExtraction.js";
import { resolveResourceType, summarizeFields, type FieldSummary } from "../moduleScaffold/planIntent.js";
import { deriveModuleName } from "../moduleScaffold/naming.js";

/**
 * Read-only counterpart to scaffoldModule.ts (the "generate" step) — never
 * touches git or the filesystem outside the provider-schema cache. Turns a
 * chat message (or an already-known azurerm resource type, once a prior
 * clarification round trip has resolved it) into a human-reviewable plan:
 * which fields are mandatory vs. optional, in plain language, backed by
 * the provider's own schema.
 */
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
      mandatoryFields: FieldSummary[];
      optionalFields: FieldSummary[];
    };

export async function planModuleScaffold(
  message: string,
  resourceTypeHint?: string
): Promise<ScaffoldPlanOutcome> {
  let providerResourceType: string;

  if (resourceTypeHint) {
    providerResourceType = resourceTypeHint;
  } else {
    const resolved = await resolveResourceType(message);
    if (resolved.kind === "clarification") {
      return { status: "clarification_needed", question: resolved.question };
    }
    if (resolved.kind === "no_action") {
      return { status: "no_action", message: resolved.message };
    }
    providerResourceType = resolved.resourceType;
  }

  const denylistCheck = checkDenylist(providerResourceType);
  if (denylistCheck.denied) {
    return { status: "denied", resourceType: providerResourceType, reason: denylistCheck.reason! };
  }

  let block;
  try {
    ({ block } = getProviderSchema(providerResourceType));
  } catch {
    return { status: "unknown_resource_type", resourceType: providerResourceType };
  }

  const allFields = extractFields(block);
  const mandatoryFields = allFields.filter((f) => f.required);
  const optionalFields = allFields.filter((f) => !f.required);

  const summarized = await summarizeFields(providerResourceType, mandatoryFields, optionalFields);

  return {
    status: "plan_ready",
    providerResourceType,
    moduleName: deriveModuleName(providerResourceType),
    summary: summarized.summary,
    mandatoryFields: summarized.mandatoryFields,
    optionalFields: summarized.optionalFields,
  };
}
