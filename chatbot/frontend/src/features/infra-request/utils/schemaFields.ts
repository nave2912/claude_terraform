import type { EntrySchema, JsonSchemaProperty } from "@/types/schema";

/** One leaf field the form needs an input for. `path` supports one level of
 * nesting (e.g. ["tags", "owner"]) — matches the "entry -> flat props ->
 * one nested object (tags)" shape every schema in models/schema/ follows. */
export interface FlatField {
  path: string[];
  schema: JsonSchemaProperty;
  required: boolean;
}

/** Walks an entry schema's required fields into a flat input list, same
 * logic as the legacy static frontend's app.js buildFieldSteps(), just
 * flattened into one form instead of a sequential stepper. */
export function flattenSchemaFields(entrySchema: EntrySchema): FlatField[] {
  const fields: FlatField[] = [];
  for (const propName of entrySchema.required ?? []) {
    const propSchema = entrySchema.properties[propName];
    if (propSchema.type === "object" && propSchema.properties) {
      const nestedRequired = propSchema.required ?? Object.keys(propSchema.properties);
      for (const subName of nestedRequired) {
        fields.push({
          path: [propName, subName],
          schema: propSchema.properties[subName],
          required: true,
        });
      }
    } else {
      fields.push({ path: [propName], schema: propSchema, required: true });
    }
  }
  return fields;
}

/**
 * "__" instead of "." — react-hook-form treats dots (and brackets) in field
 * names as nested-path notation, which would silently split "tags.owner"
 * into values.tags.owner while a flat zod schema keyed "tags.owner" keeps
 * checking a top-level key that's always undefined. Using a separator RHF
 * doesn't special-case keeps the form's flat field map and the zod schema's
 * flat shape in agreement.
 */
export function fieldKey(path: string[]): string {
  return path.join("__");
}

export function humanLabel(path: string[]): string {
  return path
    .map((p) => p.replace(/_/g, " "))
    .join(" → ");
}

/**
 * Data-driven foreign-key detection: no resource type is named here.
 * Fields like storage-account's `resource_group_key` describe their target
 * in the schema itself — "Logical id of the resource group (key under
 * resource_groups in resource-group.json)" — so we parse that convention
 * instead of hardcoding "storage account knows about resource groups".
 * Adding a new cross-referencing field to any schema works automatically
 * as long as its description follows the same "key under X in Y.json"
 * phrasing documented in docs/json-model-guide.md.
 */
export function detectForeignKeyRef(schema: JsonSchemaProperty): { resourceType: string } | null {
  const match = schema.description?.match(/key under \S+ in ([\w-]+)\.json/);
  return match ? { resourceType: match[1] } : null;
}

/** Builds a nested { name: {...}, tags: {...} } object from flat form values. */
export function unflattenValues(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const path = key.split("__");
    let cur = result;
    for (let i = 0; i < path.length - 1; i++) {
      cur[path[i]] = (cur[path[i]] as Record<string, unknown>) ?? {};
      cur = cur[path[i]] as Record<string, unknown>;
    }
    cur[path[path.length - 1]] = value;
  }
  return result;
}
