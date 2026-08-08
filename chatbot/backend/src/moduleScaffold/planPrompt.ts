import type { FieldSpec } from "./fieldExtraction.js";

/**
 * Two separate, narrow Claude tool-use steps for module scaffolding —
 * deliberately NOT reusing intent/promptBuilder.ts's TOOLS, since those are
 * schema-registry-driven and assume the resource type already has a model.
 * Neither step here ever emits `.tf` or JSON-Schema text: step 1 only picks
 * *which* azurerm resource type the user means, step 2 only writes
 * human-readable prose about a field list the caller already computed
 * deterministically from the provider's own schema (fieldExtraction.ts).
 * The actual field names/types/required-ness always come from our own
 * code, never from the model.
 */

export function buildResolvePrompt(): string {
  return `You help a DevOps engineer figure out which exact azurerm Terraform
provider resource type they want to scaffold a new module for, from a
natural-language request like "I want to create a VM" or "add support for a
network interface".

Respond with the precise resource type name as it appears in the azurerm
Terraform provider (e.g. "azurerm_linux_virtual_machine",
"azurerm_network_interface", "azurerm_container_group") by calling
resolve_resource_type.

If the request is ambiguous (e.g. "a VM" could mean
azurerm_linux_virtual_machine or azurerm_windows_virtual_machine, or could
need a size/OS choice that changes which resource type applies), call
request_clarification instead — never guess between multiple plausible
resource types.

If the message doesn't describe an Azure resource at all, call
request_clarification asking what resource they'd like to scaffold.`;
}

export const RESOLVE_TOOLS = [
  {
    name: "resolve_resource_type",
    description:
      "The user's message clearly identifies exactly one azurerm Terraform provider resource type to scaffold a module for.",
    input_schema: {
      type: "object" as const,
      required: ["resourceType"],
      properties: {
        resourceType: {
          type: "string",
          pattern: "^azurerm_[a-z0-9_]+$",
          description: "The exact azurerm_* resource type name from the Terraform provider.",
        },
      },
    },
  },
  {
    name: "request_clarification",
    description: "The request is ambiguous, names something unclear, or doesn't identify an Azure resource at all.",
    input_schema: {
      type: "object" as const,
      required: ["question"],
      properties: {
        question: { type: "string" },
      },
    },
  },
];

function fieldLine(f: FieldSpec): string {
  const nested = f.nesting ? ` (nested ${f.nesting} block)` : "";
  const hint = f.description ? ` — provider hint: ${f.description}` : "";
  return `- ${f.name}: ${f.hclType}${nested}${hint}`;
}

export function buildSummarizePrompt(
  resourceType: string,
  mandatoryFields: FieldSpec[],
  optionalFields: FieldSpec[]
): string {
  return `You are helping a DevOps engineer understand what configuration is
needed to create a new Terraform module wrapping the azurerm resource type
"${resourceType}".

This is the COMPLETE, authoritative field list — derived directly from the
azurerm provider's own schema. You must not invent, rename, omit, or add any
field; your only job is to explain it in plain language.

Mandatory fields (the provider requires these):
${mandatoryFields.map(fieldLine).join("\n") || "(none)"}

Optional fields (the provider allows these, with defaults if omitted):
${optionalFields.map(fieldLine).join("\n") || "(none)"}

Call describe_fields with:
- a short (2-4 sentence) plain-English summary of what this resource is and
  what mandatory configuration a user must decide on before it can be
  created.
- one short, plain-English description for EVERY field listed above (both
  mandatory and optional), keyed by its exact field name. Where a provider
  hint was given, use it as a starting point but simplify it for a
  non-Terraform-expert reader. Where no hint was given, describe the field
  from its name and type as best you can, staying accurate to the type
  shown (don't claim a list field is a single value, etc.).
- an exampleValue for EVERY field listed above — this key is mandatory on
  every entry, never omit it. For a plain "string" field, give ONE
  concrete, real, valid literal value a working example config could use.
  This matters most for fields Azure restricts to a fixed set of accepted
  values (e.g. an "application_type" or "account_tier"-style argument) —
  the Terraform provider's own schema never exposes those enum
  constraints, only that the type is "string", so a lazy generic
  placeholder like "placeholder" or "example" will fail terraform
  plan/apply against the real Azure API. Use your own knowledge of the
  azurerm provider and the underlying Azure service to pick a value that
  would actually be accepted. Use exactly "" (empty string) — never a
  fabricated-looking placeholder — for: list/set/map/nested-block fields
  (they aren't a single literal), fields that are genuinely free-text with
  no real-world constraint to get right (e.g. an arbitrary display name),
  and fields that reference another resource you have no way to know
  (e.g. an existing resource's ID).`;
}

export const SUMMARIZE_TOOLS = [
  {
    name: "describe_fields",
    description:
      "Provide a plain-English summary and per-field descriptions for the exact field list given — never introduces new fields.",
    input_schema: {
      type: "object" as const,
      required: ["summary", "fieldDescriptions"],
      properties: {
        summary: { type: "string" },
        fieldDescriptions: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "description", "exampleValue"],
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              exampleValue: {
                type: "string",
                description:
                  "Mandatory. A concrete, real, valid literal value for a plain string field (see the exampleValue instructions above), or exactly \"\" for list/set/map/nested fields and fields with no meaningful real-world value to suggest. Never omit this key.",
              },
            },
          },
        },
      },
    },
  },
];
