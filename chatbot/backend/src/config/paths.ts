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

export function modelFilePath(environment: string, resourceType: string): string {
  return path.join(MODELS_DIR, environment, `${resourceType}.json`);
}

export function schemaFilePath(resourceType: string): string {
  return path.join(SCHEMA_DIR, `${resourceType}.schema.json`);
}
