import type { DataFreshness, HubStatus } from "@/lib/constants/statuses";
import { HUB_LOAD_BANDS, type Thresholds } from "@/lib/constants/thresholds";
import { distanceFromLineMeters, type RouteLine } from "@/lib/map/geo";
import type { LngLat } from "@/types/geo";
import type { RouteDeviationResult } from "@/types/route";

/**
 * Deterministic detection rules (brain/11, brain/20). Pure functions so they
 * are unit-testable and reusable by future real-data consumers.
 */

export function detectRouteDeviation(
  position: LngLat,
  plannedLine: RouteLine,
  thresholds: Pick<Thresholds, "routeDeviationMeters">,
  detectedAt: string,
): RouteDeviationResult {
  const distanceFromRouteMeters = Math.round(distanceFromLineMeters(position, plannedLine));
  const ratio = distanceFromRouteMeters / thresholds.routeDeviationMeters;
  return {
    deviated: distanceFromRouteMeters > thresholds.routeDeviationMeters,
    distanceFromRouteMeters,
    detectedAt,
    // Confidence rises with distance beyond the corridor, capped.
    confidence: Math.round(Math.min(0.98, Math.max(0.5, 0.45 + ratio * 0.18)) * 100) / 100,
  };
}

export function gpsFreshness(
  lastGpsAt: string,
  now: Date,
  thresholds: Pick<Thresholds, "staleGpsMinutes" | "offlineGpsMinutes">,
): DataFreshness {
  const last = Date.parse(lastGpsAt);
  if (Number.isNaN(last)) return "UNKNOWN";
  const ageMinutes = (now.getTime() - last) / 60_000;
  if (ageMinutes > thresholds.offlineGpsMinutes) return "OFFLINE";
  if (ageMinutes > thresholds.staleGpsMinutes) return "STALE";
  return "FRESH";
}

export function hubStatusFor(activeShipments: number, averageDwellMinutes: number): HubStatus {
  if (
    activeShipments >= HUB_LOAD_BANDS.congestedActiveShipments ||
    averageDwellMinutes >= HUB_LOAD_BANDS.congestedDwellMinutes
  ) {
    return "CONGESTED";
  }
  if (activeShipments >= HUB_LOAD_BANDS.busyActiveShipments || averageDwellMinutes >= HUB_LOAD_BANDS.busyDwellMinutes) {
    return "BUSY";
  }
  return "NORMAL";
}

export type HubDwellSeverity = "NONE" | "WARNING" | "HIGH";

export function hubDwellSeverity(
  dwellMinutes: number,
  thresholds: Pick<Thresholds, "hubDwellWarningMinutes" | "hubDwellCriticalMinutes">,
): HubDwellSeverity {
  if (dwellMinutes > thresholds.hubDwellCriticalMinutes) return "HIGH";
  if (dwellMinutes > thresholds.hubDwellWarningMinutes) return "WARNING";
  return "NONE";
}

export function isNoMovement(stationaryMinutes: number, thresholds: Pick<Thresholds, "noMovementMinutes">): boolean {
  return stationaryMinutes > thresholds.noMovementMinutes;
}
