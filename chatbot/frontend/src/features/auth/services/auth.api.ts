export interface SessionResponse {
  authenticated: boolean;
  username?: string;
}

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
  getSession: () => requestJson<SessionResponse>("/api/auth/session"),

  login: (username: string, password: string) =>
    requestJson<{ ok: true; username: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => requestJson<{ ok: true }>("/api/auth/logout", { method: "POST" }),
};
