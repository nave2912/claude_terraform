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
import fs from "node:fs";
import { proposeStructuredChange } from "../pipeline/proposeStructuredChange.js";
import { validateEntry, listResourceTypes, getResourceType } from "../validators/index.js";
import { mergeEntry } from "../modelwriter/index.js";
import { modelFilePath, MODULES_DIR, listAvailableEnvironments } from "../config/paths.js";
import { mergePullRequest, deleteRemoteBranch, getPrStatus, getCommitStatus } from "../gitprovider/index.js";
import { planModuleScaffold } from "../pipeline/scaffoldModulePlan.js";
import { scaffoldModule } from "../pipeline/scaffoldModule.js";
import { routeTerraformCommand } from "../pipeline/routeTerraformCommand.js";
import { diagnosePrFailure, applyPrFix } from "../pipeline/fixExistingPr.js";
import {
  costBySubscription,
  costByResourceGroup,
  costGrandTotal,
  costTrend,
  type CostTrendGranularity,
} from "../observability/cost.js";
import { listResourceGroups } from "../observability/inventory.js";
import { resourceActivity } from "../observability/activity.js";

/**
 * Azure Cost Management/Activity Log calls attach the real upstream HTTP
 * status as `statusCode` (see withRetry.ts) — most commonly 429 when
 * throttled. Forward it instead of collapsing every observability failure
 * to a flat 500, so the frontend's existing "Azure is rate-limiting..."
 * branch (keyed off a 429 response) actually has a 429 to key off.
 */
function azureErrorStatus(err: unknown): number {
  const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
  return statusCode === 429 ? 429 : 500;
}

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
 * against. Also returns every environment this repo actually has (see
 * listAvailableEnvironments), so the form only ever offers environments
 * that really exist.
 */
app.get("/schema-info", requireApiKey, (_req, res) => {
  const allowedEnvironments = listAvailableEnvironments();
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
 * Lists what this tool can build, straight from the modules/ directory
 * itself (not from models/schema/*.schema.json) -- so it reflects every
 * defined module, including any that don't have a chat-facing schema yet.
 * Purely a directory listing: folder name in, folder name out, no
 * special characters stripped beyond the underscore->space swap the
 * frontend already does for every other field label.
 */
app.get("/modules", requireApiKey, (_req, res) => {
  try {
    const modules = fs
      .readdirSync(MODULES_DIR, { withFileTypes: true })
      // Leading underscore (e.g. _module_template) marks a scaffold, not a
      // real, creatable resource type.
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
      .map((entry) => entry.name)
      .sort();
    res.json({ modules });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Read-only lookup used to resolve foreign-key-style fields (e.g.
 * storage-account's `resource_group_name`, which must match the real
 * Azure `name` of an entry in models/<env>/resource-group.json). Returns
 * the existing entries for one resourceType+environment so the frontend
 * can offer a real dropdown instead of a free-text guess. No LLM, no
 * writes — structured read only.
 */
app.get("/model-entries", requireApiKey, (req: Request, res: Response) => {
  const resourceType = String(req.query.resourceType ?? "");
  const environment = String(req.query.environment ?? "");
  if (!resourceType || !environment) {
    res.status(400).json({ error: "query params required: resourceType, environment" });
    return;
  }
  try {
    const { containerKey } = getResourceType(resourceType);
    const filePath = modelFilePath(environment, resourceType);
    if (!fs.existsSync(filePath)) {
      res.json({ entries: {} });
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json({ entries: parsed[containerKey] ?? {} });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
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

/**
 * Read-only PR CI status (the pull_request-triggered validate/plan
 * workflow) — this is what the frontend polls to decide whether to show
 * the merge button at all. No LLM, no writes.
 */
app.get("/pr-status", requireApiKey, (req: Request, res: Response) => {
  const prNumber = Number(req.query.prNumber);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    res.status(400).json({ error: "query param required: prNumber (positive integer)" });
    return;
  }
  try {
    res.json(getPrStatus(prNumber));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Read-only commit CI status — used after a merge to track the resulting
 * push->apply workflow run (the PR's own checks never include `apply`,
 * since that job only runs on push). No LLM, no writes.
 */
app.get("/commit-status", requireApiKey, (req: Request, res: Response) => {
  const sha = String(req.query.sha ?? "");
  if (!sha) {
    res.status(400).json({ error: "query param required: sha" });
    return;
  }
  try {
    res.json(getCommitStatus(sha));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Squash-merges a PR this pipeline opened. Deliberately requires the
 * caller to already know the PR number (returned from /propose-structured)
 * — this endpoint doesn't search for or guess which PR to merge. Merging
 * is still gated by a human clicking "Merge" in the chat UI; this route
 * doesn't change what happens after merge — the repo's own push->apply
 * workflow and environment approval gate (if configured) still apply.
 */
app.post("/merge-pr", requireApiKey, (req: Request, res: Response) => {
  const { prNumber, branch } = req.body ?? {};
  if (typeof prNumber !== "number" || !Number.isInteger(prNumber) || prNumber <= 0) {
    res.status(400).json({ error: "body must be JSON: { prNumber: number, branch?: string }" });
    return;
  }
  try {
    const result = mergePullRequest(prNumber);
    if (!result.merged) {
      res.json({ status: "merge_failed", error: result.error ?? "Unknown error" });
      return;
    }
    if (typeof branch === "string" && branch) {
      deleteRemoteBranch(branch);
    }
    res.json({ status: "merged", sha: result.sha, prNumber });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Read-only: turns a chat message ("I want to create a VM") into a
 * human-reviewable plan (mandatory/optional fields, in plain language)
 * sourced from the azurerm provider's own schema — see
 * chatbot/docs's module-scaffolding notes. No git side effects, same
 * "preview only" contract as /chat. Pass `resourceType` on a follow-up call
 * once a clarification question has been answered, to skip re-resolving it.
 */
app.post("/scaffold-module/plan", requireApiKey, async (req: Request, res: Response) => {
  const message = req.body?.message;
  const resourceType = typeof req.body?.resourceType === "string" ? req.body.resourceType : undefined;
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "body must be JSON: { \"message\": \"<text>\", \"resourceType\"?: \"<azurerm_...>\" }" });
    return;
  }
  try {
    const outcome = await planModuleScaffold(message, resourceType);
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Imports a brand-new module + schema from the azurerm provider's own
 * schema and wires it into environments/<environment>/main.tf, with an
 * EMPTY models/<environment>/<resourceType>.json (no starter instance —
 * see scaffoldModule.ts's doc comment for why). No field review, no
 * example values: nothing about a specific instance is decided here.
 * Never auto-merges, same as every other write route here.
 */
app.post("/scaffold-module/generate", requireApiKey, async (req: Request, res: Response) => {
  const { resourceType, environment, requesterId } = req.body ?? {};
  if (typeof resourceType !== "string" || !resourceType.trim() || typeof environment !== "string" || !environment.trim()) {
    res.status(400).json({
      error: "body must be JSON: { resourceType: \"<azurerm_...>\", environment: \"<env>\", requesterId? }",
    });
    return;
  }
  try {
    const outcome = await scaffoldModule(resourceType, environment, typeof requesterId === "string" ? requesterId : undefined);
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Single entry point for the `/terraform` chat command: resolves free text
 * to a concrete azurerm_* resource type (reusing the same resolver
 * /scaffold-module/plan uses), then reports whether that type already has a
 * module (existing_type — frontend should route to the resource-form /
 * propose-structured flow) or not (new_type — frontend should route to
 * /scaffold-module/plan+generate). Read-only, no side effects.
 */
app.post("/terraform-route", requireApiKey, async (req: Request, res: Response) => {
  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "body must be JSON: { \"message\": \"<text>\" }" });
    return;
  }
  try {
    const outcome = await routeTerraformCommand(message);
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Read-only: diagnoses why a specific PR's CI is failing (real error text,
 * via getPrStatus's errorText) and asks Claude for a fix / a clarifying
 * question / an escalation — never commits or pushes. Pass `userReply` on
 * a follow-up call once a clarification question has been answered, same
 * round-trip shape as /scaffold-module/plan's resourceType hint.
 */
app.post("/fix-pr/diagnose", requireApiKey, async (req: Request, res: Response) => {
  const { prNumber, userReply } = req.body ?? {};
  if (typeof prNumber !== "number" || !Number.isInteger(prNumber) || prNumber <= 0) {
    res.status(400).json({ error: "body must be JSON: { prNumber: number, userReply?: string }" });
    return;
  }
  try {
    const outcome = await diagnosePrFailure(prNumber, typeof userReply === "string" ? userReply : undefined);
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Applies exactly the files the user already reviewed in the diagnose
 * preview — commits + pushes to the SAME PR branch (never a new one, no
 * new PR opened). Never re-runs Claude, so what's applied is guaranteed
 * to match what was shown.
 */
app.post("/fix-pr/apply", requireApiKey, async (req: Request, res: Response) => {
  const { prNumber, files } = req.body ?? {};
  if (typeof prNumber !== "number" || !Number.isInteger(prNumber) || prNumber <= 0 || !Array.isArray(files)) {
    res.status(400).json({
      error: "body must be JSON: { prNumber: number, files: [{filePath, newContent}] }",
    });
    return;
  }
  try {
    const outcome = await applyPrFix(prNumber, files);
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Read-only Azure Cost Management data for the Observability > Cost tab.
 * scope=subscription           -> month-to-date cost per resource group.
 * scope=resource-group&resourceGroup=<name> -> month-to-date cost per
 * resource within that resource group.
 */
app.get("/observability/cost", requireApiKey, async (req: Request, res: Response) => {
  const scope = String(req.query.scope ?? "subscription");
  try {
    if (scope === "resource-group") {
      const resourceGroup = String(req.query.resourceGroup ?? "");
      if (!resourceGroup) {
        res.status(400).json({ error: "query param required: resourceGroup (when scope=resource-group)" });
        return;
      }
      res.json({ scope, resourceGroup, rows: await costByResourceGroup(resourceGroup) });
      return;
    }
    if (scope !== "subscription") {
      res.status(400).json({ error: "query param scope must be 'subscription' or 'resource-group'" });
      return;
    }
    res.json({ scope, rows: await costBySubscription() });
  } catch (err) {
    res.status(azureErrorStatus(err)).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Month-to-date cost summed across every subscription the configured
 * service principal can see (not just AZURE_SUBSCRIPTION_ID) — the Cost
 * tab's always-visible headline total, plus the per-subscription breakdown
 * that sums to it.
 */
app.get("/observability/cost/summary", requireApiKey, async (_req: Request, res: Response) => {
  try {
    res.json(await costGrandTotal());
  } catch (err) {
    res.status(azureErrorStatus(err)).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Day-by-day or month-by-month cost trend, summed across every accessible
 * subscription, for the Cost tab's trend charts.
 * granularity=Daily|Monthly (default Daily), days=how many days back from
 * today to query (default 30, max 366).
 */
app.get("/observability/cost/trend", requireApiKey, async (req: Request, res: Response) => {
  const granularity: CostTrendGranularity = req.query.granularity === "Monthly" ? "Monthly" : "Daily";
  const days = Number(req.query.days ?? 30);
  // Azure Cost Management rejects a Custom time period over 1 calendar
  // year; 364 keeps every "days ago" -> from/to computation safely under
  // that regardless of which month/leap-year it lands on.
  if (!Number.isFinite(days) || days <= 0 || days > 364) {
    res.status(400).json({ error: "query param days must be a number between 1 and 364" });
    return;
  }
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  try {
    res.json(await costTrend(granularity, from, to));
  } catch (err) {
    res.status(azureErrorStatus(err)).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Resource group names in the configured subscription — powers the Cost/Metrics scope pickers. */
app.get("/observability/resource-groups", requireApiKey, async (_req: Request, res: Response) => {
  try {
    res.json({ resourceGroups: await listResourceGroups() });
  } catch (err) {
    res.status(azureErrorStatus(err)).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Read-only Azure Activity Log data for the Observability > Metrics tab:
 * per-resource last management-plane activity (timestamp + caller) over
 * the last 90 days, joined onto the live resource inventory so untouched
 * resources still show up. Optionally scoped to one resource group.
 */
app.get("/observability/metrics", requireApiKey, async (req: Request, res: Response) => {
  const resourceGroup = req.query.resourceGroup ? String(req.query.resourceGroup) : undefined;
  try {
    res.json({ resourceGroup: resourceGroup ?? null, resources: await resourceActivity(resourceGroup) });
  } catch (err) {
    res.status(azureErrorStatus(err)).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`chatbot backend listening on http://localhost:${PORT}`);
  console.log(`  GET  /health            - no auth`);
  console.log(`  GET  /schema-info       - fixed-schema form data, requires x-api-key`);
  console.log(`  GET  /model-entries     - existing entries for a resourceType+environment, requires x-api-key`);
  console.log(`  POST /chat              - free-text preview (LLM), requires x-api-key`);
  console.log(`  POST /propose           - free-text full pipeline (LLM), requires x-api-key`);
  console.log(`  POST /preview-structured - fixed-schema preview, requires x-api-key`);
  console.log(`  POST /propose-structured - fixed-schema full pipeline, requires x-api-key`);
  console.log(`  GET  /pr-status          - PR CI check status, requires x-api-key`);
  console.log(`  GET  /commit-status      - commit CI check status (post-merge apply tracking), requires x-api-key`);
  console.log(`  POST /merge-pr           - squash-merge a PR this pipeline opened, requires x-api-key`);
  console.log(`  POST /scaffold-module/plan     - preview a new module's mandatory/optional fields, requires x-api-key`);
  console.log(`  POST /scaffold-module/generate - import a new module + schema + wiring (no instance) and open a PR, requires x-api-key`);
  console.log(`  POST /terraform-route          - route a /terraform message to existing-type vs new-type, requires x-api-key`);
  console.log(`  POST /fix-pr/diagnose          - diagnose a failing PR's CI and propose a fix, requires x-api-key`);
  console.log(`  POST /fix-pr/apply             - apply a previously-diagnosed fix to the same PR branch, requires x-api-key`);
  console.log(`  GET  /observability/cost            - month-to-date Azure cost (subscription or resource-group scope), requires x-api-key`);
  console.log(`  GET  /observability/cost/summary    - month-to-date cost summed across every accessible subscription, requires x-api-key`);
  console.log(`  GET  /observability/cost/trend      - daily/monthly cost trend across every accessible subscription, requires x-api-key`);
  console.log(`  GET  /observability/resource-groups - resource group names in the configured subscription, requires x-api-key`);
  console.log(`  GET  /observability/metrics         - per-resource last activity + last-modified-by, requires x-api-key`);
});
