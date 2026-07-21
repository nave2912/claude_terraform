import type { TerraformBlock } from "./providerSchema.js";

/**
 * Turns one provider-schema `block` (attributes + nested block_types) into
 * a flat, normalized field list shared by both the chat "plan" summary
 * (planPrompt.ts) and the deterministic file generators
 * (generators/*.ts) — so what the user is shown as "mandatory/optional"
 * is guaranteed to be exactly what ends up in the generated
 * variables.tf/schema, not a second, independently-derived description of
 * it.
 */

export interface FieldSpec {
  name: string;
  /** HCL type expression, e.g. "string", "list(string)", "object({ ... })". */
  hclType: string;
  required: boolean;
  description?: string;
  /** Only set for fields derived from a nested block_type. */
  nesting?: "single" | "list" | "set" | "map";
  /** Only set alongside `nesting` — the inner block's own fields, so
   * generators can emit a real nested block/dynamic block instead of a
   * flat `= var.x` assignment. */
  nestedFields?: FieldSpec[];
}

/** Depth cap so a deeply/recursively nested provider schema (rare, but they
 * exist) can't blow up generation into something unreviewable. Fields past
 * this depth collapse to a generic `map(string)` escape hatch instead of
 * being silently dropped. */
const MAX_DEPTH = 3;

function terraformTypeToHcl(type: unknown, depth: number): string {
  if (typeof type === "string") {
    if (type === "string" || type === "number" || type === "bool") return type;
    return "string";
  }
  if (Array.isArray(type)) {
    const [kind, inner] = type;
    if (depth >= MAX_DEPTH) return "string";
    if (kind === "list") return `list(${terraformTypeToHcl(inner, depth + 1)})`;
    if (kind === "set") return `set(${terraformTypeToHcl(inner, depth + 1)})`;
    if (kind === "map") return `map(${terraformTypeToHcl(inner, depth + 1)})`;
    if (kind === "object" && inner && typeof inner === "object") {
      const attrs = Object.entries(inner as Record<string, unknown>)
        .map(([k, v]) => `${k} = ${terraformTypeToHcl(v, depth + 1)}`)
        .join(", ");
      return `object({ ${attrs} })`;
    }
    if (kind === "tuple") return "list(string)";
  }
  return "string";
}

function extractBlock(block: TerraformBlock, depth: number): FieldSpec[] {
  const fields: FieldSpec[] = [];

  for (const [name, attr] of Object.entries(block.attributes ?? {})) {
    // `id` is always excluded, even when the provider marks it
    // optional+computed (observed on some resources, e.g. to support
    // `import { id = ... }` blocks) — it must never become a settable
    // `variable`/resource argument; it's always a pure output.
    if (name === "id") continue;

    // Purely computed attributes (no required/optional) are outputs, not
    // configurable inputs. Skip them here; extractComputedAttributes
    // (called separately, via the same provider schema) surfaces those.
    if (!attr.required && !attr.optional) continue;

    fields.push({
      name,
      hclType: terraformTypeToHcl(attr.type, depth),
      required: Boolean(attr.required),
      description: attr.description,
    });
  }

  for (const [name, blockType] of Object.entries(block.block_types ?? {})) {
    if (depth >= MAX_DEPTH) {
      fields.push({ name, hclType: "map(string)", required: false, nesting: blockType.nesting_mode });
      continue;
    }
    const nestedFields = extractBlock(blockType.block, depth + 1);
    const objectType = `object({ ${nestedFields
      .map((f) => `${f.name} = ${f.hclType}`)
      .join(", ")} })`;
    const required = (blockType.min_items ?? 0) > 0;

    if (blockType.nesting_mode === "single") {
      fields.push({ name, hclType: objectType, required, nesting: "single", nestedFields });
    } else {
      fields.push({
        name,
        hclType: `list(${objectType})`,
        required,
        nesting: blockType.nesting_mode,
        nestedFields,
      });
    }
  }

  return fields;
}

export function extractFields(block: TerraformBlock): FieldSpec[] {
  return extractBlock(block, 0);
}

/** Computed-only attributes (id, and anything else the provider fills in
 * after apply) — candidates for outputs.tf. */
export function extractComputedAttributes(block: TerraformBlock): string[] {
  return Object.entries(block.attributes ?? {})
    .filter(([, attr]) => attr.computed && !attr.required && !attr.optional)
    .map(([name]) => name);
}
