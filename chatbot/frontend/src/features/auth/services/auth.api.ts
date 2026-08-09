async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request to ${path} failed with ${res.status}`);
  }
  return body as T;
}

export const authApi = {
  /** `target` is the one workspace path (e.g. "/infra") this login unlocks —
   * see proxy.ts. */
  login: (username: string, password: string, target: string) =>
    requestJson<{ ok: true }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, target }),
    }),
};
