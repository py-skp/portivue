// lib/api.ts
export const API_BASE = (process.env.NEXT_PUBLIC_API ?? "/api").replace(/\/$/, "");

type ApiInit = RequestInit & {
  timeoutMs?: number;   // optional request timeout
  retryOnce?: boolean;  // retry once on transient failure
};

// internal: fetch with timeout + minimal headers
async function doFetch(url: string, init: ApiInit): Promise<Response> {
  const { timeoutMs = 30_000, headers, body } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  // Only set JSON content-type if we’re sending a body
  const mergedHeaders: HeadersInit = {
    ...(headers || {}),
    ...(body != null ? { "Content-Type": "application/json" } : {}),
  };

  try {
    return await fetch(url, {
      credentials: "include",
      keepalive: true,
      ...init,
      headers: mergedHeaders,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

// Core generic API. Pass <T> to get types back.
export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const { retryOnce = false, ...rest } = init;

  const tryOnce = () => doFetch(url, rest);

  let res: Response;
  try {
    res = await tryOnce();
  } catch (err) {
    if (retryOnce) {
      await new Promise(r => setTimeout(r, 400));
      res = await tryOnce();
    } else {
      throw err;
    }
  }

  if (!res.ok && retryOnce && [502, 503, 504].includes(res.status)) {
    await new Promise(r => setTimeout(r, 400));
    res = await tryOnce();
  }

  const ct = res.headers.get("content-type") || "";
  const parse = async (): Promise<unknown> =>
    ct.includes("application/json") ? res.json() : res.text();

  if (!res.ok) {
    const body = await parse().catch(() => "");
    const msg =
      typeof body === "string"
        ? body
        : (body as any)?.detail || JSON.stringify(body) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (await parse()) as T;
}

/* ---------------------------
   Typed convenience wrappers
   --------------------------- */

export function get<T>(path: string, init: Omit<ApiInit, "method" | "body"> = {}) {
  return api<T>(path, { ...init, method: "GET" });
}

export function del<T = void>(path: string, init: Omit<ApiInit, "method" | "body"> = {}) {
  return api<T>(path, { ...init, method: "DELETE" });
}

export function post<TResp = unknown, TBody = unknown>(
  path: string,
  body: TBody,
  init: Omit<ApiInit, "method" | "body"> = {}
) {
  return api<TResp>(path, { ...init, method: "POST", body: JSON.stringify(body) });
}

export function put<TResp = unknown, TBody = unknown>(
  path: string,
  body: TBody,
  init: Omit<ApiInit, "method" | "body"> = {}
) {
  return api<TResp>(path, { ...init, method: "PUT", body: JSON.stringify(body) });
}

export function patch<TResp = unknown, TBody = unknown>(
  path: string,
  body: TBody,
  init: Omit<ApiInit, "method" | "body"> = {}
) {
  return api<TResp>(path, { ...init, method: "PATCH", body: JSON.stringify(body) });
}