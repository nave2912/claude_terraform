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

app.listen(PORT, () => {
  console.log(`chatbot backend listening on http://localhost:${PORT}`);
  console.log(`  GET  /health   - no auth`);
  console.log(`  POST /chat     - preview only, requires x-api-key`);
  console.log(`  POST /propose  - full pipeline through PR, requires x-api-key`);
});
