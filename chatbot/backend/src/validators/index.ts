import { Ajv, type ErrorObject } from "ajv";
import {
  loadResourceTypeRegistry,
  type ResourceTypeDefinition,
} from "../config/schemaRegistry.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
const registry = loadResourceTypeRegistry();
const byResourceType = new Map<string, ResourceTypeDefinition>(
  registry.map((r) => [r.resourceType, r])
);

export function listResourceTypes(): ResourceTypeDefinition[] {
  return registry;
}

export function getResourceType(resourceType: string): ResourceTypeDefinition {
  const def = byResourceType.get(resourceType);
  if (!def) {
    throw new Error(
      `Unknown resource type "${resourceType}". Known types: ${[...byResourceType.keys()].join(", ")}`
    );
  }
  return def;
}

/**
 * Validates a full model-file payload (e.g. { resource_groups: { primary: {...} } })
 * against its schema. Same semantics as tests/policy/validate_models.py —
 * both must stay in sync since they validate the same files.
 */
export function validateModelFile(
  resourceType: string,
  payload: unknown
): ValidationResult {
  const { schema } = getResourceType(resourceType);
  const validate = ajv.compile(schema);
  const valid = validate(payload) as boolean;
  return {
    valid,
    errors: valid ? [] : formatErrors(validate.errors ?? []),
  };
}

/**
 * Validates a single candidate entry (e.g. one resource_groups.<key> value)
 * against the schema's per-entry shape (schema.properties[containerKey].additionalProperties),
 * without requiring a full model file. This is what the intent parser uses
 * to check LLM output before it's merged into a file.
 */
export function validateEntry(
  resourceType: string,
  entry: unknown
): ValidationResult {
  const { schema, containerKey } = getResourceType(resourceType);
  const containerSchema = (schema.properties as Record<string, any>)[containerKey];
  const entrySchema = containerSchema?.additionalProperties;
  if (!entrySchema || typeof entrySchema !== "object") {
    throw new Error(
      `Schema for "${resourceType}" does not define a per-entry shape under ${containerKey}.additionalProperties.`
    );
  }
  const validate = ajv.compile(entrySchema);
  const valid = validate(entry) as boolean;
  return {
    valid,
    errors: valid ? [] : formatErrors(validate.errors ?? []),
  };
}

function formatErrors(errors: ErrorObject[]): string[] {
  return errors.map((e) => {
    const location = e.instancePath || "<root>";
    return `${location}: ${e.message}`;
  });
}
