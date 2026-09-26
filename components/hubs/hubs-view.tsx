"use client";

import { ArrowDownToLine, ArrowUpFromLine, PackageOpen, ShieldCheck, Truck, Warehouse } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DwellMeter } from "@/components/control-tower/hub-status-panel";
import { ExceptionActionSheet } from "@/components/exceptions/exception-action-sheet";
import { PageHeader } from "@/components/layout/page-header";
import { HubStatusBadge, SeverityBadge } from "@/components/shared/domain-badges";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageTransition } from "@/components/shared/page-transition";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusDot } from "@/components/shared/status-dot";
import { RiskBadge, ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useHubDetail, useHubs } from "@/hooks/use-dashboard";
import { HUB_STATUSES, HUB_STATUS_LABELS, HUB_STATUS_TONES } from "@/lib/constants/statuses";
import { shipmentPath } from "@/lib/formatters/shipment";
import { cn } from "@/lib/utils";
import type { Hub } from "@/types/hub";

function Stat({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium tabular">{value}</span>
    </div>
  );
}

function HubCard({ hub, onOpen }: { hub: Hub; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        hub.status === "CONGESTED" && "border-status-critical/40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{hub.name}</span>
          <span className="text-[11px] text-muted-foreground">
            {hub.code} · {hub.city}, {hub.state}
          </span>
        </div>
        <HubStatusBadge status={hub.status} className="ml-auto" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Average dwell</span>
          <span className="text-lg font-semibold tabular">{hub.averageDwellMinutes} min</span>
        </div>
        <DwellMeter minutes={hub.averageDwellMinutes} status={hub.status} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Stat icon={ArrowDownToLine} label="Arrivals" value={hub.arrivals} />
        <Stat icon={ArrowUpFromLine} label="Departures" value={hub.departures} />
        <Stat icon={PackageOpen} label="On site" value={hub.activeShipments} />
        <Stat icon={Truck} label="Vehicles" value={hub.vehiclesOnSite} />
      </div>
      {hub.highDwellExceptions > 0 && (
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-status-critical">
          <StatusDot tone="critical" />
          {hub.highDwellExceptions} high-dwell exception{hub.highDwellExceptions > 1 ? "s" : ""}
        </span>
      )}
    </button>
  );
}

function HubDetailSheet({ hubId, onClose, onAct }: { hubId?: string; onClose: () => void; onAct: (id: string) => void }) {
  const detail = useHubDetail(hubId);
  const data = detail.data;
  return (
    <Sheet open={Boolean(hubId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b">
          <SheetTitle>{data?.hub.name ?? "Hub"}</SheetTitle>
          <SheetDescription>
            {data ? `${HUB_STATUS_LABELS[data.hub.status]} · avg dwell ${data.hub.averageDwellMinutes} min · ${data.inboundVehicles} vehicles inbound` : "Loading hub…"}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 p-4">
            {detail.isPending ? (
              <LoadingState variant="list" rows={6} label="Loading hub" />
            ) : detail.isError || !data ? (
              <ErrorState error={detail.error} onRetry={() => void detail.refetch()} compact />
            ) : (
              <>
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Open exceptions</h3>
                  {data.exceptions.length === 0 ? (
                    <EmptyState icon={ShieldCheck} title="No open exceptions at this hub" compact />
                  ) : (
                    <ul className="flex flex-col divide-y rounded-lg border">
                      {data.exceptions.map((exception) => (
                        <li key={exception.id} className="flex items-start gap-2 p-2.5">
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-[13px] font-medium">{exception.title}</span>
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <SeverityBadge severity={exception.severity} className="h-[18px] px-1.5 text-[10px]" />
                              <span className="font-mono">{exception.trackingNumber}</span>
                              <RelativeTime value={exception.detectedAt} />
                            </span>
                          </div>
                          <Button size="xs" variant="outline" onClick={() => onAct(exception.id)}>
                            Act
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Shipments at or awaiting dispatch ({data.waitingShipments.length})
                  </h3>
                  {data.waitingShipments.length === 0 ? (
                    <EmptyState icon={PackageOpen} title="No shipments waiting" compact />
                  ) : (
                    <ul className="flex flex-col divide-y rounded-lg border">
                      {data.waitingShipments.map((shipment) => (
                        <li key={shipment.id} className="flex items-center gap-2 p-2.5 text-xs">
                          <Link href={shipmentPath(shipment.id)} className="font-mono font-medium text-primary hover:underline">
                            {shipment.trackingNumber}
                          </Link>
                          <span className="truncate text-muted-foreground">{shipment.customerName}</span>
                          <span className="ml-auto flex items-center gap-1.5">
                            <ShipmentStatusBadge status={shipment.status} />
                            <RiskBadge level={shipment.riskLevel} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/** Hub view (brain/01 FR-005): arrivals, departures, waiting, average dwell, high-dwell exceptions. */
export function HubsView() {
  const hubs = useHubs();
  const [openHubId, setOpenHubId] = useState<string>();
  const [actionExceptionId, setActionExceptionId] = useState<string>();
  const counts = (hubs.data?.data ?? []).reduce<Record<string, number>>((acc, hub) => {
    acc[hub.status] = (acc[hub.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Operations"
        title="Hubs"
        description="Load and dwell across the 20-hub network. Dwell above 45 min raises a warning; above 90 min escalates."
        actions={
          <div className="flex items-center gap-3 text-xs">
            {HUB_STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <StatusDot tone={HUB_STATUS_TONES[status]} />
                {HUB_STATUS_LABELS[status]} <span className="font-semibold tabular">{counts[status] ?? 0}</span>
              </span>
            ))}
          </div>
        }
      />
      {hubs.isPending ? (
        <LoadingState variant="cards" rows={8} label="Loading hubs" />
      ) : hubs.isError ? (
        <ErrorState error={hubs.error} onRetry={() => void hubs.refetch()} />
      ) : hubs.data.data.length === 0 ? (
        <EmptyState icon={Warehouse} title="No hubs reported" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {hubs.data.data.map((hub) => (
            <HubCard key={hub.id} hub={hub} onOpen={() => setOpenHubId(hub.id)} />
          ))}
        </div>
      )}
      <HubDetailSheet hubId={openHubId} onClose={() => setOpenHubId(undefined)} onAct={setActionExceptionId} />
      <ExceptionActionSheet
        exceptionId={actionExceptionId}
        open={Boolean(actionExceptionId)}
        onOpenChange={(open) => !open && setActionExceptionId(undefined)}
      />
    </PageTransition>
  );
}
