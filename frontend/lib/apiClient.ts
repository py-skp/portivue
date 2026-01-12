import { API_BASE } from "./api";

// Ensure we target the proxy if running on client side to share cookies
const BASE = typeof window !== "undefined" ? "/api" : API_BASE;

export class ApiError extends Error {
    status: number;
    data: any;

    constructor(msg: string, status: number, data: any) {
        super(msg);
        this.status = status;
        this.data = data;
    }
}

async function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const url = `${BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
        headers.set("Content-Type", "application/json");
    }

    const config: RequestInit = {
        ...init,
        headers,
        credentials: "include", // CRITICAL: Send cookies with every request
    };

    try {
        const res = await fetch(url, config);

        if (res.status === 401) {
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
                // Redirect to login on 401
                window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
            }
            throw new ApiError("Session expired", 401, null);
        }

        if (!res.ok) {
            const text = await res.text();
            let data: any = text;
            try { data = JSON.parse(text); } catch { }
            const msg = (data && data.detail) || res.statusText || "Request failed";
            throw new ApiError(msg, res.status, data);
        }

        // Handle 204 No Content
        if (res.status === 204) return {} as T;

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await res.json();
        }
        return (await res.text()) as unknown as T;

    } catch (err: any) {
        throw err;
    }
}

export const apiClient = {
    get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "GET" }),
    post: <T>(path: string, body: any, init?: RequestInit) => request<T>(path, { ...init, method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body: any, init?: RequestInit) => request<T>(path, { ...init, method: "PUT", body: JSON.stringify(body) }),
    del: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "DELETE" }),
    patch: <T>(path: string, body: any, init?: RequestInit) => request<T>(path, { ...init, method: "PATCH", body: JSON.stringify(body) }),
};
