import { parseIntent } from "../intent/client.js";
import { mergeEntry } from "../modelwriter/index.js";

/**
 * Phase 2 logic (parse -> validate -> merge preview), extracted so
 * cli/chat.ts and api/server.ts's /chat route share it. Never writes to
 * disk or touches git — purely a "what would happen" preview.
 */
export type PreviewOutcome =
  | { status: "clarification_needed"; question: string }
  | { status: "no_action"; message: string }
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

export async function previewIntent(message: string): Promise<PreviewOutcome> {
  const result = await parseIntent([{ role: "user", content: message }]);

  if (result.kind === "clarification") {
    return { status: "clarification_needed", question: result.question };
  }
  if (result.kind === "no_action") {
    return { status: "no_action", message: result.message };
  }
  if (!result.validation.valid) {
    return { status: "validation_failed", errors: result.validation.errors };
  }

  const merge = mergeEntry(
    result.resourceType,
    result.environment,
    result.key,
    result.fields
  );
  if (!merge.validation.valid) {
    return { status: "merged_file_invalid", errors: merge.validation.errors };
  }

  return {
    status: "valid_proposal",
    resourceType: result.resourceType,
    environment: result.environment,
    key: result.key,
    fields: result.fields,
    wouldWriteTo: merge.filePath,
    mergedFileContent: merge.after,
  };
}
