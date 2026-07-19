import type { JsonSchemaProperty } from "@/types/schema";

/**
 * How one schema node should be rendered. This is the single place that
 * decides "form input vs. table vs. raw JSON editor" for any JSON Schema
 * shape — every rendering component and the zod-schema builder both
 * dispatch off this, so the two can never disagree about a field's shape.
 *
 * The fallback is deliberate, not a cop-out: JSON Schema can describe
 * shapes (arrays of arrays, polymorphic/oneOf items, untyped "any" values)
 * that don't have a sane bespoke widget — every production schema-form
 * tool (react-jsonschema-form, uniforms, etc.) falls back to a raw editor
 * at some depth too. Real Terraform module variables essentially never
 * need that fallback; test/stress-test JSON does.
 */
export type FieldKind =
  | { kind: "string" }
  | { kind: "enum"; options: string[] }
  | { kind: "boolean" }
  | { kind: "number" }
  | { kind: "group-table"; schema: JsonSchemaProperty }
  | { kind: "nested-object"; schema: JsonSchemaProperty }
  | { kind: "map-object"; valueSchema: JsonSchemaProperty }
  | { kind: "array-primitive"; itemSchema: JsonSchemaProperty }
  | { kind: "array-object-table"; itemSchema: JsonSchemaProperty }
  | { kind: "raw-json" };

export function isPrimitiveLeaf(schema: JsonSchemaProperty): boolean {
  if (schema.enum) return true;
  return schema.type === "string" || schema.type === "number" || schema.type === "integer" || schema.type === "boolean";
}

export function classifyField(schema: JsonSchemaProperty): FieldKind {
  if (schema.enum) return { kind: "enum", options: schema.enum };
  if (schema.type === "boolean") return { kind: "boolean" };
  if (schema.type === "number" || schema.type === "integer") return { kind: "number" };

  if (schema.type === "array") {
    const items = schema.items;
    if (!items) return { kind: "raw-json" };
    if (isPrimitiveLeaf(items)) return { kind: "array-primitive", itemSchema: items };
    if (items.type === "object" && items.properties && Object.values(items.properties).every(isPrimitiveLeaf)) {
      return { kind: "array-object-table", itemSchema: items };
    }
    // array of arrays, polymorphic (oneOf/anyOf) items, or items with their
    // own nested object/array children — no sane fixed set of columns.
    return { kind: "raw-json" };
  }

  if (schema.type === "object" || schema.properties || schema.additionalProperties) {
    if (schema.properties && Object.keys(schema.properties).length > 0) {
      const allPrimitive = Object.values(schema.properties).every(isPrimitiveLeaf);
      return allPrimitive ? { kind: "group-table", schema } : { kind: "nested-object", schema };
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      return { kind: "map-object", valueSchema: schema.additionalProperties };
    }
    return { kind: "raw-json" }; // empty object, or additionalProperties: true with no shape
  }

  if (schema.type === "string" || schema.type === undefined) return { kind: "string" };

  return { kind: "raw-json" }; // e.g. type: "null", or genuinely unrecognized
}

/** Recursively finds every leaf enum field literally named `targetName`
 * anywhere under `schema` (only descending into plain nested objects, not
 * arrays/maps, which have no single instance to sync) — used to keep a
 * field like `tags.environment` in step with the top-level environment
 * selector without hardcoding that exact path. */
export function findEnumFieldPaths(schema: JsonSchemaProperty, targetName: string, prefix: string[] = []): string[] {
  const paths: string[] = [];
  for (const [name, propSchema] of Object.entries(schema.properties ?? {})) {
    const path = [...prefix, name];
    const kind = classifyField(propSchema);
    if (name === targetName && kind.kind === "enum") {
      paths.push(path.join("."));
    } else if (kind.kind === "group-table" || kind.kind === "nested-object") {
      paths.push(...findEnumFieldPaths(kind.schema, targetName, path));
    }
  }
  return paths;
}

/** True if every leaf under `value` is blank ("" / false / empty array /
 * empty object) — used so an optional nested object left entirely untouched
 * doesn't trip its own internal required-field checks (see buildZodSchema's
 * group-table/nested-object case). A partially-filled optional object still
 * enforces its own required fields normally; this only exempts "untouched". */
export function isDeepEmpty(value: unknown): boolean {
  if (value === "" || value === undefined || value === null || value === false) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value).every(isDeepEmpty);
  return false;
}

export function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** Builds a fully-shaped default value tree for a schema node — objects
 * get every property pre-populated (so nested-object/group-table always
 * have something to bind to), arrays/maps default empty (user adds rows),
 * leaves default to the schema's own `default` or "". */
export function buildDefaultValue(schema: JsonSchemaProperty, opts: { name?: string; defaultEnvironment?: string } = {}): unknown {
  const kind = classifyField(schema);
  switch (kind.kind) {
    case "group-table":
    case "nested-object": {
      const obj: Record<string, unknown> = {};
      for (const [name, propSchema] of Object.entries(kind.schema.properties ?? {})) {
        obj[name] = buildDefaultValue(propSchema, { name, defaultEnvironment: opts.defaultEnvironment });
      }
      return obj;
    }
    case "map-object":
      return {};
    case "array-primitive":
    case "array-object-table":
      return [];
    case "boolean":
      return false;
    case "enum":
      if (opts.name === "environment" && opts.defaultEnvironment && kind.options.includes(opts.defaultEnvironment)) {
        return opts.defaultEnvironment;
      }
      return (schema.default as string | undefined) ?? "";
    default:
      return (schema.default as string | undefined) ?? "";
  }
}

/**
 * Converts the form's (string-leaf-based, for simple/consistent input
 * binding) nested value tree into the properly-typed JSON payload the
 * backend expects — numbers become real numbers, raw-json leaves get
 * JSON.parse'd, and blank optional values are omitted entirely rather
 * than sent as "" (so schema defaults apply, and required-field gaps
 * surface as real validation errors instead of silently-wrong values).
 */
export function coerceSubmissionValue(schema: JsonSchemaProperty, value: unknown, required: boolean): unknown {
  const kind = classifyField(schema);

  switch (kind.kind) {
    case "boolean":
      return Boolean(value);

    case "number": {
      if (value === "" || value === undefined || value === null) return required ? undefined : undefined;
      const n = Number(value);
      return Number.isNaN(n) ? undefined : n;
    }

    case "string":
    case "enum": {
      if (typeof value !== "string" || value === "") return undefined;
      return value;
    }

    case "raw-json": {
      if (typeof value !== "string" || value === "") return undefined;
      const parsed = tryParseJson(value);
      return parsed.ok ? parsed.value : undefined;
    }

    case "group-table":
    case "nested-object": {
      const record = (value as Record<string, unknown>) ?? {};
      const propRequired = kind.schema.required ?? [];
      const out: Record<string, unknown> = {};
      for (const [name, propSchema] of Object.entries(kind.schema.properties ?? {})) {
        const coerced = coerceSubmissionValue(propSchema, record[name], propRequired.includes(name));
        if (coerced !== undefined) out[name] = coerced;
      }
      if (Object.keys(out).length === 0 && !required) return undefined;
      return out;
    }

    case "map-object": {
      const record = (value as Record<string, unknown>) ?? {};
      const out: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(record)) {
        if (!key) continue;
        const coerced = coerceSubmissionValue(kind.valueSchema, entry, true);
        if (coerced !== undefined) out[key] = coerced;
      }
      if (Object.keys(out).length === 0 && !required) return undefined;
      return out;
    }

    case "array-primitive": {
      const arr = Array.isArray(value) ? value : [];
      const out = arr
        .map((v) => coerceSubmissionValue(kind.itemSchema, v, true))
        .filter((v) => v !== undefined);
      if (out.length === 0 && !required) return undefined;
      return out;
    }

    case "array-object-table": {
      const arr = Array.isArray(value) ? value : [];
      const itemRequired = kind.itemSchema.required ?? [];
      const out = arr.map((row) => {
        const record = (row as Record<string, unknown>) ?? {};
        const rowOut: Record<string, unknown> = {};
        for (const [name, propSchema] of Object.entries(kind.itemSchema.properties ?? {})) {
          const coerced = coerceSubmissionValue(propSchema, record[name], itemRequired.includes(name));
          if (coerced !== undefined) rowOut[name] = coerced;
        }
        return rowOut;
      });
      if (out.length === 0 && !required) return undefined;
      return out;
    }
  }
}
