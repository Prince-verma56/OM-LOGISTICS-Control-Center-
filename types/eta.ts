import type { RiskLevel } from "@/lib/constants/statuses";

export interface EtaFactor {
  key: string;
  label: string;
  impactMinutes: number;
}

export interface EtaPrediction {
  shipmentId: string;

  predictedEtaAt: string;
  previousEtaAt?: string;

  generatedAt: string;

  /** Minutes the prediction slips past the original ETA (0 when on/ahead of plan). */
  delayMinutes: number;
  /** 0..1 */
  confidence: number;

  riskLevel: RiskLevel;

  factors: Array<{
    key: string;
    label: string;
    impactMinutes: number;
  }>;

  /* ---- Enrichments (brain/00 §8: predictions must show freshness) ---- */
  /** Minutes between promised delivery and the prediction (negative = late). */
  bufferMinutes: number;
  /** Freshness of the position the prediction was based on. */
  dataFreshnessAt: string;
  /** Short human-readable explanation (brain/20 §7). */
  explanation: string;
}

/** Deterministic inputs to the demo ETA rules (brain/20 §2, §4). */
export interface EtaInput {
  shipmentId: string;
  now: Date;
  originalEtaAt: string;
  promisedDeliveryAt: string;
  previousEtaAt?: string;
  remainingKm: number;
  remainingHubStops: number;
  /** Minutes spent so far at the current hub (0 when not at a hub). */
  currentHubDwellMinutes: number;
  /** Expected minutes still to spend at the current hub before departure. */
  currentHubRemainingMinutes: number;
  trafficDelayMinutes: number;
  /** Minutes the vehicle has been stationary outside a hub. */
  stationaryMinutes: number;
  /** Lane-level historical adjustment, e.g. 1.05 = 5% slower than plan. */
  historicalFactor: number;
  /** Extra detour minutes caused by a route deviation. */
  deviationDetourMinutes: number;
  /** True once the trunk leg is complete and the shipment is in last mile. */
  inLastMile: boolean;
  /** Remaining last-mile minutes when in last mile. */
  lastMileRemainingMinutes: number;
  /** True before pickup — ETA uses the full planned duration from pickup. */
  awaitingPickup: boolean;
  plannedDurationMinutes: number;
  /** Scheduled pickup when awaiting pickup. */
  scheduledPickupAt?: string;
  dataFreshnessAt: string;
}
