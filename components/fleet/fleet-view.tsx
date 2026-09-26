"use client";

import { Crosshair, Search, Truck } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FreshnessBadge, VehicleStatusBadge } from "@/components/shared/domain-badges";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageTransition } from "@/components/shared/page-transition";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusDot } from "@/components/shared/status-dot";
import { RiskBadge } from "@/components/shipments/shipment-status-badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNetworkRoutes } from "@/hooks/use-dashboard";
import { useFleetList, useFleetLive } from "@/hooks/use-fleet";
import { useUrlFilters } from "@/hooks/use-url-filters";
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONES,
  type VehicleStatus,
} from "@/lib/constants/statuses";
import { formatSpeed } from "@/lib/formatters/number";
import { cn } from "@/lib/utils";

const KEYS = ["status", "q"] as const;

/** Fleet view (brain/01 FR-004): vehicle, location, shipments, route, movement, last GPS. */
export function FleetView() {
  const { values, setFilters } = useUrlFilters(KEYS);
  const status = VEHICLE_STATUSES.includes(values.status as VehicleStatus) ? (values.status as VehicleStatus) : undefined;
  const [search, setSearch] = useState(values.q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const live = useFleetLive();
  const fleet = useFleetList({ status, search: values.q });
  const routes = useNetworkRoutes();
  const routeLabel = (routeId?: string) => {
    const route = routes.data?.data.find((item) => item.id === routeId);
    return route ? `${route.origin} → ${route.destination}` : "—";
  };
  const counts = (live.data?.data ?? []).reduce<Record<string, number>>((acc, vehicle) => {
    acc[vehicle.status] = (acc[vehicle.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Operations"
        title="Fleet"
        description="Every vehicle's position, movement and GPS freshness. Offline or stale feeds show the last known position."
      />

      <section aria-label="Fleet status" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {VEHICLE_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilters({ status: status === item ? undefined : item })}
            aria-pressed={status === item}
            className={cn(
              "flex flex-col gap-1 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              status === item && "border-primary/60 bg-primary/[0.05]",
            )}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <StatusDot tone={VEHICLE_STATUS_TONES[item]} />
              {VEHICLE_STATUS_LABELS[item]}
            </span>
            <span className="text-2xl font-semibold tracking-tight">{live.isPending ? "—" : (counts[item] ?? 0)}</span>
          </button>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={status ?? "all"} onValueChange={(value) => setFilters({ status: value === "all" ? undefined : value })}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {VEHICLE_STATUSES.map((item) => (
              <TabsTrigger key={item} value={item}>
                {VEHICLE_STATUS_LABELS[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="h-8 w-full sm:w-64">
          <InputGroupAddon>
            <Search className="size-3.5" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            aria-label="Search vehicles"
            placeholder="Vehicle no., type or place…"
            onChange={(event) => {
              const next = event.target.value;
              setSearch(next);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => setFilters({ q: next.trim() || undefined }), 300);
            }}
          />
        </InputGroup>
      </div>

      <section className="rounded-xl border bg-card" aria-label="Vehicles">
        {fleet.isPending ? (
          <LoadingState variant="rows" rows={10} className="p-4" label="Loading fleet" />
        ) : fleet.isError ? (
          <ErrorState error={fleet.error} onRetry={() => void fleet.refetch()} />
        ) : fleet.data.data.length === 0 ? (
          <EmptyState icon={Truck} title="No vehicles match" description="Try a different status or search term." />
        ) : (
          <div className={cn("transition-opacity", fleet.isPlaceholderData && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Vehicle", "Status", "Location", "Route", "Progress", "Shipments", "Speed", "Risk", "GPS", ""].map((heading) => (
                    <TableHead key={heading} className="h-9 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-4">
                      {heading}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleet.data.data.map((vehicle) => (
                  <TableRow key={vehicle.id} className="text-[13px]">
                    <TableCell className="py-2 pl-4">
                      <span className="flex flex-col">
                        <span className="font-mono font-medium">{vehicle.vehicleNumber}</span>
                        <span className="text-[11px] text-muted-foreground">{vehicle.vehicleType}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <VehicleStatusBadge status={vehicle.status} />
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{vehicle.locationLabel}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{routeLabel(vehicle.routeId)}</TableCell>
                    <TableCell className="w-32">
                      {vehicle.progressPct !== undefined ? (
                        <span className="flex items-center gap-2">
                          <Progress value={vehicle.progressPct} className="w-16" aria-label="Trip progress" />
                          <span className="text-xs text-muted-foreground tabular">{vehicle.progressPct}%</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No trip</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular">{vehicle.currentShipmentIds.length}</TableCell>
                    <TableCell className="whitespace-nowrap tabular">
                      {vehicle.status === "MOVING" ? formatSpeed(vehicle.currentLocation.speedKph) : "—"}
                    </TableCell>
                    <TableCell>{vehicle.currentShipmentIds.length > 0 ? <RiskBadge level={vehicle.riskLevel} /> : "—"}</TableCell>
                    <TableCell>
                      <span className="flex flex-col gap-0.5">
                        <FreshnessBadge freshness={vehicle.gpsFreshness} />
                        <RelativeTime value={vehicle.lastGpsAt} className="text-[11px] text-muted-foreground" />
                      </span>
                    </TableCell>
                    <TableCell className="pr-3">
                      {vehicle.routeId && (
                        <Button size="icon-xs" variant="ghost" asChild aria-label={`Locate ${vehicle.vehicleNumber} on map`}>
                          <Link href={`/control-tower?focus=${vehicle.id}`}>
                            <Crosshair />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
