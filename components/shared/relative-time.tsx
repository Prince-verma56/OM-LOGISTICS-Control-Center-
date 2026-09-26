"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSimNow } from "@/hooks/use-sim-clock";
import { formatDateTime, formatRelative, timeZoneLabel } from "@/lib/formatters/date";
import { cn } from "@/lib/utils";

/** "4m ago" against the simulation clock, with the absolute IST time on hover. */
export function RelativeTime({
  value,
  reference,
  className,
}: {
  value: string | undefined;
  /** Explicit reference clock (e.g. the response's generatedAt). */
  reference?: string;
  className?: string;
}) {
  const now = useSimNow(reference);
  if (!value) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const label = now ? formatRelative(value, now) : formatDateTime(value);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={value} className={cn("whitespace-nowrap tabular", className)}>
          {label}
        </time>
      </TooltipTrigger>
      <TooltipContent>
        {formatDateTime(value)} {timeZoneLabel()}
      </TooltipContent>
    </Tooltip>
  );
}
