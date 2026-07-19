import { z } from "zod";
import type { FlatField } from "./schemaFields";
import { fieldKey } from "./schemaFields";

/**
 * Turns the flattened JSON-Schema fields into a zod object schema so
 * react-hook-form can validate client-side before anything is sent to
 * /preview-structured. This is a client-side convenience layer only — the
 * backend re-validates with ajv against the real schema regardless, so a
 * gap here is a UX annoyance, not a safety hole.
 */
export function buildZodSchema(fields: FlatField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let schema: z.ZodTypeAny;
    if (field.schema.enum) {
      schema = z.enum(field.schema.enum as [string, ...string[]]);
    } else {
      let str = z.string();
      if (field.schema.minLength) {
        str = str.min(field.schema.minLength, `Must be at least ${field.schema.minLength} characters`);
      } else {
        str = str.min(1, "Required");
      }
      if (field.schema.pattern) {
        str = str.regex(new RegExp(field.schema.pattern), `Must match pattern: ${field.schema.pattern}`);
      }
      schema = str;
    }
    shape[fieldKey(field.path)] = schema;
  }

  return z.object(shape);
}
