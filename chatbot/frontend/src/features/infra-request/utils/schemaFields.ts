import type { JsonSchemaProperty } from "@/types/schema";

export function humanLabel(name: string): string {
  return name.replace(/_/g, " ");
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
