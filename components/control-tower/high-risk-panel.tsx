"use client";

import { ArrowUpRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { RiskBadge } from "@/components/shipments/shipment-status-badge";
import { useShipments } from "@/hooks/use-shipments";
import { formatTime } from "@/lib/formatters/date";
import { currentEta, formatDelay, shipmentPath } from "@/lib/formatters/shipment";
import { cn } from "@/lib/utils";
import type { Shipment } from "@/types/shipment";
import { Panel } from "./panel";

/** Highest-risk active shipments; selecting one focuses its vehicle on the map. */
export function HighRiskPanel({
  onSelect,
  selectedShipmentId,
  limit = 6,
  className,
}: {
  onSelect: (shipment: Shipment) => void;
  selectedShipmentId?: string;
  limit?: number;
  className?: string;
}) {
  const shipments = useShipments({ scope: "active", sort: "risk", order: "desc", page: 1, pageSize: limit, riskLevel: undefined });
  const items = (shipments.data?.data ?? []).filter((shipment) => shipment.riskLevel === "HIGH" || shipment.riskLevel === "CRITICAL");

  return (
    <Panel title="High-risk shipments" href="/shipments?sort=risk" className={className}>
      {shipments.isPending ? (
        <LoadingState variant="list" rows={4} className="p-3.5" label="Loading shipments" />
      ) : shipments.isError ? (
        <ErrorState error={shipments.error} onRetry={() => void shipments.refetch()} compact />
      ) : items.length === 0 ? (
        <EmptyState icon={CircleCheck} title="No high-risk shipments" description="Every active shipment is within its promise." compact />
      ) : (
        <ul className="divide-y">
          {items.map((shipment) => (
            <li
              key={shipment.id}
              className={cn("flex items-center gap-1 pr-2", selectedShipmentId === shipment.id && "bg-primary/[0.06]")}
            >
              <button
                type="button"
                onClick={() => onSelect(shipment)}
                aria-label={`Locate ${shipment.trackingNumber} on the map`}
                className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[12.5px] font-medium">{shipment.trackingNumber}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {shipment.origin} → {shipment.destination}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular">
                    ETA {formatTime(currentEta(shipment))} ·{" "}
                    <span className={cn(shipment.delayMinutes >= 60 && "font-medium text-status-critical")}>
                      {formatDelay(shipment.delayMinutes)}
                    </span>
                  </span>
                </div>
                <RiskBadge level={shipment.riskLevel} />
              </button>
              <Link
                href={shipmentPath(shipment.id)}
                aria-label={`Open ${shipment.trackingNumber}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ArrowUpRight className="size-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
