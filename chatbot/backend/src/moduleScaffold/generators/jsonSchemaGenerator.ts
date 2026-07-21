import type { FieldSpec } from "../fieldExtraction.js";

/**
 * Emits models/schema/<resource-name>.schema.json, mirroring
 * resource-group.schema.json's shape exactly: a container object
 * (`additionalProperties: false`) keyed by a stable logical id, each entry
 * requiring the same standard fields (name/location/resource_group_name/
 * tags, whichever the resource type actually supports) plus every other
 * mandatory field from the provider schema, with the same 5-key tags
 * sub-schema copied verbatim. Pure function — mirrors hclGenerator's field
 * handling 1:1 so the schema always matches the generated variables.tf.
 */

const STANDARD_PROPERTIES: Record<string, unknown> = {
  name: {
    type: "string",
    pattern: "^[a-z][a-z0-9-]*$",
    description: "Must follow naming convention: <workload>-<env> (lowercase, hyphen-separated)",
  },
  location: { type: "string", minLength: 3 },
  resource_group_name: {
    type: "string",
    minLength: 1,
    description: "Must match the \"name\" of an entry in resource-group.json.",
  },
  tags: {
    type: "object",
    required: ["environment", "owner", "costCenter", "application", "dataClassification"],
    properties: {
      environment: { type: "string", enum: ["dev", "qa", "prod"] },
      owner: { type: "string", minLength: 1 },
      costCenter: { type: "string", minLength: 1 },
      application: { type: "string", minLength: 1 },
      dataClassification: {
        type: "string",
        enum: ["public", "internal", "confidential", "restricted"],
      },
    },
    additionalProperties: true,
  },
};

const STANDARD_FIELD_ORDER = ["name", "location", "resource_group_name", "tags"];

function hclTypeToJsonSchema(hclType: string): Record<string, unknown> {
  if (hclType === "string") return { type: "string" };
  if (hclType === "number") return { type: "number" };
  if (hclType === "bool") return { type: "boolean" };

  const listOrSet = hclType.match(/^(?:list|set)\((.*)\)$/s);
  if (listOrSet) return { type: "array", items: hclTypeToJsonSchema(listOrSet[1]) };

  const map = hclType.match(/^map\((.*)\)$/s);
  if (map) return { type: "object", additionalProperties: hclTypeToJsonSchema(map[1]) };

  // object({...}) or anything unrecognized: fall back to an open object —
  // a reviewer can tighten this once the module's real usage is known.
  return { type: "object", additionalProperties: true };
}

function fieldToJsonSchema(field: FieldSpec): Record<string, unknown> {
  if (field.nesting) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const nested of field.nestedFields ?? []) {
      properties[nested.name] = fieldToJsonSchema(nested);
      if (nested.required) required.push(nested.name);
    }
    const objectSchema: Record<string, unknown> = {
      type: "object",
      properties,
      additionalProperties: true,
      ...(required.length ? { required } : {}),
    };
    if (field.nesting === "single") return objectSchema;
    return { type: "array", items: objectSchema };
  }

  const base = hclTypeToJsonSchema(field.hclType);
  return field.description ? { ...base, description: field.description } : base;
}

export interface GenerateSchemaFileParams {
  moduleName: string;
  containerKey: string;
  mandatoryFields: FieldSpec[];
  optionalFields: FieldSpec[];
}

export function generateSchemaFile(params: GenerateSchemaFileParams): string {
  const { moduleName, containerKey, mandatoryFields, optionalFields } = params;

  const combined = [...mandatoryFields, ...optionalFields];
  const byName = new Map(combined.map((f) => [f.name, f]));
  const supportedStandardFields = STANDARD_FIELD_ORDER.filter((n) => byName.has(n));
  const genericFields = combined.filter((f) => !STANDARD_FIELD_ORDER.includes(f.name));

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const name of supportedStandardFields) {
    properties[name] = STANDARD_PROPERTIES[name];
    required.push(name);
  }
  for (const field of genericFields) {
    properties[field.name] = fieldToJsonSchema(field);
    if (field.required) required.push(field.name);
  }

  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `https://internal/schemas/${moduleName.replace(/_/g, "-")}.schema.json`,
    title: `${moduleName} Model`,
    description: `AI-scaffolded schema for JSON-driven ${moduleName} definitions — verify field constraints before use.`,
    type: "object",
    required: [containerKey],
    additionalProperties: false,
    properties: {
      [containerKey]: {
        type: "object",
        description: "Map keyed by a stable logical id. The key becomes the for_each key in Terraform.",
        minProperties: 1,
        additionalProperties: {
          type: "object",
          required,
          additionalProperties: false,
          properties,
        },
      },
    },
  };

  return JSON.stringify(schema, null, 2) + "\n";
}
