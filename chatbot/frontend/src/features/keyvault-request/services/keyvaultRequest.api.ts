import type {
  KeyVaultListResponse,
  KeyVaultSecretsResponse,
  KeyVaultSetSecretOutcome,
} from "@/types/schema";

/**
 * Every call here hits this Next.js app's own /api/backend/keyvault/* Route
 * Handlers (never the Express backend directly from the browser), same
 * convention as infraRequest.api.ts. Unlike that file, nothing here ever
 * goes through git/PR — these calls write straight to a real Azure Key
 * Vault the moment setSecret() resolves.
 */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request to ${path} failed with ${res.status}`);
  }
  return body as T;
}

export const keyvaultRequestApi = {
  listVaults: () => requestJson<KeyVaultListResponse>("/api/backend/keyvault/list"),

  listSecrets: (vaultName: string) =>
    requestJson<KeyVaultSecretsResponse>(
      `/api/backend/keyvault/${encodeURIComponent(vaultName)}/secrets`
    ),

  setSecret: (vaultName: string, name: string, value: string, requesterId?: string) =>
    requestJson<KeyVaultSetSecretOutcome>(
      `/api/backend/keyvault/${encodeURIComponent(vaultName)}/secrets`,
      {
        method: "POST",
        body: JSON.stringify({ name, value, requesterId }),
      }
    ),
};
