import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, TOOLS } from "./promptBuilder.js";
import { validateEntry } from "../validators/index.js";

export type IntentResult =
  | {
      kind: "proposal";
      resourceType: string;
      environment: string;
      key: string;
      fields: Record<string, unknown>;
      validation: { valid: boolean; errors: string[] };
    }
  | { kind: "clarification"; question: string }
  | { kind: "no_action"; message: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Sends the conversation to Claude with tool-use constrained to the two
 * tools defined in promptBuilder.ts, then validates any proposed entry
 * against its resource-specific schema before returning it. The caller
 * (CLI or API route) decides what to do with a "proposal" — this function
 * never writes files or calls git/Azure.
 */
export async function parseIntent(
  history: ChatMessage[],
  apiKey: string = process.env.ANTHROPIC_API_KEY ?? ""
): Promise<IntentResult> {
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Export it as an environment variable — never hardcode it in source."
    );
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: buildSystemPrompt(),
    tools: TOOLS as any,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");

  if (!toolUse || toolUse.type !== "tool_use") {
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
    return { kind: "no_action", message: text || "No structured proposal was returned." };
  }

  if (toolUse.name === "request_clarification") {
    const input = toolUse.input as { question: string };
    return { kind: "clarification", question: input.question };
  }

  if (toolUse.name === "propose_infrastructure_change") {
    const input = toolUse.input as {
      resource_type: string;
      environment: string;
      key: string;
      fields: Record<string, unknown>;
    };
    const validation = validateEntry(input.resource_type, input.fields);
    return {
      kind: "proposal",
      resourceType: input.resource_type,
      environment: input.environment,
      key: input.key,
      fields: input.fields,
      validation,
    };
  }

  return { kind: "no_action", message: `Unrecognized tool call: ${toolUse.name}` };
}
