"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardFilters, toShipmentQuery, useShipmentFilters } from "@/components/control-tower/dashboard-filters";
import { ShipmentTable } from "@/components/control-tower/shipment-table";
import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shipmentPath } from "@/lib/formatters/shipment";

const SCOPES = [
  { value: "active", label: "Active" },
  { value: "delivered", label: "Delivered" },
  { value: "all", label: "All" },
] as const;

/** Full shipment search (brain/01 FR-002) — tracking no., customer, vehicle, origin, destination, status. */
export function ShipmentsDirectory() {
  const router = useRouter();
  const { values, setFilters } = useShipmentFilters();
  const [pageSize, setPageSize] = useState(25);
  const query = toShipmentQuery(values, { scope: "active", sort: "risk", order: "desc" });
  query.pageSize = pageSize;
  const scope = query.scope ?? "active";

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Operations"
        title="Shipments"
        description="Search and filter every consignment across the network. Select a row to open its journey, ETA and exceptions."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={scope} onValueChange={(value) => setFilters({ scope: value === "active" ? undefined : value })}>
          <TabsList>
            {SCOPES.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <DashboardFilters className="flex-1" />
      </div>
      <ShipmentTable
        title={`${SCOPES.find((item) => item.value === scope)?.label ?? "Active"} shipments`}
        query={query}
        onSelect={(shipment) => router.push(shipmentPath(shipment.id))}
        onLocate={(shipment) => shipment.vehicleId && router.push(`/control-tower?focus=${shipment.vehicleId}`)}
        onQueryChange={(patch) => {
          if (patch.pageSize) {
            setPageSize(patch.pageSize);
            setFilters({ page: undefined });
          } else if (patch.sort) {
            setFilters({ sort: patch.sort, order: patch.order });
          } else if (patch.page) {
            setFilters({ page: String(patch.page) });
          }
        }}
      />
    </PageTransition>
  );
}
