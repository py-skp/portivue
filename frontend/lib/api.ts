// lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API ?? "/api";

type ApiInit = RequestInit & {
  timeoutMs?: number;   // optional request timeout
  retryOnce?: boolean;  // retry once on transient failure
};

async function doFetch(url: string, init: ApiInit): Promise<Response> {
  const { timeoutMs = 30_000 } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function api<T = any>(path: string, init: ApiInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const { retryOnce = false, ...rest } = init;

  const tryOnce = async (): Promise<Response> => doFetch(url, rest);

  let res: Response;
  try {
    res = await tryOnce();
  } catch (err) {
    // network/abort error – optionally retry once
    if (retryOnce) {
      await new Promise(r => setTimeout(r, 400));
      res = await tryOnce();
    } else {
      throw err;
    }
  }

  // retry on transient gateway/server errors
  if (!res.ok && retryOnce && [502, 503, 504].includes(res.status)) {
    await new Promise(r => setTimeout(r, 400));
    res = await tryOnce();
  }

  const ct = res.headers.get("content-type") || "";
  const parse = async () =>
    ct.includes("application/json") ? res.json() : (await res.text());

  if (!res.ok) {
    // surface backend error text/json
    const body = await parse().catch(() => "");
    const msg =
      typeof body === "string"
        ? body
        : body?.detail || JSON.stringify(body) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (await parse()) as T;
}