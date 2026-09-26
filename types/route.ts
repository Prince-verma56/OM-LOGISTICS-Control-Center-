import type { TrafficState } from "@/lib/constants/statuses";
import type { LngLat } from "./geo";

export interface RouteStop {
  hubId: string;
  /** Distance from the route origin, in km. */
  distanceKm: number;
}

export interface Route {
  id: string;
  origin: string;
  destination: string;

  plannedDistanceKm: number;
  plannedDurationMinutes: number;

  /** Planned polyline as [lng, lat] pairs. */
  geometry: Array<[number, number]>;

  /* ---- Enrichments ---- */
  /** Lane code, e.g. "CCU-DEL". */
  code: string;
  /** Ordered hubs on the lane, including origin and destination hubs. */
  stops: RouteStop[];
  /** Highway corridor label, e.g. "NH19". */
  corridor: string;
}

export interface RouteDeviationResult {
  deviated: boolean;
  distanceFromRouteMeters: number;
  detectedAt: string;
  confidence: number;
}

/** Route intelligence for one shipment (GET /api/v1/shipments/:id/route). */
export interface ShipmentRouteView {
  shipmentId: string;
  route: Route;
  /** Actual GPS trail of the carrying vehicle, [lng, lat]. */
  actualTrail: LngLat[];
  currentPosition?: LngLat;
  progressPct: number;
  travelledKm: number;
  remainingKm: number;
  estimatedRemainingMinutes: number;
  trafficState: TrafficState;
  trafficDelayMinutes: number;
  deviation: RouteDeviationResult;
  nextHubId?: string;
  nextHubName?: string;
  generatedAt: string;
}
