/**
 * Typed core of the Rust API client.
 *
 * - All requests send `credentials: "include"` so the httpOnly auth cookies
 *   ride along; no tokens are ever stored in JS.
 * - The stable error envelope `{ error: { code, message } }` is parsed into a
 *   thrown {@link ApiRequestError}.
 * - One interceptor: a 401 triggers a single `POST /api/auth/refresh`, then the
 *   original request is retried exactly once.
 *
 * In dev, Vite proxies `/api` to the binary; in production the binary serves
 * both this SPA and the API, so the relative `/api` base works everywhere.
 */

import type { ApiError } from "../types";

const API_BASE = "/api";

/** A failed API call carrying the backend's stable error code + message. */
export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null) return false;
  const envelope = (value as { error?: unknown }).error;
  if (typeof envelope !== "object" || envelope === null) return false;
  const { code, message } = envelope as { code?: unknown; message?: unknown };
  return typeof code === "string" && typeof message === "string";
}

async function toError(res: Response): Promise<ApiRequestError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (isApiError(body)) {
    return new ApiRequestError(res.status, body.error.code, body.error.message);
  }
  return new ApiRequestError(res.status, "http_error", `Request failed (${String(res.status)})`);
}

async function refreshSession(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const send = (): Promise<Response> =>
    fetch(`${API_BASE}${path}`, { ...init, credentials: "include" });

  let res = await send();
  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await send();
    }
  }
  return res;
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) throw await toError(res);
  // 204 / empty bodies (e.g. logout) parse to `undefined`, typed as T.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (text.length === 0) return undefined as T;
  return JSON.parse(text) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

/** GET `path`, parsing the JSON response into `T`. */
export async function getJson<T>(path: string): Promise<T> {
  return parse<T>(await request(path, { method: "GET" }));
}

/** POST `body` as JSON to `path`, parsing the JSON response into `T`. */
export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await request(path, {
      method: "POST",
      headers: JSON_HEADERS,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}

/** PATCH `body` as JSON to `path`, parsing the JSON response into `T`. */
export async function patchJson<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await request(path, {
      method: "PATCH",
      headers: JSON_HEADERS,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}

/**
 * PATCH `form` as `multipart/form-data` to `path` (the browser sets the boundary
 * Content-Type automatically), parsing the JSON response into `T`. Used for
 * file uploads such as a club logo where a JSON body cannot carry the bytes.
 */
export async function patchForm<T>(path: string, form: FormData): Promise<T> {
  return parse<T>(await request(path, { method: "PATCH", body: form }));
}

/** DELETE `path` (optional JSON `body`), parsing the JSON response into `T`. */
export async function del<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await request(path, {
      method: "DELETE",
      headers: JSON_HEADERS,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}
