import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../../config/paths.js";
import { loadResourceTypeRegistry } from "../../config/schemaRegistry.js";
import { formatHcl } from "../terraformFmt.js";

function moduleNameFor(resourceType: string): string {
  return resourceType.replace(/-/g, "_");
}

function mainTfPath(environment: string): string {
  return path.join(REPO_ROOT, "environments", environment, "main.tf");
}

/** True if environments/<env>/main.tf already has a `module "<moduleName>"` block. */
export function isModuleWired(mainTfContent: string, moduleName: string): boolean {
  return new RegExp(`module\\s+"${moduleName}"\\s*\\{`).test(mainTfContent);
}

/**
 * A resource type having a module + schema (whether hand-authored or
 * /tfmodules-scaffolded) is not enough to make it deployable — Terraform
 * only picks up models/<env>/<resourceType>.json once
 * environments/<env>/main.tf has a matching `locals { ..._model =
 * jsondecode(...) }` + `module "<name>" { for_each = ... }` block (see
 * ARCHITECTURE.md §10 step 5). That wiring used to be a manual, easy-to-miss
 * step done once per resource type. This generates it automatically the
 * first time an entry for that resource type is proposed, so the same gap
 * doesn't recur for every future resource type.
 *
 * Returns null if the module is already wired (checked directly against
 * main.tf's own content, not any registry/cache) or the environment has no
 * main.tf — callers then commit only the model-entry file, same as before.
 */
export function ensureEnvironmentWiring(
  resourceType: string,
  environment: string
): { filePath: string; content: string } | null {
  const filePath = mainTfPath(environment);
  if (!fs.existsSync(filePath)) return null;

  const moduleName = moduleNameFor(resourceType);
  const current = fs.readFileSync(filePath, "utf-8");
  if (isModuleWired(current, moduleName)) return null;

  const registryEntry = loadResourceTypeRegistry().find((r) => r.resourceType === resourceType);
  if (!registryEntry) return null;

  const containerKey = registryEntry.containerKey;
  const entrySchema = (registryEntry.schema.properties as Record<string, any> | undefined)?.[
    containerKey
  ]?.additionalProperties as { properties?: Record<string, unknown>; required?: string[] } | undefined;
  const properties = entrySchema?.properties ?? {};
  const required = entrySchema?.required ?? [];
  const hasResourceGroup = "resource_group_name" in properties;

  const extraFields = Object.keys(properties).filter(
    (f) => !["name", "location", "resource_group_name", "tags"].includes(f)
  );

  const lines: string[] = [`  name                = each.value.name`];
  if (hasResourceGroup) {
    lines.push(
      `  location            = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location`,
      `  resource_group_name = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name`
    );
  } else if ("location" in properties) {
    lines.push(`  location            = each.value.location`);
  }
  for (const field of extraFields) {
    const accessor = required.includes(field) ? `each.value.${field}` : `try(each.value.${field}, null)`;
    lines.push(`  ${field} = ${accessor}`);
  }
  if ("tags" in properties) {
    lines.push(`  tags = each.value.tags`);
  }

  const snippet =
    `\nlocals {\n` +
    `  ${moduleName}_model = jsondecode(file("\${path.module}/../../models/\${var.environment}/${resourceType}.json"))\n` +
    `}\n\n` +
    `module "${moduleName}" {\n` +
    `  source = "../../modules/${moduleName}"\n\n` +
    `  for_each = local.${moduleName}_model.${containerKey}\n\n` +
    lines.join("\n") +
    `\n}\n`;

  const updated = current.trimEnd() + "\n" + snippet;
  return { filePath, content: formatHcl(updated) };
}
