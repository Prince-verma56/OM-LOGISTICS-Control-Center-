import type { ApiErrorCode } from "@/types/api";

/** Domain/application error mapped to the stable API error contract (brain/09). */
export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly options: { retryable?: boolean; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (code: ApiErrorCode, message: string) => new AppError(code, message, 404);

export const validationError = (details: Record<string, unknown>) =>
  new AppError("VALIDATION_ERROR", "The request is invalid.", 400, { details });

export const demoModeRequired = () =>
  new AppError("DEMO_MODE_REQUIRED", "This endpoint is only available when DEMO_MODE is enabled.", 403);
