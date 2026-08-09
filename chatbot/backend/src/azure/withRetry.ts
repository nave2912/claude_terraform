/**
 * Azure Cost Management throttles fairly aggressively — during development
 * a single `query.usage` call 429'd and only succeeded again after ~15s.
 * Retries only on 429 (anything else is a real failure, fail fast), with
 * exponential backoff (2s, 4s, 8s) covering that real-world recovery window.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
      if (statusCode !== 429 || attempt === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
    }
  }
  // Unreachable: the loop above always either returns or throws.
  throw new Error("withRetry: exhausted attempts without returning or throwing");
}
