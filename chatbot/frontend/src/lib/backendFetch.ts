import { backendApiKey, backendBaseUrl } from "@/lib/serverEnv";

/**
 * Shared fetch wrapper for every src/app/api/backend/* Route Handler. Adds
 * the x-api-key header server-side so it never reaches the browser, and
 * normalizes non-OK responses into a thrown Error the route handlers turn
 * into a JSON error response with the same status code.
 */
export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${backendBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": backendApiKey(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}
