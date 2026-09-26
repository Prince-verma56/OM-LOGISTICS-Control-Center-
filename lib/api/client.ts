import type { ApiErrorBody, ApiErrorCode } from "@/types/api";

/**
 * Browser API client. The UI talks only to /api/v1 — never to repositories
 * or dummy data directly — so real integrations can replace the data layer
 * without rebuilding the frontend.
 */

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode | "NETWORK_ERROR",
    message: string,
    readonly status: number,
    readonly requestId?: string,
    readonly retryable = false,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export function toQueryString(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Network unavailable. Check your connection and retry.", 0, undefined, true);
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : undefined;
  if (!response.ok) {
    const error = (body as ApiErrorBody | undefined)?.error;
    throw new ApiError(
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? `Request failed (${response.status}).`,
      response.status,
      error?.requestId ?? response.headers.get("x-request-id") ?? undefined,
      error?.retryable ?? response.status >= 500,
      error?.details,
    );
  }
  return body as T;
}

export const apiClient = {
  get: <T>(path: string, params?: QueryParams) => request<T>(`${path}${toQueryString(params)}`),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};

/** Only retry safe reads, and only when the error says it is retryable (brain/09 §4). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return error instanceof ApiError ? error.retryable : true;
}
