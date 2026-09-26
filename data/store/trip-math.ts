import { ETA_MODEL } from "@/lib/constants/thresholds";
import { headingAlong, normalizeHeading, offsetPoint, pointAlong, type RouteLine } from "@/lib/map/geo";
import type { ShipmentStatus } from "@/lib/constants/statuses";
import type { EtaInput } from "@/types/eta";
import type { LngLat } from "@/types/geo";
import type { Route } from "@/types/route";
import type { ShipmentRecord, VehicleRecord, VehicleTrip } from "./types";

/**
 * Trip geometry and ETA-input helpers shared by the seed generator and the
 * demo simulator, so both produce identical numbers for the same state.
 */

const MINUTE = 60_000;

/** Expected delivery run after leaving the destination hub. */
export const LAST_MILE_RUN_MINUTES = 45;

export function isAtDestinationHub(trip: VehicleTrip, route: Route): boolean {
  return trip.phase === "AT_HUB" && trip.atHubId === route.stops[route.stops.length - 1].hubId;
}

export function isAtOriginHub(trip: VehicleTrip, route: Route): boolean {
  return trip.phase === "AT_HUB" && trip.atHubId === route.stops[0].hubId;
}

/** Shipment milestone implied by where the carrying vehicle is on its trip. */
export function shipmentStatusForTrip(trip: VehicleTrip, route: Route): ShipmentStatus {
  if (trip.phase === "LAST_MILE") return "OUT_FOR_DELIVERY";
  if (trip.phase === "AT_HUB") return isAtOriginHub(trip, route) ? "PICKED_UP" : "HUB_REACHED";
  return "IN_TRANSIT";
}

export function tripPosition(trip: VehicleTrip, line: RouteLine): { position: LngLat; headingDeg: number } {
  const base = pointAlong(line, trip.travelledKm);
  const headingDeg = headingAlong(line, trip.travelledKm);
  if (trip.deviationKm <= 0) return { position: base, headingDeg };
  const lateral = normalizeHeading(headingDeg + 90 * trip.deviationSide);
  return { position: offsetPoint(base, lateral, trip.deviationKm), headingDeg };
}

/** Intermediate hub stops still ahead (excludes the destination and the current hub). */
export function remainingIntermediateStops(trip: VehicleTrip, route: Route): number {
  const lastIndex = route.stops.length - 1;
  let count = 0;
  for (let index = Math.max(1, trip.nextStopIndex); index < lastIndex; index += 1) {
    if (route.stops[index].hubId !== trip.atHubId) count += 1;
  }
  return count;
}

export function nextStopIndexFor(route: Route, travelledKm: number): number {
  const index = route.stops.findIndex((stop, position) => position > 0 && stop.distanceKm > travelledKm + 0.05);
  return index === -1 ? route.stops.length - 1 : index;
}

export function progressPct(trip: VehicleTrip | undefined): number {
  if (!trip) return 0;
  if (trip.phase === "LAST_MILE") return 99;
  return Math.max(0, Math.min(99, Math.round((trip.travelledKm / trip.totalKm) * 100)));
}

export function stationaryMinutes(trip: VehicleTrip, nowMs: number): number {
  if (!trip.stationarySince || trip.phase !== "EN_ROUTE") return 0;
  return Math.max(0, (nowMs - Date.parse(trip.stationarySince)) / MINUTE);
}

export function hubDwellMinutes(trip: VehicleTrip, nowMs: number): number {
  if (trip.phase !== "AT_HUB" || !trip.hubArrivedAt) return 0;
  return Math.max(0, (nowMs - Date.parse(trip.hubArrivedAt)) / MINUTE);
}

/** Builds the deterministic ETA input for a shipment in its current state. */
export function buildEtaInput(params: {
  shipment: ShipmentRecord;
  trip?: VehicleTrip;
  vehicle?: VehicleRecord;
  route: Route;
  nowMs: number;
  previousEtaAt?: string;
}): EtaInput {
  const { shipment, trip, vehicle, route, nowMs } = params;
  const now = new Date(nowMs);
  const base: EtaInput = {
    shipmentId: shipment.id,
    now,
    originalEtaAt: shipment.originalEtaAt,
    promisedDeliveryAt: shipment.promisedDeliveryAt,
    previousEtaAt: params.previousEtaAt,
    remainingKm: route.plannedDistanceKm,
    remainingHubStops: Math.max(0, route.stops.length - 2),
    currentHubDwellMinutes: 0,
    currentHubRemainingMinutes: 0,
    trafficDelayMinutes: 0,
    stationaryMinutes: 0,
    historicalFactor: 1,
    deviationDetourMinutes: 0,
    inLastMile: false,
    lastMileRemainingMinutes: 0,
    awaitingPickup: false,
    plannedDurationMinutes: route.plannedDurationMinutes,
    scheduledPickupAt: shipment.scheduledPickupAt,
    dataFreshnessAt: vehicle?.lastGpsAt ?? shipment.lastUpdatedAt,
  };

  if (!trip || shipment.status === "ORDER_BOOKED") {
    return { ...base, awaitingPickup: true, dataFreshnessAt: shipment.lastUpdatedAt };
  }

  if (trip.phase === "LAST_MILE") {
    const remaining = trip.lastMileUntil ? (Date.parse(trip.lastMileUntil) - nowMs) / MINUTE : 30;
    return { ...base, inLastMile: true, lastMileRemainingMinutes: remaining, remainingKm: 0, remainingHubStops: 0 };
  }

  const dwell = hubDwellMinutes(trip, nowMs);
  let hubRemaining = 0;
  if (trip.phase === "AT_HUB") {
    hubRemaining = trip.holdUntilExceptionClosed
      ? 30
      : Math.max(0, trip.dwellUntil ? (Date.parse(trip.dwellUntil) - nowMs) / MINUTE : 0);
    // At the destination hub the planned last-mile allowance covers sorting
    // plus the delivery run.
    if (isAtDestinationHub(trip, route)) {
      return {
        ...base,
        inLastMile: true,
        lastMileRemainingMinutes: hubRemaining + LAST_MILE_RUN_MINUTES,
        remainingKm: 0,
        remainingHubStops: 0,
        currentHubDwellMinutes: dwell,
      };
    }
  }

  return {
    ...base,
    remainingKm: Math.max(0, trip.totalKm - trip.travelledKm),
    remainingHubStops: remainingIntermediateStops(trip, route),
    currentHubDwellMinutes: dwell,
    currentHubRemainingMinutes: hubRemaining,
    trafficDelayMinutes: trip.trafficDelayMinutes,
    stationaryMinutes: stationaryMinutes(trip, nowMs),
    historicalFactor: trip.historicalFactor,
    deviationDetourMinutes:
      trip.deviationKm > 0 ? Math.round(((trip.deviationKm * 2.4) / ETA_MODEL.plannedAverageSpeedKph) * 60 + 12) : 0,
  };
}
