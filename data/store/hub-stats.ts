import { OPEN_EXCEPTION_STATUSES } from "@/lib/constants/statuses";
import { hubStatusFor } from "@/lib/intelligence/rules";
import { hubDwellMinutes } from "./trip-math";
import type { DemoDataset } from "./types";

/**
 * Recomputes derived hub load: active shipments (modelled + WMS baseline),
 * average dwell (baseline blended with vehicles currently on site) and status.
 * Returns the ids of hubs whose status or dwell changed materially.
 */
export function recomputeHubStats(dataset: DemoDataset, nowMs: number): string[] {
  const modelled = new Map<string, number>();
  const dwellSamples = new Map<string, number[]>();

  for (const shipment of dataset.shipments.values()) {
    if (shipment.status === "HUB_REACHED" && shipment.currentHubId) {
      modelled.set(shipment.currentHubId, (modelled.get(shipment.currentHubId) ?? 0) + 1);
    } else if (shipment.status === "ORDER_BOOKED") {
      const originHubId = dataset.routes.get(shipment.routeId)?.stops[0].hubId;
      if (originHubId) modelled.set(originHubId, (modelled.get(originHubId) ?? 0) + 1);
    } else if (shipment.status === "PICKED_UP" && shipment.vehicleId) {
      const trip = dataset.trips.get(shipment.vehicleId);
      if (trip?.atHubId) modelled.set(trip.atHubId, (modelled.get(trip.atHubId) ?? 0) + 1);
    }
  }
  for (const trip of dataset.trips.values()) {
    if (trip.phase !== "AT_HUB" || !trip.atHubId) continue;
    const samples = dwellSamples.get(trip.atHubId) ?? [];
    samples.push(hubDwellMinutes(trip, nowMs));
    dwellSamples.set(trip.atHubId, samples);
  }

  const changed: string[] = [];
  for (const hub of dataset.hubs.values()) {
    const samples = dwellSamples.get(hub.id) ?? [];
    const onSiteAverage = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : undefined;
    const averageDwellMinutes = Math.round(
      onSiteAverage === undefined ? hub.baselineDwellMinutes : hub.baselineDwellMinutes * 0.45 + onSiteAverage * 0.55,
    );
    const activeShipments = hub.baselineInventory + (modelled.get(hub.id) ?? 0);
    const status = hubStatusFor(activeShipments, averageDwellMinutes);
    if (status !== hub.status || Math.abs(averageDwellMinutes - hub.averageDwellMinutes) >= 3) changed.push(hub.id);
    hub.averageDwellMinutes = averageDwellMinutes;
    hub.activeShipments = activeShipments;
    hub.status = status;
  }
  return changed;
}

export function openHubDwellExceptions(dataset: DemoDataset, hubId: string): number {
  let count = 0;
  for (const exception of dataset.exceptions.values()) {
    if (exception.type === "HUB_DWELL" && exception.hubId === hubId && OPEN_EXCEPTION_STATUSES.includes(exception.status)) {
      count += 1;
    }
  }
  return count;
}
