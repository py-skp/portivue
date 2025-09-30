// app/api.ts — compatibility shim
export { API_BASE } from "@/lib/api";
export { api, del, put, patch } from "@/lib/api";

import { get as _get, post as _post } from "@/lib/api";

// Keep old names used across the app
export const getJSON = _get;
export const postJSON = _post;