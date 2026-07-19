/**
 * Server-only environment access. Every function here throws loudly if the
 * variable is missing rather than falling back to a default — this backend
 * connection can write files and push git branches, so failing closed
 * matters more than convenience. Only ever import this from Route Handlers
 * (src/app/api/**) or other server-side code — never from a Client
 * Component, or these values end up in the browser bundle.
 */
export function backendBaseUrl(): string {
  const value = process.env.BACKEND_BASE_URL;
  if (!value) throw new Error("BACKEND_BASE_URL is not set (see .env.example).");
  return value.replace(/\/$/, "");
}

export function backendApiKey(): string {
  const value = process.env.BACKEND_API_KEY;
  if (!value) throw new Error("BACKEND_API_KEY is not set (see .env.example).");
  return value;
}

export function anthropicApiKey(): string {
  const value = process.env.ANTHROPIC_API_KEY;
  if (!value) throw new Error("ANTHROPIC_API_KEY is not set (see .env.example).");
  return value;
}
