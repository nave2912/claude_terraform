/**
 * Signed session-cookie helpers for the home page's login gate. Deliberately
 * lightweight (a single fixed username/password, no user database) — this
 * gates access to the Infrastructure Management and Observability
 * workspaces behind one shared credential, not per-user accounts.
 *
 * Uses Web Crypto (`crypto.subtle`) rather than Node's `crypto` module so
 * the same code runs unchanged in both a Route Handler (Node.js runtime)
 * and middleware.ts (Edge runtime) — Node's HMAC API isn't available on
 * Edge, Web Crypto is available on both.
 */

export const SESSION_COOKIE_NAME = "app_session";

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Signs `username` with `secret` — the cookie value proves the server (not
 * a client editing document.cookie) issued it, without needing a session
 * store. `secret` is BACKEND_API_KEY, reused rather than adding a
 * dedicated signing secret: it's already a per-deployment, server-only
 * value with no other client-facing exposure. */
export async function createSessionToken(username: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(username));
  return `${username}.${toHex(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<{ valid: boolean; username?: string }> {
  if (!token) return { valid: false };
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return { valid: false };
  const username = token.slice(0, dotIndex);
  const expected = await createSessionToken(username, secret);
  return expected === token ? { valid: true, username } : { valid: false };
}
