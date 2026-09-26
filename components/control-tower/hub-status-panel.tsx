"use client";

import { Warehouse } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { StatusDot } from "@/components/shared/status-dot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHubs } from "@/hooks/use-dashboard";
import { HUB_STATUS_LABELS, HUB_STATUS_TONES, type HubStatus } from "@/lib/constants/statuses";
import { DEFAULT_THRESHOLDS } from "@/lib/constants/thresholds";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

const METER_FILL: Record<HubStatus, string> = {
  NORMAL: "bg-status-good",
  BUSY: "bg-status-warning",
  CONGESTED: "bg-status-critical",
};

/** Dwell meter: fill carries severity; scale tops out at 1.5× the critical threshold. */
export function DwellMeter({ minutes, status }: { minutes: number; status: HubStatus }) {
  const max = DEFAULT_THRESHOLDS.hubDwellCriticalMinutes * 1.5;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className={cn("h-full rounded-full transition-[width] duration-500", METER_FILL[status])} style={{ width: `${Math.min(100, (minutes / max) * 100)}%` }} />
    </div>
  );
}

export function HubStatusPanel({ limit = 6, className }: { limit?: number; className?: string }) {
  const hubs = useHubs();
  const items = (hubs.data?.data ?? []).slice(0, limit);
  const attention = (hubs.data?.data ?? []).filter((hub) => hub.status !== "NORMAL").length;

  return (
    <Panel title="Hub status" count={attention} href="/hubs" className={className}>
      {hubs.isPending ? (
        <LoadingState variant="list" rows={4} className="p-3.5" label="Loading hubs" />
      ) : hubs.isError ? (
        <ErrorState error={hubs.error} onRetry={() => void hubs.refetch()} compact />
      ) : items.length === 0 ? (
        <EmptyState icon={Warehouse} title="No hub data" description="Hub feeds have not reported yet." compact />
      ) : (
        <ul className="flex flex-col gap-2.5 p-3.5">
          {items.map((hub) => (
            <li key={hub.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[12.5px]">
                <StatusDot tone={HUB_STATUS_TONES[hub.status]} />
                <span className="truncate font-medium">{hub.name}</span>
                <span className="text-[11px] text-muted-foreground">{HUB_STATUS_LABELS[hub.status]}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-auto text-[11px] text-muted-foreground tabular">
                      {hub.averageDwellMinutes} min · {hub.activeShipments}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Avg dwell {hub.averageDwellMinutes} min · {hub.activeShipments} shipments on site ·{" "}
                    {hub.highDwellExceptions} dwell exceptions
                  </TooltipContent>
                </Tooltip>
              </div>
              <DwellMeter minutes={hub.averageDwellMinutes} status={hub.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
