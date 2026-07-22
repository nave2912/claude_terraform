import { ClientSecretCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

/**
 * True only if all three Azure service-principal env vars are set. The
 * server itself must not refuse to start if these are missing — only the
 * /keyvault/* routes depend on them (see server.ts, which returns 503 from
 * those routes when this is false instead of crashing on startup).
 */
export function isKeyVaultConfigured(): boolean {
  return Boolean(
    process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET
  );
}

let credential: ClientSecretCredential | undefined;
const clientsByVaultUri = new Map<string, SecretClient>();

function getCredential(): ClientSecretCredential {
  if (!credential) {
    credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID!,
      process.env.AZURE_CLIENT_ID!,
      process.env.AZURE_CLIENT_SECRET!
    );
  }
  return credential;
}

export function getSecretClient(vaultUri: string): SecretClient {
  let client = clientsByVaultUri.get(vaultUri);
  if (!client) {
    client = new SecretClient(vaultUri, getCredential());
    clientsByVaultUri.set(vaultUri, client);
  }
  return client;
}
