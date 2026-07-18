import { listResourceTypes } from "../validators/index.js";

/**
 * Builds the system prompt and Claude tool definitions entirely from the
 * schema registry (models/schema/*.schema.json) — no resource type is ever
 * named in code here. Adding a new schema file changes what this function
 * produces automatically; see docs/json-model-guide.md and
 * chatbot/docs/prompt-design.md.
 */

const ENVIRONMENTS = ["dev", "qa", "prod"] as const;

export function buildSystemPrompt(): string {
  const resourceDescriptions = listResourceTypes()
    .map(({ resourceType, containerKey, schema }) => {
      const containerSchema = (schema.properties as Record<string, any>)[containerKey];
      const entrySchema = containerSchema?.additionalProperties ?? {};
      const requiredFields: string[] = entrySchema.required ?? [];
      const fieldLines = requiredFields
        .map((f) => {
          const fieldSchema = entrySchema.properties?.[f];
          const desc = fieldSchema?.description ? ` — ${fieldSchema.description}` : "";
          return `    - ${f}${desc}`;
        })
        .join("\n");

      return `- "${resourceType}": ${schema.description ?? schema.title ?? ""}\n  Required fields:\n${fieldLines}`;
    })
    .join("\n\n");

  return `You are the infrastructure-request assistant for a Terraform landing zone.

Your ONLY job is to turn a user's natural-language request into a structured
proposal for a change to a JSON model file. You never write Terraform, you
never talk to Azure, and you never approve or apply anything — a human always
reviews the resulting pull request before anything is deployed.

Available resource types (from models/schema/*.schema.json):

${resourceDescriptions}

Valid environments: ${ENVIRONMENTS.join(", ")}.

Every resource's "tags" field requires: environment, owner, costCenter,
application, dataClassification. If the user's request doesn't supply
enough information to fill in all required fields confidently, call
request_clarification with a specific, short question instead of guessing —
never invent values for owner, costCenter, or dataClassification.

If the request is clear and complete, call propose_infrastructure_change
with the resource_type, environment, a short lowercase logical key (e.g.
"analytics", "hub_networking" — this becomes the JSON map key, not a display
name), and the fields object matching that resource type's schema.`;
}

export const TOOLS = [
  {
    name: "propose_infrastructure_change",
    description:
      "Propose a schema-valid addition or update to a resource-group/storage-account/etc. JSON model entry. This does NOT create or change any real infrastructure — it only produces a candidate that will be validated and, if valid, opened as a pull request for human review.",
    input_schema: {
      type: "object" as const,
      required: ["resource_type", "environment", "key", "fields"],
      properties: {
        resource_type: {
          type: "string",
          enum: listResourceTypes().map((r) => r.resourceType),
          description: "Which schema/model file this change targets.",
        },
        environment: {
          type: "string",
          enum: [...ENVIRONMENTS],
        },
        key: {
          type: "string",
          pattern: "^[a-z][a-z0-9_]*$",
          description: "Stable logical id — becomes the map key in the model file.",
        },
        fields: {
          type: "object",
          description:
            "The entry payload. Must match the per-entry schema for the chosen resource_type (validated separately after this call).",
        },
      },
    },
  },
  {
    name: "request_clarification",
    description:
      "Ask the user a specific follow-up question because the request is missing information needed to safely propose a change (e.g. missing owner or cost center). Use this instead of guessing at required fields.",
    input_schema: {
      type: "object" as const,
      required: ["question"],
      properties: {
        question: { type: "string" },
      },
    },
  },
];
