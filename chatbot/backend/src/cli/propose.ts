#!/usr/bin/env node
/**
 * Full Phase 3 pipeline: message -> parse -> validate -> merge -> branch ->
 * commit -> push -> (PR via gh, or a compare link if gh isn't available).
 *
 * Unlike cli/chat.ts (Phase 2, read-only preview), this DOES write files
 * and DOES push a branch to origin. It never touches main directly and
 * never merges/applies anything — that's still entirely up to a human via
 * the GitHub PR UI, same as if they'd done every step by hand.
 *
 * Environment allowlist: only environments in ALLOWED_ENVIRONMENTS (default
 * "dev") are proposable, per the phased rollout plan. Set
 * ALLOWED_ENVIRONMENTS=dev,qa to widen it.
 *
 * Usage:
 *   npm run propose -- "<your request>"
 *   npm run propose -- --file request.txt
 *
 * Prefer --file on Windows: some shell/npm.cmd/cmd.exe combinations have
 * been observed corrupting multi-word quoted arguments (literal "^"
 * characters inserted before spaces) before they ever reach this process.
 * Reading from a file sidesteps shell argument quoting entirely.
 *
 * The same pipeline is also available over HTTP — see src/api/server.ts.
 */
import { proposeInfrastructureChange } from "../pipeline/proposeInfrastructureChange.js";
import { readMessage } from "./readMessage.js";

async function main() {
  const { message } = readMessage(process.argv.slice(2));
  if (!message) {
    console.error(
      'Usage: npm run propose -- "<your request>"  (or: npm run propose -- --file request.txt)'
    );
    process.exit(1);
  }

  const outcome = await proposeInfrastructureChange(message);

  switch (outcome.status) {
    case "clarification_needed":
      console.log(`[clarification needed] ${outcome.question}`);
      return;
    case "no_action":
      console.log(`[no action] ${outcome.message}`);
      return;
    case "validation_failed":
      console.error("[validation FAILED]");
      outcome.errors.forEach((e) => console.error(`  - ${e}`));
      process.exitCode = 1;
      return;
    case "environment_blocked":
      console.error(
        `[blocked] Environment "${outcome.environment}" is not in ALLOWED_ENVIRONMENTS=${outcome.allowed.join(",")}. ` +
          `This is a deliberate safety gate, not a bug — widen ALLOWED_ENVIRONMENTS only when you're ready to let the chatbot propose changes to that environment.`
      );
      process.exitCode = 1;
      return;
    case "merged_file_invalid":
      console.error("[merged file validation FAILED]");
      outcome.errors.forEach((e) => console.error(`  - ${e}`));
      process.exitCode = 1;
      return;
    case "pr_opened":
      console.log(
        `[proposal] ${outcome.resourceType} / ${outcome.environment} / ${outcome.key}`
      );
      console.log(`\nPR opened: ${outcome.prUrl}`);
      return;
    case "pushed_no_pr":
      console.log(
        `[proposal] ${outcome.resourceType} / ${outcome.environment} / ${outcome.key}`
      );
      console.log(
        `\nBranch pushed, but "gh" isn't installed/authenticated so the PR wasn't opened automatically.`
      );
      console.log(`Open it here (one click, pre-filled): ${outcome.compareUrl}`);
      return;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
