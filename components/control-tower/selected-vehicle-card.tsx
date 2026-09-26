"use client";

import { ArrowRight, Gauge, MapPin, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { FreshnessBadge, VehicleStatusBadge } from "@/components/shared/domain-badges";
import { LoadingState } from "@/components/shared/loading-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { RiskBadge } from "@/components/shipments/shipment-status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useShipments } from "@/hooks/use-shipments";
import { formatTime } from "@/lib/formatters/date";
import { formatSpeed } from "@/lib/formatters/number";
import { currentEta, formatDelay, shipmentPath } from "@/lib/formatters/shipment";
import type { Vehicle } from "@/types/fleet";
import type { Hub } from "@/types/hub";
import type { Route } from "@/types/route";

/** Floating detail for the vehicle selected on the map. */
export function SelectedVehicleCard({
  vehicle,
  route,
  hubs,
  onClose,
}: {
  vehicle: Vehicle;
  route?: Route;
  hubs: Hub[];
  onClose: () => void;
}) {
  const shipments = useShipments({ vehicleId: vehicle.id, scope: "active", sort: "risk", order: "desc", page: 1, pageSize: 6 });
  const nextHub = vehicle.nextHubId ? hubs.find((hub) => hub.id === vehicle.nextHubId) : undefined;
  const atHub = vehicle.atHubId ? hubs.find((hub) => hub.id === vehicle.atHubId) : undefined;
  const lead = shipments.data?.data[0];

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="absolute right-3 bottom-3 left-3 z-10 flex max-h-[70%] flex-col gap-2.5 overflow-auto rounded-xl border bg-card/95 p-3.5 shadow-lg backdrop-blur sm:left-auto sm:w-[340px]"
      aria-label={`Vehicle ${vehicle.vehicleNumber}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[15px] font-semibold tracking-tight">{vehicle.vehicleNumber}</span>
          <span className="truncate text-[11px] text-muted-foreground">{vehicle.vehicleType}</span>
        </div>
        <Button size="icon-xs" variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close vehicle details">
          <X />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <VehicleStatusBadge status={vehicle.status} />
        <RiskBadge level={vehicle.riskLevel} />
        <FreshnessBadge freshness={vehicle.gpsFreshness} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          <span className="truncate text-foreground">{atHub?.name ?? vehicle.locationLabel}</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Gauge className="size-3.5" aria-hidden />
          <span className="text-foreground tabular">{vehicle.status === "MOVING" ? formatSpeed(vehicle.currentLocation.speedKph) : "0 km/h"}</span>
          <span>· GPS <RelativeTime value={vehicle.lastGpsAt} /></span>
        </span>
      </div>

      {route && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {route.origin} <ArrowRight className="inline size-3 text-muted-foreground" aria-hidden /> {route.destination}
            </span>
            <span className="text-muted-foreground tabular">{vehicle.progressPct ?? 0}%</span>
          </div>
          <Progress value={vehicle.progressPct ?? 0} aria-label="Trip progress" />
          <span className="text-[11px] text-muted-foreground">
            {route.corridor} · {route.plannedDistanceKm} km{nextHub ? ` · next: ${nextHub.name}` : ""}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Shipments on board ({vehicle.currentShipmentIds.length})
        </span>
        {shipments.isPending ? (
          <LoadingState variant="list" rows={3} label="Loading shipments" />
        ) : (
          <ul className="flex flex-col divide-y">
            {(shipments.data?.data ?? []).map((shipment) => (
              <li key={shipment.id} className="flex items-center gap-2 py-1.5 text-xs">
                <Link href={shipmentPath(shipment.id)} className="font-mono font-medium text-primary hover:underline">
                  {shipment.trackingNumber}
                </Link>
                <span className="truncate text-muted-foreground">
                  ETA {formatTime(currentEta(shipment))} · {formatDelay(shipment.delayMinutes)}
                </span>
                <RiskBadge level={shipment.riskLevel} className="ml-auto" />
              </li>
            ))}
            {shipments.data?.data.length === 0 && <li className="py-1.5 text-xs text-muted-foreground">No active shipments on board.</li>}
          </ul>
        )}
      </div>

      {lead && (
        <Button asChild size="sm" className="w-full">
          <Link href={shipmentPath(lead.id)}>
            Open {lead.trackingNumber}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      )}
    </motion.aside>
  );
}
