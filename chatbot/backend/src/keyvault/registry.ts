import fs from "node:fs";
import { modelFilePath } from "../config/paths.js";

export interface KeyVaultRegistryEntry {
  environment: string;
  /** The key inside the key_vaults map, e.g. "chatbot" */
  key: string;
  /** Real Azure Key Vault name, e.g. "kv-chatbot-naveenk" */
  name: string;
  resourceGroup: string;
  vaultUri: string;
}

/**
 * Flattens every models/<env>/key-vault.json for each allowed environment
 * into a flat list. Azure Key Vault names are globally unique and always
 * live at https://<name>.vault.azure.net (see modules/key_vault/main.tf),
 * so vaultUri can be derived here without a `terraform output` shellout.
 */
export function listKeyVaults(allowedEnvironments: string[]): KeyVaultRegistryEntry[] {
  const entries: KeyVaultRegistryEntry[] = [];

  for (const environment of allowedEnvironments) {
    const filePath = modelFilePath(environment, "key-vault");
    if (!fs.existsSync(filePath)) continue;

    const model = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
      key_vaults?: Record<string, { name: string; resource_group_name: string }>;
    };

    for (const [key, vault] of Object.entries(model.key_vaults ?? {})) {
      entries.push({
        environment,
        key,
        name: vault.name,
        resourceGroup: vault.resource_group_name,
        vaultUri: `https://${vault.name}.vault.azure.net`,
      });
    }
  }

  return entries;
}

export function findKeyVaultByName(
  allowedEnvironments: string[],
  vaultName: string
): KeyVaultRegistryEntry | undefined {
  return listKeyVaults(allowedEnvironments).find((v) => v.name === vaultName);
}
