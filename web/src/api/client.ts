/**
 * Typed client for the Rust API. In dev, Vite proxies `/api` to the binary;
 * in production the binary serves both this SPA and the API, so relative
 * paths work everywhere. Auth wiring (JWT/cookie) is added in Phase 6.
 */

const API_BASE = "/api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

interface HelloResponse {
  message: string;
}

export async function getHello(): Promise<string> {
  const data = await getJson<HelloResponse>("/hello");
  return data.message;
}
