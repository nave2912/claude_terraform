import fs from "node:fs";
import path from "node:path";
import { SCHEMA_DIR } from "./paths.js";

export interface JsonSchema {
  $id?: string;
  title?: string;
  description?: string;
  type: string;
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: unknown;
  [key: string]: unknown;
}

export interface ResourceTypeDefinition {
  /** e.g. "resource-group" — matches models/schema/<resourceType>.schema.json and models/<env>/<resourceType>.json */
  resourceType: string;
  /** e.g. "resource_groups" — the single top-level container key inside the model file */
  containerKey: string;
  schema: JsonSchema;
}

/**
 * Enumerates every models/schema/*.schema.json file and derives the
 * resource type + container key from convention, per docs/json-model-guide.md:
 *   - filename "<resource-type>.schema.json" -> resourceType "<resource-type>"
 *   - the schema's single top-level property is the container key
 *     (resource-group.schema.json -> "resource_groups", etc.)
 *
 * This is the mechanism that keeps the chatbot resource-type-agnostic: a
 * new module + schema file becomes usable here with zero code changes.
 */
export function loadResourceTypeRegistry(): ResourceTypeDefinition[] {
  const files = fs
    .readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith(".schema.json"));

  return files.map((file) => {
    const resourceType = file.replace(/\.schema\.json$/, "");
    const schema: JsonSchema = JSON.parse(
      fs.readFileSync(path.join(SCHEMA_DIR, file), "utf-8")
    );

    const containerKeys = Object.keys(schema.properties ?? {});
    if (containerKeys.length !== 1) {
      throw new Error(
        `Schema ${file} must have exactly one top-level property (the container key); found ${containerKeys.length}. ` +
          `This registry assumes the "one map per model file" convention from docs/json-model-guide.md.`
      );
    }

    return { resourceType, containerKey: containerKeys[0], schema };
  });
}
