import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAppConfig } from "@/lib/config/app";
import { searchParamsToObject } from "@/lib/validation/common";
import type { ApiErrorBody } from "@/types/api";
import { AppError, demoModeRequired, validationError } from "./errors";
import { logger } from "./logger";
import { clientKey, rateLimit } from "./rate-limit";

/**
 * Route-handler wrapper: request IDs, stable error contract, structured logs,
 * optional DEMO_MODE guard and rate limiting. Handlers stay thin and delegate
 * to services.
 */

export interface HandlerContext {
  requestId: string;
  request: NextRequest;
}

interface HandlerOptions {
  /** Endpoint only exists in DEMO_MODE (brain/10 §10). */
  demoOnly?: boolean;
  rateLimit?: { limit: number; windowMs: number; bucket: string };
}

type Handler<P> = (ctx: HandlerContext & { params: P }) => Promise<Response | unknown>;

export function withApi<P = Record<string, never>>(handler: Handler<P>, options: HandlerOptions = {}) {
  return async (request: NextRequest, context?: { params?: Promise<P> }) => {
    const requestId = request.headers.get("x-request-id") || `req_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const started = performance.now();
    const route = request.nextUrl.pathname;
    try {
      if (options.demoOnly && !getAppConfig().demoMode) throw demoModeRequired();
      if (options.rateLimit) {
        const verdict = rateLimit(
          `${options.rateLimit.bucket}:${clientKey(request)}`,
          options.rateLimit.limit,
          options.rateLimit.windowMs,
        );
        if (!verdict.allowed) {
          const response = errorResponse(
            new AppError("RATE_LIMITED", "Too many requests. Please retry shortly.", 429, { retryable: true }),
            requestId,
          );
          response.headers.set("Retry-After", String(verdict.retryAfterSeconds));
          return response;
        }
      }
      const params = (context?.params ? await context.params : {}) as P;
      const result = await handler({ requestId, request, params });
      const response = result instanceof Response ? result : NextResponse.json(result);
      response.headers.set("x-request-id", requestId);
      if (!response.headers.has("Cache-Control")) response.headers.set("Cache-Control", "no-store");
      logger.debug("API_REQUEST", { requestId, route, method: request.method, status: response.status, ms: Math.round(performance.now() - started) });
      return response;
    } catch (error) {
      if (error instanceof AppError) {
        if (error.status >= 500) logger.error("API_ERROR", { requestId, route, code: error.code, message: error.message });
        return errorResponse(error, requestId);
      }
      logger.error("API_UNHANDLED_ERROR", {
        requestId,
        route,
        method: request.method,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return errorResponse(
        new AppError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500, { retryable: true }),
        requestId,
      );
    }
  };
}

function errorResponse(error: AppError, requestId: string) {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      requestId,
      ...(error.options.retryable !== undefined && { retryable: error.options.retryable }),
      ...(error.options.details && { details: error.options.details }),
    },
  };
  return NextResponse.json(body, { status: error.status, headers: { "x-request-id": requestId, "Cache-Control": "no-store" } });
}

/* -------------------------------------------------------------------------- */
/* Validation helpers                                                         */
/* -------------------------------------------------------------------------- */

function issues(error: z.ZodError) {
  return { issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
}

export function parseQuery<S extends z.ZodType>(request: NextRequest, schema: S): z.output<S> {
  const result = schema.safeParse(searchParamsToObject(request.nextUrl.searchParams));
  if (!result.success) throw validationError(issues(result.error));
  return result.data;
}

export function parseParams<S extends z.ZodType>(params: unknown, schema: S): z.output<S> {
  const result = schema.safeParse(params);
  if (!result.success) throw validationError(issues(result.error));
  return result.data;
}

export async function parseBody<S extends z.ZodType>(request: NextRequest, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw validationError({ issues: [{ path: "", message: "Request body must be valid JSON." }] });
  }
  const result = schema.safeParse(json);
  if (!result.success) throw validationError(issues(result.error));
  return result.data;
}
