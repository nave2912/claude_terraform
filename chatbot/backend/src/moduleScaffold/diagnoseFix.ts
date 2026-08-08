import Anthropic from "@anthropic-ai/sdk";
import { buildDiagnosePrompt, DIAGNOSE_TOOLS, type FailingCheckContext, type FileContext } from "./diagnosePrompt.js";

function client(apiKey: string = process.env.ANTHROPIC_API_KEY ?? ""): Anthropic {
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Export it as an environment variable — never hardcode it in source."
    );
  }
  return new Anthropic({ apiKey });
}

export type DiagnoseResult =
  | { kind: "fix_proposed"; explanation: string; files: { filePath: string; newContent: string }[] }
  | { kind: "needs_clarification"; question: string }
  | { kind: "escalated"; reason: string };

/**
 * The one Claude call in the "fix an existing PR" pipeline — given the
 * failing check(s)' real error text and the current content of whichever
 * files this PR is allowed to touch, decide whether a concrete fix, a
 * clarifying question, or an escalation is the right response. Never
 * touches git or the filesystem itself (mirrors planIntent.ts's
 * resolveResourceType/summarizeFields — pure LLM call, caller owns all
 * side effects).
 */
export async function diagnosePrFix(params: {
  providerResourceType: string;
  moduleName: string;
  failingChecks: FailingCheckContext[];
  files: FileContext[];
  checkovFileContent: string;
  userReply?: string;
}): Promise<DiagnoseResult> {
  const response = await client().messages.create({
    model: "claude-sonnet-4-5",
    // A module's full main.tf/variables.tf + a model JSON entry + the
    // whole .checkov.yaml can add up; give this real headroom the same
    // way summarizeFields does for wide resource types.
    max_tokens: 8192,
    system: buildDiagnosePrompt(params),
    tools: DIAGNOSE_TOOLS as any,
    messages: [
      {
        role: "user",
        content: params.userReply
          ? `The user replied to your clarifying question: "${params.userReply}". Propose a fix now if possible.`
          : "Diagnose the failing check(s) above and take the appropriate action.",
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
    return { kind: "escalated", reason: text || "Model did not propose a concrete action." };
  }

  if (toolUse.name === "propose_fix") {
    const input = toolUse.input as { explanation: string; files: { filePath: string; newContent: string }[] };
    return { kind: "fix_proposed", explanation: input.explanation, files: input.files ?? [] };
  }
  if (toolUse.name === "request_clarification") {
    const input = toolUse.input as { question: string };
    return { kind: "needs_clarification", question: input.question };
  }
  if (toolUse.name === "escalate") {
    const input = toolUse.input as { reason: string };
    return { kind: "escalated", reason: input.reason };
  }
  return { kind: "escalated", reason: `Unrecognized tool call: ${toolUse.name}` };
}
