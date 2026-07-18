#!/usr/bin/env node
/**
 * HTTP front-end for the same pipeline the CLIs use — no new logic lives
 * here, just routing + auth + JSON in/out. See:
 *   - src/pipeline/previewIntent.ts       (POST /chat  — no side effects)
 *   - src/pipeline/proposeInfrastructureChange.ts (POST /propose — writes,
 *     pushes a branch, opens a PR; never touches main, never merges/applies)
 *
 * Auth: every request must include `x-api-key: <API_KEY>` matching the
 * API_KEY environment variable. The server refuses to start if API_KEY
 * isn't set — fail closed, not fail open. This is a stopgap, not the real
 * auth story (Entra ID SSO is Phase 5, not built yet) — treat this server
 * as trusted-network-only (e.g. localhost, or behind your own reverse
 * proxy/VPN), not something to expose on the open internet as-is.
 *
 * Run:
 *   API_KEY=<choose-one> ANTHROPIC_API_KEY=sk-ant-... npm run serve
 *
 * Call:
 *   curl -X POST http://localhost:3000/propose \
 *     -H "x-api-key: <same key>" -H "Content-Type: application/json" \
 *     -d '{"message":"create a resource group named X in dev, owner platform-team, cost center CC-001, application X, data classification internal"}'
 */
import express, { type NextFunction, type Request, type Response } from "express";
import { previewIntent } from "../pipeline/previewIntent.js";
import { proposeInfrastructureChange } from "../pipeline/proposeInfrastructureChange.js";
import { proposeStructuredChange } from "../pipeline/proposeStructuredChange.js";
import { validateEntry, listResourceTypes } from "../validators/index.js";
import { mergeEntry } from "../modelwriter/index.js";

const PORT = Number(process.env.PORT ?? 3000);
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error(
    "API_KEY environment variable is not set. Refusing to start — this server " +
      "can write files and push git branches, it must not run without auth configured."
  );
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "64kb" }));

// The frontend is a separate static page (own origin/port, e.g. file:// or
// http://localhost:5173) — allow it to call this API cross-origin. Kept as
// a hand-rolled header instead of the `cors` package to avoid a new
// dependency for something this small.
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (req.get("x-api-key") !== API_KEY) {
    res.status(401).json({ error: "missing or invalid x-api-key header" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * Drives the frontend's fixed-schema form: every resource type's schema,
 * straight from models/schema/*.schema.json, so the form's fields/enums/
 * required-list stay in lockstep with what the backend actually validates
 * against. Also returns ALLOWED_ENVIRONMENTS so the form only offers
 * environments this server is actually permitted to open PRs against.
 */
app.get("/schema-info", requireApiKey, (_req, res) => {
  const allowedEnvironments = (process.env.ALLOWED_ENVIRONMENTS ?? "dev")
    .split(",")
    .map((e) => e.trim());
  res.json({
    allowedEnvironments,
    resourceTypes: listResourceTypes().map((r) => ({
      resourceType: r.resourceType,
      containerKey: r.containerKey,
      schema: r.schema,
    })),
  });
});

/**
 * Structured counterpart to /chat: no free-text message, no LLM call — the
 * frontend form already collected resourceType/environment/key/fields
 * directly against the schema, this just validates + previews the merge.
 */
app.post("/preview-structured", requireApiKey, (req: Request, res: Response) => {
  const { resourceType, environment, key, fields } = req.body ?? {};
  if (
    typeof resourceType !== "string" ||
    typeof environment !== "string" ||
    typeof key !== "string" ||
    typeof fields !== "object" ||
    fields === null
  ) {
    res.status(400).json({
      error: "body must be JSON: { resourceType, environment, key, fields }",
    });
    return;
  }
  try {
    const validation = validateEntry(resourceType, fields);
    if (!validation.valid) {
      res.json({ status: "validation_failed", errors: validation.errors });
      return;
    }
    const merge = mergeEntry(resourceType, environment, key, fields);
    if (!merge.validation.valid) {
      res.json({ status: "merged_file_invalid", errors: merge.validation.errors });
      return;
    }
    res.json({
      status: "valid_proposal",
      resourceType,
      environment,
      key,
      fields,
      wouldWriteTo: merge.filePath,
      mergedFileContent: merge.after,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Preview only — parses, validates, shows the merge. Never writes/pushes anything. */
app.post("/chat", requireApiKey, async (req: Request, res: Response) => {
  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "body must be JSON: { \"message\": \"<text>\" }" });
    return;
  }
  try {
    const outcome = await previewIntent(message);
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Full pipeline: parse -> validate -> merge -> branch -> commit -> push -> PR. */
app.post("/propose", requireApiKey, async (req: Request, res: Response) => {
  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "body must be JSON: { \"message\": \"<text>\" }" });
    return;
  }
  const requesterId = typeof req.body?.requesterId === "string" ? req.body.requesterId : undefined;
  try {
    const outcome = await proposeInfrastructureChange(message, requesterId);
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Structured counterpart to /propose — same PR pipeline, no LLM involved. */
app.post("/propose-structured", requireApiKey, async (req: Request, res: Response) => {
  const { resourceType, environment, key, fields, requesterId } = req.body ?? {};
  if (
    typeof resourceType !== "string" ||
    typeof environment !== "string" ||
    typeof key !== "string" ||
    typeof fields !== "object" ||
    fields === null
  ) {
    res.status(400).json({
      error: "body must be JSON: { resourceType, environment, key, fields }",
    });
    return;
  }
  try {
    const outcome = await proposeStructuredChange(
      resourceType,
      environment,
      key,
      fields,
      typeof requesterId === "string" ? requesterId : undefined
    );
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`chatbot backend listening on http://localhost:${PORT}`);
  console.log(`  GET  /health            - no auth`);
  console.log(`  GET  /schema-info       - fixed-schema form data, requires x-api-key`);
  console.log(`  POST /chat              - free-text preview (LLM), requires x-api-key`);
  console.log(`  POST /propose           - free-text full pipeline (LLM), requires x-api-key`);
  console.log(`  POST /preview-structured - fixed-schema preview, requires x-api-key`);
  console.log(`  POST /propose-structured - fixed-schema full pipeline, requires x-api-key`);
});
