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
import { modelFilePath, MODULES_DIR } from "../config/paths.js";
import { mergePullRequest, deleteRemoteBranch, getPrStatus, getCommitStatus } from "../gitprovider/index.js";
import { planModuleScaffold } from "../pipeline/scaffoldModulePlan.js";
import { scaffoldModule } from "../pipeline/scaffoldModule.js";
import { listKeyVaults, findKeyVaultByName } from "../keyvault/registry.js";
import { isKeyVaultConfigured } from "../keyvault/client.js";
import { listSecretNames, setSecret, isValidSecretName } from "../keyvault/operations.js";
import { logSecretWrite } from "../keyvault/audit.js";

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
 * Scaffolds a brand-new module + schema from the azurerm provider's own
 * schema and opens it as a PR — never touches model entries or
 * environments/<env>/main.tf (see the PR body it generates for the
 * required manual follow-up steps). Never auto-merges, same as every
 * other write route here.
 */
app.post("/scaffold-module/generate", requireApiKey, async (req: Request, res: Response) => {
  const { resourceType, fieldDescriptions, requesterId } = req.body ?? {};
  if (typeof resourceType !== "string" || !resourceType.trim()) {
    res.status(400).json({
      error: "body must be JSON: { resourceType: \"<azurerm_...>\", fieldDescriptions?: {name: description}, requesterId? }",
    });
    return;
  }
  try {
    const outcome = await scaffoldModule(
      resourceType,
      fieldDescriptions && typeof fieldDescriptions === "object" ? fieldDescriptions : undefined,
      typeof requesterId === "string" ? requesterId : undefined
    );
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Direct Azure Key Vault secret management — the only routes in this
 * backend that bypass the git/PR pipeline entirely. There is no Terraform
 * model change, no branch, no PR: a secret must never be committed, so it
 * is written straight to the real vault via the Key Vault REST API instead.
 * Because there is no PR review gate here, every write is scoped to vaults
 * already known to this repo (models/<env>/key-vault.json) and logged
 * (name only, never the value) via keyvault/audit.ts.
 */
app.get("/keyvault/list", requireApiKey, (_req: Request, res: Response) => {
  if (!isKeyVaultConfigured()) {
    res.status(503).json({
      error: "AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET are not configured on this server",
    });
    return;
  }
  const allowedEnvironments = (process.env.ALLOWED_ENVIRONMENTS ?? "dev")
    .split(",")
    .map((e) => e.trim());
  try {
    res.json({ vaults: listKeyVaults(allowedEnvironments) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/keyvault/:vaultName/secrets", requireApiKey, async (req: Request, res: Response) => {
  if (!isKeyVaultConfigured()) {
    res.status(503).json({
      error: "AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET are not configured on this server",
    });
    return;
  }
  const allowedEnvironments = (process.env.ALLOWED_ENVIRONMENTS ?? "dev")
    .split(",")
    .map((e) => e.trim());
  const vault = findKeyVaultByName(allowedEnvironments, String(req.params.vaultName));
  if (!vault) {
    res.status(404).json({ error: `Unknown key vault "${req.params.vaultName}"` });
    return;
  }
  try {
    const names = await listSecretNames(vault.vaultUri);
    res.json({ names });
  } catch (err) {
    res.status(502).json({ error: "Failed to list secrets from Azure Key Vault" });
  }
});

app.post("/keyvault/:vaultName/secrets", requireApiKey, async (req: Request, res: Response) => {
  if (!isKeyVaultConfigured()) {
    res.status(503).json({
      error: "AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET are not configured on this server",
    });
    return;
  }
  const { name, value, requesterId } = req.body ?? {};
  if (typeof name !== "string" || !isValidSecretName(name)) {
    res.status(400).json({
      error: "body.name must be a string matching Key Vault's naming rule: ^[0-9a-zA-Z-]{1,127}$",
    });
    return;
  }
  if (typeof value !== "string" || !value) {
    res.status(400).json({ error: "body.value must be a non-empty string" });
    return;
  }
  const allowedEnvironments = (process.env.ALLOWED_ENVIRONMENTS ?? "dev")
    .split(",")
    .map((e) => e.trim());
  const vault = findKeyVaultByName(allowedEnvironments, String(req.params.vaultName));
  if (!vault) {
    res.status(404).json({ error: `Unknown key vault "${req.params.vaultName}"` });
    return;
  }
  try {
    const result = await setSecret(vault.vaultUri, name, value);
    logSecretWrite({
      requesterId: typeof requesterId === "string" ? requesterId : undefined,
      vaultName: vault.name,
      secretName: name,
      action: "set",
    });
    res.json({ status: "ok", name: result.name, updatedOn: result.updatedOn });
  } catch (err) {
    res.status(502).json({ error: "Failed to write secret to Azure Key Vault" });
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
  console.log(`  POST /scaffold-module/generate - scaffold a new module + schema and open a PR, requires x-api-key`);
  console.log(`  GET  /keyvault/list                - known key vaults, requires x-api-key`);
  console.log(`  GET  /keyvault/:vaultName/secrets  - secret names only (never values), requires x-api-key`);
  console.log(`  POST /keyvault/:vaultName/secrets  - add/update a secret directly in Azure, requires x-api-key`);
});
