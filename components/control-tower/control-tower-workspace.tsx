"use client";

import { ExternalLink, Siren } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { useCallback, useState } from "react";
import { ExceptionActionSheet } from "@/components/exceptions/exception-action-sheet";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageTransition } from "@/components/shared/page-transition";
import { Button } from "@/components/ui/button";
import { DEMO_CONFIG } from "@/config/demo";
import { useHubs, useNetworkRoutes } from "@/hooks/use-dashboard";
import { useFleetLive } from "@/hooks/use-fleet";
import { useShipments } from "@/hooks/use-shipments";
import { trackingPath } from "@/lib/formatters/shipment";
import { cn } from "@/lib/utils";
import type { Shipment } from "@/types/shipment";
import { DashboardFilters, toShipmentQuery, useShipmentFilters } from "./dashboard-filters";
import { ExceptionPanel } from "./exception-panel";
import { HighRiskPanel } from "./high-risk-panel";
import { HubStatusPanel } from "./hub-status-panel";
import { KpiStrip } from "./kpi-strip";
import { SelectedVehicleCard } from "./selected-vehicle-card";
import { ShipmentTable } from "./shipment-table";

const LiveMap = dynamic(() => import("./live-map"), {
  ssr: false,
  loading: () => <LoadingState variant="panel" className="h-full" label="Loading map" />,
});

// Literal class names so Tailwind can detect them.
const MAP_HEIGHT = "h-[clamp(460px,68vh,820px)]";
const RAIL_HEIGHT = "xl:h-[clamp(460px,68vh,820px)]";

/**
 * Primary showcase: KPI strip, filters, live map with a rail of critical
 * exceptions / high-risk shipments / hub status, and the shipment table.
 * Selection is kept in the URL (`?focus=<vehicleId>`) so map, rail, table
 * and scenario triggers stay synchronised.
 */
export function ControlTowerWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus") ?? undefined;
  const { values, setFilters } = useShipmentFilters();
  const [pageSize, setPageSize] = useState(10);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>();
  const [actionExceptionId, setActionExceptionId] = useState<string>();

  const query = toShipmentQuery(values, { scope: "active", sort: "risk", order: "desc" });
  query.pageSize = pageSize;

  const fleet = useFleetLive(query);
  const routes = useNetworkRoutes();
  const hubs = useHubs();
  const headline = useShipments({ search: DEMO_CONFIG.headlineTrackingNumber, scope: "all", pageSize: 1 });
  const headlineToken = headline.data?.data[0]?.publicTrackingToken;

  const setFocus = useCallback(
    (vehicleId: string | undefined) => {
      const next = new URLSearchParams(searchParams.toString());
      if (vehicleId) next.set("focus", vehicleId);
      else next.delete("focus");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const selectShipment = useCallback(
    (shipment: Shipment) => {
      setSelectedShipmentId(shipment.id);
      if (shipment.vehicleId && shipment.status !== "DELIVERED") setFocus(shipment.vehicleId);
    },
    [setFocus],
  );

  const vehicles = fleet.data?.data ?? [];
  const selectedVehicle = focus ? vehicles.find((vehicle) => vehicle.id === focus) : undefined;
  
  const activeRouteIds = new Set(vehicles.map((v) => v.routeId).filter(Boolean));
  const hasShipmentFilters = Boolean(
    query.search || query.status || query.riskLevel || query.hubId || query.vehicleId || query.customerId || query.routeId || query.from || query.to
  );
  
  const networkRoutes = routes.data?.data ?? [];
  const displayRoutes = hasShipmentFilters
    ? networkRoutes.filter((r) => activeRouteIds.has(r.id))
    : networkRoutes;

  const selectedRoute = selectedVehicle?.routeId ? networkRoutes.find((route) => route.id === selectedVehicle.routeId) : undefined;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Pan-India network · live"
        title="Intelligent Control Tower"
        description="Real-time visibility across hubs, lanes and fleet — predictive ETA, exception detection and proactive customer updates."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/exceptions">
                <Siren data-icon="inline-start" />
                Exception center
              </Link>
            </Button>
            {headlineToken ? (
              <Button size="sm" asChild>
                <a href={trackingPath(headlineToken)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink data-icon="inline-start" />
                  Customer view · {DEMO_CONFIG.headlineTrackingNumber}
                </a>
              </Button>
            ) : (
              <Button size="sm" disabled>
                <ExternalLink data-icon="inline-start" />
                Customer view · {DEMO_CONFIG.headlineTrackingNumber}
              </Button>
            )}
          </>
        }
      />

      <KpiStrip />
      <DashboardFilters />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={MAP_HEIGHT}>
          {fleet.isError || routes.isError ? (
            <div className="flex h-full items-center justify-center rounded-xl border bg-card">
              <ErrorState
                error={fleet.error ?? routes.error}
                onRetry={() => {
                  void fleet.refetch();
                  void routes.refetch();
                }}
                title="Live map unavailable"
              />
            </div>
          ) : fleet.isPending || routes.isPending ? (
            <LoadingState variant="panel" className="h-full" label="Loading live network" />
          ) : (
            <LiveMap
              vehicles={vehicles}
              routes={displayRoutes}
              hubs={hubs.data?.data ?? []}
              selectedVehicleId={focus}
              onSelectVehicle={(vehicleId) => {
                setSelectedShipmentId(undefined);
                setFocus(vehicleId);
              }}
              className="h-full"
              overlay={
                <AnimatePresence>
                  {selectedVehicle && (
                    <SelectedVehicleCard
                      key={selectedVehicle.id}
                      vehicle={selectedVehicle}
                      route={selectedRoute}
                      hubs={hubs.data?.data ?? []}
                      onClose={() => setFocus(undefined)}
                    />
                  )}
                </AnimatePresence>
              }
            />
          )}
        </div>

        <div className={cn("scrollbar-thin flex min-w-0 flex-col gap-4 xl:overflow-y-auto", RAIL_HEIGHT)}>
          <ExceptionPanel query={query} onAct={setActionExceptionId} limit={6} />
          <HighRiskPanel query={query} onSelect={selectShipment} selectedShipmentId={selectedShipmentId} limit={6} />
          <HubStatusPanel limit={6} />
        </div>
      </div>

      <ShipmentTable
        title="Active shipments"
        query={query}
        selectedShipmentId={selectedShipmentId}
        onSelect={selectShipment}
        onLocate={selectShipment}
        onQueryChange={(patch) => {
          if (patch.pageSize) {
            setPageSize(patch.pageSize);
            setFilters({ page: undefined });
            return;
          }
          if (patch.sort) {
            setFilters({ sort: patch.sort, order: patch.order });
            return;
          }
          if (patch.page) setFilters({ page: String(patch.page) });
        }}
      />

      <ExceptionActionSheet
        exceptionId={actionExceptionId}
        open={Boolean(actionExceptionId)}
        onOpenChange={(open) => {
          if (!open) setActionExceptionId(undefined);
        }}
      />
    </PageTransition>
  );
}
