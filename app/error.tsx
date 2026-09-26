"use client";

import { ErrorState } from "@/components/shared/error-state";

/** Route-level error boundary: friendly message + retry, never a stack trace. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} title="This view hit an unexpected problem" />;
}
