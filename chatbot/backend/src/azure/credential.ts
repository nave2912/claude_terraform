import { ClientSecretCredential } from "@azure/identity";

/**
 * Read-only Azure Resource Manager access for the Observability tabs (cost,
 * activity log) — see src/observability. Entirely separate from
 * gitprovider/modelwriter, which remain the only things that ever change
 * what's actually deployed; nothing under src/observability writes to
 * Azure or to this repo.
 */

let cachedCredential: ClientSecretCredential | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set (see .env.example) — required for /observability/* routes.`);
  }
  return value;
}

export function azureCredential(): ClientSecretCredential {
  if (!cachedCredential) {
    cachedCredential = new ClientSecretCredential(
      requireEnv("AZURE_TENANT_ID"),
      requireEnv("AZURE_CLIENT_ID"),
      requireEnv("AZURE_CLIENT_SECRET")
    );
  }
  return cachedCredential;
}

export function azureSubscriptionId(): string {
  return requireEnv("AZURE_SUBSCRIPTION_ID");
}
