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
import { parseIntent, type IntentResult } from "../intent/client.js";
import { mergeEntry } from "../modelwriter/index.js";
import { readMessage } from "./readMessage.js";

async function main() {
  const { message, mock } = readMessage(process.argv.slice(2));

  let result: IntentResult;

  if (mock) {
    result = {
      kind: "proposal",
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
      validation: { valid: true, errors: [] },
    };
  } else {
    if (!message) {
      console.error(
        'Usage: npm run cli -- "<your request>"  (or --mock, or --file request.txt)'
      );
      process.exit(1);
    }
    result = await parseIntent([{ role: "user", content: message }]);
  }

  switch (result.kind) {
    case "clarification":
      console.log(`[clarification needed] ${result.question}`);
      return;
    case "no_action":
      console.log(`[no action] ${result.message}`);
      return;
    case "proposal": {
      console.log(
        `[proposal] ${result.resourceType} / ${result.environment} / ${result.key}`
      );
      console.log(JSON.stringify(result.fields, null, 2));

      if (!result.validation.valid) {
        console.error("[validation FAILED]");
        result.validation.errors.forEach((e) => console.error(`  - ${e}`));
        process.exitCode = 1;
        return;
      }
      console.log("[validation OK]");

      const merge = mergeEntry(
        result.resourceType,
        result.environment,
        result.key,
        result.fields
      );
      if (!merge.validation.valid) {
        console.error("[merged file validation FAILED]");
        merge.validation.errors.forEach((e) => console.error(`  - ${e}`));
        process.exitCode = 1;
        return;
      }
      console.log(`[would write] ${merge.filePath}`);
      console.log(merge.after);
      console.log(
        "(nothing was written to disk — this CLI only tests parse -> validate -> merge; PR creation is a later phase)"
      );
      return;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
