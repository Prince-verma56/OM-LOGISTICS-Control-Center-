import type { DataFreshness, RiskLevel, VehicleStatus } from "@/lib/constants/statuses";
import type { GeoPoint } from "./geo";

export type { VehicleStatus };

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;

  status: VehicleStatus;

  currentLocation: GeoPoint;

  currentShipmentIds: string[];

  lastGpsAt: string;

  /* ---- Control-tower enrichments (additive to the base contract) ---- */
  homeHubId: string;
  routeId?: string;
  /** Highest risk among the shipments the vehicle carries. */
  riskLevel: RiskLevel;
  /** Trip completion, 0..100. */
  progressPct?: number;
  gpsFreshness: DataFreshness;
  /** Human-readable nearest place, e.g. "Near Agra, UP". */
  locationLabel: string;
  /** Hub the vehicle is currently parked/processing at, if any. */
  atHubId?: string;
  /** Next hub on the trip, if any. */
  nextHubId?: string;
}

/** Compact position update streamed on every simulation tick. */
export interface VehiclePositionUpdate {
  id: string;
  lat: number;
  lng: number;
  headingDeg: number;
  speedKph: number;
  status: VehicleStatus;
  riskLevel: RiskLevel;
  progressPct?: number;
  recordedAt: string;
}
