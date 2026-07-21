/** Shared naming derivations so the module folder name, schema filename,
 * schema container key, and generated resource label all agree with each
 * other and with the rest of the repo's conventions (e.g.
 * resource_group -> resource_groups container key, resource-group.schema.json). */

export function deriveModuleName(resourceType: string): string {
  return resourceType.replace(/^azurerm_/, "");
}

export function toHyphenated(moduleName: string): string {
  return moduleName.replace(/_/g, "-");
}

/** Naive pluralization matching every existing container key in this repo
 * (resource_group -> resource_groups, storage_account -> storage_accounts,
 * key_vault -> key_vaults) — always just append "s". */
export function pluralize(moduleName: string): string {
  return moduleName.endsWith("s") ? moduleName : `${moduleName}s`;
}
