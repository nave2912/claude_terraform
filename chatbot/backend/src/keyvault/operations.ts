import { getSecretClient } from "./client.js";

/** Azure Key Vault's own secret-name naming rule. */
const SECRET_NAME_PATTERN = /^[0-9a-zA-Z-]{1,127}$/;

export function isValidSecretName(name: string): boolean {
  return SECRET_NAME_PATTERN.test(name);
}

export async function listSecretNames(vaultUri: string): Promise<string[]> {
  const client = getSecretClient(vaultUri);
  const names: string[] = [];
  for await (const props of client.listPropertiesOfSecrets()) {
    names.push(props.name);
  }
  return names;
}

/**
 * Azure Key Vault's setSecret call creates-or-updates identically — there is
 * no separate "create" vs "update" REST operation, which matches this
 * feature's add/update UI distinction being purely client-side convenience,
 * not two different backend code paths.
 */
export async function setSecret(
  vaultUri: string,
  name: string,
  value: string
): Promise<{ name: string; updatedOn: Date | undefined }> {
  const client = getSecretClient(vaultUri);
  const result = await client.setSecret(name, value);
  return { name: result.name, updatedOn: result.properties.updatedOn };
}
