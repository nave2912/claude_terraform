import Anthropic from "@anthropic-ai/sdk";
import {
  buildResolvePrompt,
  buildSummarizePrompt,
  RESOLVE_TOOLS,
  SUMMARIZE_TOOLS,
} from "./planPrompt.js";
import type { FieldSpec } from "./fieldExtraction.js";

export type ResolveResult =
  | { kind: "resolved"; resourceType: string }
  | { kind: "clarification"; question: string }
  | { kind: "no_action"; message: string };

function client(apiKey: string = process.env.ANTHROPIC_API_KEY ?? ""): Anthropic {
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Export it as an environment variable — never hardcode it in source."
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Step 1 of module scaffolding: turn free text ("I want to create a VM")
 * into an exact azurerm_* resource type. This is the ONLY thing this call
 * decides — it never touches files, schemas, or Terraform.
 */
export async function resolveResourceType(message: string): Promise<ResolveResult> {
  const response = await client().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    system: buildResolvePrompt(),
    tools: RESOLVE_TOOLS as any,
    messages: [{ role: "user", content: message }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
    return { kind: "no_action", message: text || "Could not determine a resource type." };
  }

  if (toolUse.name === "request_clarification") {
    const input = toolUse.input as { question: string };
    return { kind: "clarification", question: input.question };
  }

  if (toolUse.name === "resolve_resource_type") {
    const input = toolUse.input as { resourceType: string };
    return { kind: "resolved", resourceType: input.resourceType };
  }

  return { kind: "no_action", message: `Unrecognized tool call: ${toolUse.name}` };
}

export interface FieldSummary extends FieldSpec {
  description: string;
}

export interface FieldsSummaryResult {
  summary: string;
  mandatoryFields: FieldSummary[];
  optionalFields: FieldSummary[];
}

/**
 * Step 2: given the field list we already extracted deterministically from
 * the provider's own schema, ask Claude only to write plain-English prose
 * about it — the field names/types/required-ness returned here are always
 * the exact same objects passed in (with a `description` merged on), never
 * re-derived from the model's own output. If Claude's response omits a
 * field or invents one, we silently keep our own field list and only merge
 * descriptions where they matched by name, so a bad model response can
 * degrade explanation quality but never corrupt the actual scaffold.
 */
export async function summarizeFields(
  resourceType: string,
  mandatoryFields: FieldSpec[],
  optionalFields: FieldSpec[]
): Promise<FieldsSummaryResult> {
  const response = await client().messages.create({
    // Resources with many arguments (e.g. azurerm_linux_virtual_machine has
    // ~50) need real headroom here — a truncated response
    // (stop_reason: "max_tokens") cuts off mid-JSON and drops
    // fieldDescriptions entirely, not just some of it.
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: buildSummarizePrompt(resourceType, mandatoryFields, optionalFields),
    tools: SUMMARIZE_TOOLS as any,
    tool_choice: { type: "tool", name: "describe_fields" },
    messages: [{ role: "user", content: `Describe the fields for ${resourceType}.` }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  const input =
    toolUse && toolUse.type === "tool_use"
      ? (toolUse.input as { summary?: string; fieldDescriptions?: { name: string; description: string }[] })
      : { summary: "", fieldDescriptions: [] };

  // Even with a generous token budget, a truncated/malformed response is
  // still possible — never let it crash the request. Missing descriptions
  // just fall back to the provider's own hint (or blank) below.
  const descriptions = new Map((input.fieldDescriptions ?? []).map((f) => [f.name, f.description]));

  const attach = (fields: FieldSpec[]): FieldSummary[] =>
    fields.map((f) => ({ ...f, description: descriptions.get(f.name) ?? f.description ?? "" }));

  return {
    summary: input.summary ?? "",
    mandatoryFields: attach(mandatoryFields),
    optionalFields: attach(optionalFields),
  };
}
