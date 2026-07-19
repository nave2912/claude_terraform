import { z } from "zod";
import type { JsonSchemaProperty } from "@/types/schema";
import { classifyField, isDeepEmpty, tryParseJson } from "./schemaTree";

/**
 * Recursively mirrors classifyField's dispatch (schemaTree.ts) into a zod
 * schema, so client-side validation always agrees with how a field is
 * actually rendered — a group-table's fields validate as a nested object,
 * an array-object-table validates as an array of objects, etc. This is a
 * convenience layer only: the backend re-validates the final payload with
 * ajv against the real JSON Schema regardless, so a gap here is a UX
 * annoyance, not a safety hole.
 *
 * Every leaf is a string in form state (even numbers/raw-json — kept as
 * text for simple, consistent <Input> binding) and converted to its real
 * type later by schemaTree.ts's coerceSubmissionValue. Optional leaves
 * accept "" so a genuinely blank field never fails validation just for
 * being empty; they still enforce pattern/enum/etc. the moment something
 * is typed.
 */
export function buildFieldZodSchema(schema: JsonSchemaProperty, required: boolean): z.ZodTypeAny {
  const kind = classifyField(schema);

  switch (kind.kind) {
    case "boolean":
      return z.boolean();

    case "number": {
      const str = z.string().regex(/^-?\d+(\.\d+)?$/, "Must be a number");
      return required ? str.min(1, "Required") : z.union([z.literal(""), str]);
    }

    case "enum": {
      const base = z.enum(kind.options as [string, ...string[]]);
      return required ? base : z.union([z.literal(""), base]);
    }

    case "string": {
      let str = z.string();
      if (schema.minLength) str = str.min(schema.minLength, `Must be at least ${schema.minLength} characters`);
      else if (required) str = str.min(1, "Required");
      if (schema.pattern) str = str.regex(new RegExp(schema.pattern), `Must match pattern: ${schema.pattern}`);
      return required ? str : z.union([z.literal(""), str]);
    }

    case "raw-json": {
      const str = z.string().refine((v) => v === "" || tryParseJson(v).ok, "Must be valid JSON");
      return required ? str.min(1, "Required") : str;
    }

    case "group-table":
    case "nested-object": {
      const strict = buildObjectZodSchema(kind.schema);
      if (required) return strict;
      // Optional whole-object: untouched (every leaf blank) passes without
      // triggering this object's own internal required-field checks; a
      // partially-filled optional object still enforces them normally.
      return z.any().superRefine((value, ctx) => {
        if (isDeepEmpty(value)) return;
        const result = strict.safeParse(value);
        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
          }
        }
      });
    }

    case "map-object":
      return z.record(z.string(), buildFieldZodSchema(kind.valueSchema, true));

    case "array-primitive":
      return z.array(buildFieldZodSchema(kind.itemSchema, true));

    case "array-object-table":
      return z.array(buildObjectZodSchema(kind.itemSchema));
  }
}

export function buildObjectZodSchema(schema: JsonSchemaProperty): z.ZodTypeAny {
  const required = schema.required ?? [];
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, propSchema] of Object.entries(schema.properties ?? {})) {
    shape[name] = buildFieldZodSchema(propSchema, required.includes(name));
  }
  return z.object(shape);
}

/** Entry point — the resource's per-entry schema (name/location/tags/...). */
export function buildZodSchema(entrySchema: JsonSchemaProperty) {
  return buildObjectZodSchema(entrySchema);
}
