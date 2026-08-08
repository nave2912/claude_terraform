/**
 * Claude tool-use step for "fix an existing failing PR" — same shape as
 * planPrompt.ts's two-tool pattern (resolve_resource_type /
 * request_clarification): three possible outcomes, modeled as three
 * separate tools rather than one tool with a discriminator field, so the
 * model's choice of *which* tool to call IS the outcome, not a field
 * inside it. tool_choice is left unforced (same as planIntent.ts's
 * resolveResourceType) — a plain-text response with no tool_use is a
 * legitimate "I don't have a concrete action" outcome, not an error.
 */

export interface FailingCheckContext {
  name: string;
  errorText: string;
}

export interface FileContext {
  filePath: string;
  content: string;
}

export function buildDiagnosePrompt(params: {
  providerResourceType: string;
  moduleName: string;
  failingChecks: FailingCheckContext[];
  files: FileContext[];
  checkovFileContent: string;
  userReply?: string;
}): string {
  const { providerResourceType, moduleName, failingChecks, files, checkovFileContent, userReply } = params;

  const checksBlock = failingChecks
    .map((c) => `### Failing check: ${c.name}\n\`\`\`\n${c.errorText}\n\`\`\``)
    .join("\n\n");

  const filesBlock = files
    .map((f) => `### ${f.filePath}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const replyBlock = userReply
    ? `\n\nThe user was previously asked a clarifying question and replied:\n"${userReply}"\n` +
      `Use this reply to now propose a concrete fix if possible.`
    : "";

  return `You are helping fix a failing GitHub Actions CI run on an open pull
request in a Terraform + Azure repo. The PR was opened by an AI module
scaffolder for the azurerm provider resource type "${providerResourceType}"
(Terraform module "${moduleName}").

You are ONLY allowed to propose new content for files you were given the
current content of below — never invent a file path, never propose editing
environments/*/main.tf, other modules, CI workflow files, or anything
holding secrets. If a real fix requires touching something outside these
files, call escalate and explain why instead of guessing.

${checksBlock}

## Current content of files you may edit

${filesBlock}

## This repo's existing .checkov.yaml (style precedent — match it exactly
## if you propose adding a skip-check entry: grouped section, one comment
## explaining WHY the bypass is safe, never remove or alter an existing
## entry)

\`\`\`yaml
${checkovFileContent}
\`\`\`
${replyBlock}

Decide which ONE of these applies, and call exactly that tool:

- **propose_fix**: you can concretely fix this with new content for one or
  more of the files above. Prefer fixing the actual module/model content
  (e.g. correcting a value, an attribute) over adding a .checkov.yaml skip
  — only propose a .checkov.yaml change when the finding is a genuine,
  structural gap (matching this repo's existing entries' bar: "this
  capability doesn't exist in this framework yet"), not a fixable mistake.
  Give the COMPLETE new content for each file you touch, not a diff/patch.
- **request_clarification**: the fix genuinely needs a real value only the
  user has — an existing Azure resource's ID, a naming/business decision.
  Never invent a plausible-looking ID or guess at one; ask instead. Be
  specific about exactly what value you need and why.
- **escalate**: this is out of scope for an automated fix through the
  files you have access to (e.g. it needs environments/main.tf wiring
  changes, new infrastructure, or something else outside your allowlist).
  Explain what's actually needed so a human knows what to do next.`;
}

export const DIAGNOSE_TOOLS = [
  {
    name: "propose_fix",
    description:
      "Propose complete new content for one or more of the files you were given, that resolves the failing check(s).",
    input_schema: {
      type: "object" as const,
      required: ["explanation", "files"],
      properties: {
        explanation: {
          type: "string",
          description: "Plain-English: what was wrong, and what this change does about it.",
        },
        files: {
          type: "array",
          items: {
            type: "object",
            required: ["filePath", "newContent"],
            properties: {
              filePath: { type: "string", description: "Must exactly match one of the file paths you were given." },
              newContent: { type: "string", description: "The COMPLETE new file content, not a diff." },
            },
          },
        },
      },
    },
  },
  {
    name: "request_clarification",
    description:
      "The fix genuinely needs a real value only the user has (an existing Azure resource ID, a business decision) — never invent one.",
    input_schema: {
      type: "object" as const,
      required: ["question"],
      properties: {
        question: { type: "string" },
      },
    },
  },
  {
    name: "escalate",
    description:
      "Out of scope for an automated fix through the allowed files (e.g. needs environment wiring changes or new infrastructure).",
    input_schema: {
      type: "object" as const,
      required: ["reason"],
      properties: {
        reason: { type: "string" },
      },
    },
  },
];
