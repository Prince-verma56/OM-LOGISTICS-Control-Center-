"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Friendly error with a retry action. Never shows stack traces; surfaces the
 * request id so support can correlate server logs (brain/09 §3).
 */
export function ErrorState({
  error,
  onRetry,
  title = "Couldn't load this data",
  compact = false,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const apiError = error instanceof ApiError ? error : undefined;
  const message = apiError?.message ?? "Something went wrong. Please try again.";
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-status-critical/10">
        <AlertTriangle className="size-4 text-status-critical" aria-hidden />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      {apiError?.requestId && (
        <p className="font-mono text-[10px] text-muted-foreground/80">Request {apiError.requestId}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" />
          Retry
        </Button>
      )}
    </div>
  );
}
