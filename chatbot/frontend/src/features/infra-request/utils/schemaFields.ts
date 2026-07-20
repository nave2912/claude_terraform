import type { JsonSchemaProperty } from "@/types/schema";

export function humanLabel(name: string): string {
  return name.replace(/_/g, " ");
}

/**
 * Data-driven foreign-key detection: no resource type is named here.
 * Fields like storage-account's `resource_group_name` describe their target
 * in the schema itself — "Name of the resource group (must match the
 * \"name\" of an entry in resource-group.json)" — so we parse that
 * convention instead of hardcoding "storage account knows about resource
 * groups". Adding a new cross-referencing field to any schema works
 * automatically as long as its description follows the same
 * 'must match the "name" of an entry in X.json' phrasing.
 */
export function detectForeignKeyRef(schema: JsonSchemaProperty): { resourceType: string } | null {
  const match = schema.description?.match(/must match the "name" of an entry in ([\w-]+)\.json/);
  return match ? { resourceType: match[1] } : null;
}
