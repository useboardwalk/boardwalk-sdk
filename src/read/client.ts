import { API_BASE_URL } from "../constants";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

/** Minimal GET helper for the few read endpoints the SDK needs. */
export async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  baseUrl: string = API_BASE_URL,
): Promise<T> {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, res.statusText, body);
  }
  return res.json() as Promise<T>;
}
