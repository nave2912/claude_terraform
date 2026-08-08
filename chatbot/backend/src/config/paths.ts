import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * All paths here are computed relative to this file's location so the
 * backend can be run from anywhere and still find the Terraform repo root
 * (chatbot/backend/src/config -> repo root is four levels up).
 */
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
export const MODELS_DIR = path.join(REPO_ROOT, "models");
export const SCHEMA_DIR = path.join(MODELS_DIR, "schema");
export const MODULES_DIR = path.join(REPO_ROOT, "modules");

export function modelFilePath(environment: string, resourceType: string): string {
  return path.join(MODELS_DIR, environment, `${resourceType}.json`);
}

export function schemaFilePath(resourceType: string): string {
  return path.join(SCHEMA_DIR, `${resourceType}.schema.json`);
}

/**
 * Every environment this chatbot instance can propose changes against —
 * derived from the models/<env>/ subdirectories that actually exist on
 * disk, excluding models/schema/ (JSON Schema contracts, not
 * per-environment instance data). Not a separately-maintained allowlist:
 * adding environments/<newenv>/ + models/<newenv>/*.json to the repo makes
 * that environment selectable here with zero config changes, matching the
 * rest of this repo's "JSON models are the source of truth" design.
 */
export function listAvailableEnvironments(): string[] {
  return fs
    .readdirSync(MODELS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "schema")
    .map((entry) => entry.name)
    .sort();
}
