#!/usr/bin/env node
/**
 * Offline test harness for the parse -> validate -> merge loop (Phase 2 of
 * chatbot/docs/chatbot-architecture.md). Never touches git, GitHub, or Azure.
 *
 * Usage:
 *   npm run cli -- "create a resource group for the analytics team in qa, owner platform-team, cost center CC-AN-001"
 *   npm run cli -- --file request.txt
 *
 * Prefer --file on Windows: some shell/npm.cmd/cmd.exe combinations have
 * been observed corrupting multi-word quoted arguments before they reach
 * this process. Reading from a file sidesteps shell argument quoting.
 *
 * Mock mode (no ANTHROPIC_API_KEY / no network call — feeds a canned
 * proposal straight into validate+merge, useful for smoke-testing the rest
 * of the pipeline):
 *   npm run cli -- --mock
 */
import { previewIntent, type PreviewOutcome } from "../pipeline/previewIntent.js";
import { readMessage } from "./readMessage.js";

async function main() {
  const { message, mock } = readMessage(process.argv.slice(2));

  let outcome: PreviewOutcome;

  if (mock) {
    outcome = {
      status: "valid_proposal",
      resourceType: "resource-group",
      environment: "dev",
      key: "cli_smoke_test",
      fields: {
        name: "azure-learning-clismoke",
        location: "eastus",
        tags: {
          environment: "dev",
          owner: "platform-team",
          costCenter: "CC-LEARN-001",
          application: "azure-learning",
          dataClassification: "internal",
        },
      },
      wouldWriteTo: "(mock — no real file path)",
      mergedFileContent: "(mock — run without --mock to see the real merge)",
    };
  } else {
    if (!message) {
      console.error(
        'Usage: npm run cli -- "<your request>"  (or --mock, or --file request.txt)'
      );
      process.exit(1);
    }
    outcome = await previewIntent(message);
  }

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
    case "merged_file_invalid":
      console.error("[merged file validation FAILED]");
      outcome.errors.forEach((e) => console.error(`  - ${e}`));
      process.exitCode = 1;
      return;
    case "valid_proposal":
      console.log(
        `[proposal] ${outcome.resourceType} / ${outcome.environment} / ${outcome.key}`
      );
      console.log(JSON.stringify(outcome.fields, null, 2));
      console.log("[validation OK]");
      console.log(`[would write] ${outcome.wouldWriteTo}`);
      console.log(outcome.mergedFileContent);
      console.log(
        "(nothing was written to disk — this CLI only tests parse -> validate -> merge; use `npm run propose` or POST /propose for PR creation)"
      );
      return;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
