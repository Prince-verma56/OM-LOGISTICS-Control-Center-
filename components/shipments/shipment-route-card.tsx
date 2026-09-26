"use client";

import dynamic from "next/dynamic";
import { TrafficBadge } from "@/components/shared/domain-badges";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ToneBadge } from "@/components/shared/status-dot";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useShipmentRoute } from "@/hooks/use-shipments";
import { formatDuration } from "@/lib/formatters/date";
import { formatKm } from "@/lib/formatters/number";
import type { RiskLevel } from "@/lib/constants/statuses";

const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => <LoadingState variant="panel" className="h-full" label="Loading route map" />,
});

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium tabular">{children}</span>
    </div>
  );
}

/** Route intelligence: planned vs actual, deviation, traffic, remaining (brain/01 FR-006). */
export function ShipmentRouteCard({ shipmentId, risk }: { shipmentId: string; risk: RiskLevel }) {
  const route = useShipmentRoute(shipmentId);
  const data = route.data;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Route intelligence</CardTitle>
        <CardDescription>
          {data ? `${data.route.code} · ${data.route.corridor}` : "Planned vs actual route"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {route.isPending ? (
          <LoadingState variant="panel" className="h-64" label="Loading route" />
        ) : route.isError || !data ? (
          <ErrorState error={route.error} onRetry={() => void route.refetch()} compact />
        ) : (
          <>
            <div className="h-64 overflow-hidden rounded-lg border md:h-72">
              <RouteMap
                planned={data.route.geometry}
                actual={data.actualTrail}
                position={data.currentPosition}
                risk={risk}
                className="h-full"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-primary/70" aria-hidden />
                Planned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded bg-[#c2410c] dark:bg-[#f59e0b]" aria-hidden />
                Actual GPS trail
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border-2 border-card bg-status-serious" aria-hidden />
                Current position (risk colour)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Progress">{data.progressPct}%</Stat>
              <Stat label="Travelled">{formatKm(data.travelledKm)}</Stat>
              <Stat label="Remaining">{formatKm(data.remainingKm)}</Stat>
              <Stat label="Est. time to go">{formatDuration(data.estimatedRemainingMinutes)}</Stat>
              <Stat label="Traffic">
                <span className="flex items-center gap-1.5">
                  <TrafficBadge state={data.trafficState} />
                  {data.trafficDelayMinutes > 0 && <span className="text-xs text-muted-foreground">+{data.trafficDelayMinutes}m</span>}
                </span>
              </Stat>
              <Stat label="Route adherence">
                <ToneBadge
                  tone={data.deviation.deviated ? "critical" : "good"}
                  label={
                    data.deviation.deviated
                      ? `Off route · ${(data.deviation.distanceFromRouteMeters / 1000).toFixed(1)} km`
                      : "On planned corridor"
                  }
                />
              </Stat>
              <Stat label="Next hub">{data.nextHubName ?? "—"}</Stat>
              <Stat label="Planned distance">{formatKm(data.route.plannedDistanceKm)}</Stat>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
