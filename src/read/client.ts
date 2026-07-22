import { API_BASE_URL } from "../constants";

/** The backend reports failures as `{ error }` (and occasionally `{ message }`).
 *  Surfacing it keeps "Launch not found" / "Unsupported chainId" in the thrown
 *  message instead of a bare status line. */
function detailOf(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const { error, message } = body as { error?: unknown; message?: unknown };
  const detail = typeof error === "string" ? error : message;
  return typeof detail === "string" && detail.trim() ? detail.trim() : undefined;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    const detail = detailOf(body);
    super(`API ${status}: ${detail ?? statusText}`);
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
