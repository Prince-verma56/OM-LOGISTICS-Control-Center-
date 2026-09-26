import { ArrowRight } from "lucide-react";
import { RelativeTime } from "@/components/shared/relative-time";
import { FreshnessBadge, VehicleStatusBadge } from "@/components/shared/domain-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/formatters/date";
import type { Vehicle } from "@/types/fleet";
import type { Route } from "@/types/route";
import type { Shipment } from "@/types/shipment";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-[13px]">{children}</dd>
    </div>
  );
}

export function ShipmentSummary({ shipment, vehicle, route }: { shipment: Shipment; vehicle?: Vehicle; route: Route }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            {shipment.origin} <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden /> {shipment.destination}
            <span className="ml-auto text-xs text-muted-foreground tabular">{shipment.progressPct}%</span>
          </div>
          <Progress value={shipment.progressPct} aria-label="Journey progress" />
          <span className="text-[11px] text-muted-foreground">
            {route.corridor} · {route.plannedDistanceKm} km planned · {route.stops.length} hubs on lane
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
          <Fact label="Customer">{shipment.customerName}</Fact>
          <Fact label="Current location">{shipment.locationLabel ?? "—"}</Fact>
          <Fact label="Last update">
            <RelativeTime value={shipment.lastUpdatedAt} />
          </Fact>
          <Fact label="Vehicle">
            {shipment.vehicleNumber ? <span className="font-mono">{shipment.vehicleNumber}</span> : "Awaiting assignment"}
          </Fact>
          <Fact label="Vehicle status">
            {vehicle ? (
              <span className="flex flex-wrap gap-1">
                <VehicleStatusBadge status={vehicle.status} />
                <FreshnessBadge freshness={vehicle.gpsFreshness} />
              </span>
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="Vehicle type">{vehicle?.vehicleType ?? "—"}</Fact>
          <Fact label="Booked">{formatDateTime(shipment.bookedAt)}</Fact>
          <Fact label="Picked up">{formatDateTime(shipment.pickedUpAt)}</Fact>
          <Fact label="Promised delivery">{formatDateTime(shipment.promisedDeliveryAt)}</Fact>
          {shipment.deliveredAt && <Fact label="Delivered">{formatDateTime(shipment.deliveredAt)}</Fact>}
          {shipment.currentLocation && (
            <Fact label="Coordinates">
              <span className="font-mono text-[12px] text-muted-foreground">
                {shipment.currentLocation.lat.toFixed(4)}, {shipment.currentLocation.lng.toFixed(4)}
              </span>
            </Fact>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
