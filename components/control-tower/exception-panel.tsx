"use client";

import { ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusDot } from "@/components/shared/status-dot";
import { SeverityBadge } from "@/components/shared/domain-badges";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useExceptions } from "@/hooks/use-exceptions";
import { EXCEPTION_SEVERITY_TONES, EXCEPTION_STATUS_LABELS } from "@/lib/constants/statuses";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

/** Open exceptions, most severe first, with a one-click action drawer. */
export function ExceptionPanel({
  onAct,
  limit = 8,
  className,
}: {
  onAct: (exceptionId: string) => void;
  limit?: number;
  className?: string;
}) {
  const exceptions = useExceptions({ view: "open", page: 1, pageSize: limit });
  const items = exceptions.data?.data ?? [];

  return (
    <Panel title="Critical exceptions" count={exceptions.data?.pagination.total} href="/exceptions" className={className}>
      {exceptions.isPending ? (
        <LoadingState variant="list" rows={4} className="p-3.5" label="Loading exceptions" />
      ) : exceptions.isError ? (
        <ErrorState error={exceptions.error} onRetry={() => void exceptions.refetch()} compact />
      ) : items.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No open exceptions" description="The network is running to plan." compact />
      ) : (
        <ScrollArea className="h-full max-h-[340px]">
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {items.map((exception) => (
                <motion.li
                  key={exception.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2.5 px-3.5 py-2.5"
                >
                  <StatusDot tone={EXCEPTION_SEVERITY_TONES[exception.severity]} className="mt-1.5" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="line-clamp-2 text-[12.5px] leading-snug font-medium">{exception.title}</p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono text-foreground/85">{exception.trackingNumber}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{exception.hubName ?? exception.currentLocationLabel}</span>
                      <span aria-hidden>·</span>
                      <RelativeTime value={exception.detectedAt} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={exception.severity} className="h-[18px] px-1.5 text-[10px]" />
                      <span className={cn("text-[10.5px] text-muted-foreground", exception.status === "IN_PROGRESS" && "text-foreground/80")}>
                        {EXCEPTION_STATUS_LABELS[exception.status]}
                      </span>
                    </div>
                  </div>
                  <Button size="xs" variant="outline" className="self-start" onClick={() => onAct(exception.id)}>
                    Act
                  </Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </ScrollArea>
      )}
    </Panel>
  );
}
