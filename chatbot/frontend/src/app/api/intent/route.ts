import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicApiKey } from "@/lib/serverEnv";

/**
 * The ONLY place an LLM is used in this app, and it does exactly one
 * narrow job: given a free-text message like "I'd like to create a storage
 * account" plus the live list of resource types from /schema-info, pick
 * which resourceType (and optionally environment) the user means. It never
 * fills in the actual resource fields (name, tags, etc.) — those always
 * come from the schema-driven form the user fills in afterward, which is
 * what actually gets validated and sent to the structured-only backend.
 *
 * Runs server-side (Route Handler) so ANTHROPIC_API_KEY never reaches the
 * browser bundle.
 */

interface ResourceTypeSummary {
  resourceType: string;
  description: string;
}

export async function POST(req: NextRequest) {
  const { message, resourceTypes, allowedEnvironments } = (await req.json()) as {
    message: string;
    resourceTypes: ResourceTypeSummary[];
    allowedEnvironments: string[];
  };

  if (typeof message !== "string" || !message.trim() || !Array.isArray(resourceTypes)) {
    return NextResponse.json(
      { error: "body must be { message: string, resourceTypes: [...], allowedEnvironments: [...] }" },
      { status: 400 }
    );
  }

  try {
    const client = new Anthropic({ apiKey: anthropicApiKey() });

    const resourceList = resourceTypes
      .map((r) => `- "${r.resourceType}": ${r.description}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      system:
        `You help a DevOps engineer figure out which Terraform-managed resource type ` +
        `they want to create, from this exact list — never invent a resource type ` +
        `that isn't listed:\n\n${resourceList}\n\n` +
        `Valid environments: ${allowedEnvironments.join(", ")}.\n\n` +
        `Call select_resource_type if the message clearly identifies one resource type ` +
        `from the list above (optionally also naming an environment). If the message ` +
        `is ambiguous, names something not in the list, or doesn't identify a resource ` +
        `type at all, call ask_clarifying_question instead — never guess.`,
      tools: [
        {
          name: "select_resource_type",
          description: "The user's message clearly identifies one resource type from the provided list.",
          input_schema: {
            type: "object" as const,
            required: ["resourceType"],
            properties: {
              resourceType: {
                type: "string",
                enum: resourceTypes.map((r) => r.resourceType),
              },
              environment: {
                type: "string",
                enum: allowedEnvironments,
                description: "Only set if the message clearly names an environment.",
              },
            },
          },
        },
        {
          name: "ask_clarifying_question",
          description: "The message is ambiguous or doesn't match a known resource type.",
          input_schema: {
            type: "object" as const,
            required: ["question"],
            properties: { question: { type: "string" } },
          },
        },
      ],
      messages: [{ role: "user", content: message }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => ("text" in b ? b.text : ""))
        .join("\n");
      return NextResponse.json({
        kind: "clarification",
        question: text || "Could you say which resource type you'd like to create?",
      });
    }

    if (toolUse.name === "select_resource_type") {
      const input = toolUse.input as { resourceType: string; environment?: string };
      return NextResponse.json({ kind: "matched", resourceType: input.resourceType, environment: input.environment });
    }

    const input = toolUse.input as { question: string };
    return NextResponse.json({ kind: "clarification", question: input.question });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
