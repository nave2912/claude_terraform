import fs from "node:fs";
import { modelFilePath } from "../config/paths.js";
import { getResourceType, validateModelFile } from "../validators/index.js";

export interface MergeResult {
  filePath: string;
  before: string | null;
  after: string;
  validation: { valid: boolean; errors: string[] };
}

/**
 * Merges a single validated entry into models/<environment>/<resourceType>.json,
 * generically — this never needs to know what a "resource group" or
 * "storage account" is, only that every model file is
 * `{ [containerKey]: { [key]: entry } }` per docs/json-model-guide.md.
 *
 * Does NOT write to disk — returns the before/after content so the caller
 * (gitprovider) can commit it via a PR, keeping this module side-effect-free
 * and easy to unit test.
 */
export function mergeEntry(
  resourceType: string,
  environment: string,
  key: string,
  fields: Record<string, unknown>
): MergeResult {
  const { containerKey } = getResourceType(resourceType);
  const filePath = modelFilePath(environment, resourceType);

  let existing: Record<string, unknown> = { [containerKey]: {} };
  let before: string | null = null;
  if (fs.existsSync(filePath)) {
    before = fs.readFileSync(filePath, "utf-8");
    existing = JSON.parse(before);
  }

  const container = (existing[containerKey] as Record<string, unknown>) ?? {};
  const merged = {
    ...existing,
    [containerKey]: {
      ...container,
      [key]: fields,
    },
  };

  const validation = validateModelFile(resourceType, merged);
  const after = JSON.stringify(merged, null, 2) + "\n";

  return { filePath, before, after, validation };
}
