/**
 * Signed, single-use access tokens for the home page's login gate.
 * Deliberately lightweight (one fixed username/password, no user database,
 * no ongoing session) — logging in proves you know the credential and buys
 * exactly one page load of one specific workspace (`target`, e.g.
 * "/infra"). Every other workspace still needs its own login, and a
 * refresh of the same page needs it again too: proxy.ts deletes the cookie
 * the moment it's used, so there is nothing left to reuse.
 *
 * Uses Web Crypto (`crypto.subtle`) rather than Node's `crypto` module so
 * the same code runs unchanged in both a Route Handler and proxy.ts —
 * Web Crypto works in both, without needing to reason about which runtime
 * each one happens to execute under.
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

/** Signs `target` with `secret` — the resulting token only verifies against
 * that same target, so a token minted for "/infra" is rejected for
 * "/observability" (and vice versa) even though both check the same
 * cookie name. `secret` is BACKEND_API_KEY, reused rather than adding a
 * dedicated signing secret: it's already a per-deployment, server-only
 * value with no other client-facing exposure. */
export async function createAccessToken(target: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(target));
  return toHex(signature);
}

export async function verifyAccessToken(
  token: string | undefined,
  target: string,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const expected = await createAccessToken(target, secret);
  return expected === token;
}
