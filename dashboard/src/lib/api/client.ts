import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Fail fast instead of waiting the full default timeout (ms). */
  timeout?: number;
}

/**
 * Thin typed fetch wrapper. Injects the bearer token, serializes JSON, and
 * normalizes errors. Callers are expected to catch `ApiError` and fall back to
 * demo data when the backend is unavailable.
 */
export async function apiRequest<T>(
  path: string,
  { body, timeout = 8000, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let message = res.statusText;
      try {
        const data = await res.json();
        message = data.detail ?? data.message ?? message;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(message, res.status);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    throw new ApiError(
      err instanceof Error ? err.message : "Network error",
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Probe the backend health endpoint; used to decide demo vs live mode. */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    await apiRequest("/api/health", { timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}
