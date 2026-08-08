import { resolveResourceType } from "../moduleScaffold/planIntent.js";
import { deriveModuleName, toHyphenated } from "../moduleScaffold/naming.js";
import { listResourceTypes } from "../validators/index.js";

export type TerraformRouteOutcome =
  | { status: "clarification_needed"; question: string }
  | { status: "no_action"; message: string }
  | { status: "existing_type"; resourceType: string; providerResourceType: string }
  | { status: "new_type"; providerResourceType: string };

/**
 * Single entry point for the `/terraform` chat command. Reuses the same
 * resolver /scaffold-module/plan already uses (planIntent.ts's
 * resolveResourceType) to turn free text into one concrete azurerm_* type —
 * one LLM call, one place a resource-type decision gets made. Whether that
 * type already has a module is then a pure, deterministic lookup against
 * listResourceTypes() (this repo's own single source of truth, backed by
 * models/schema/*.schema.json) — no second LLM call needed.
 */
export async function routeTerraformCommand(message: string): Promise<TerraformRouteOutcome> {
  const resolved = await resolveResourceType(message);
  if (resolved.kind === "clarification") {
    return { status: "clarification_needed", question: resolved.question };
  }
  if (resolved.kind === "no_action") {
    return { status: "no_action", message: resolved.message };
  }

  const providerResourceType = resolved.resourceType;
  const schemaResourceType = toHyphenated(deriveModuleName(providerResourceType));
  const existing = listResourceTypes().find((r) => r.resourceType === schemaResourceType);

  return existing
    ? { status: "existing_type", resourceType: existing.resourceType, providerResourceType }
    : { status: "new_type", providerResourceType };
}
