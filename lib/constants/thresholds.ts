/**
 * Business-rule thresholds (brain/11_ALERTING_NOTIFICATIONS.md §8,
 * brain/23_ENVIRONMENT_CONFIG.md). These are defaults: the server reads
 * environment overrides through `lib/config/app.ts#getThresholds()`.
 */
export interface Thresholds {
  /** A vehicle stationary longer than this (outside a hub) raises NO_MOVEMENT. */
  noMovementMinutes: number;
  /** Hub dwell above this raises a HUB_DWELL warning. */
  hubDwellWarningMinutes: number;
  /** Hub dwell above this escalates HUB_DWELL to HIGH. */
  hubDwellCriticalMinutes: number;
  /** A revised ETA moving by at least this much triggers a REVISED_ETA notification. */
  etaNotificationDeltaMinutes: number;
  /** GPS older than this is STALE. */
  staleGpsMinutes: number;
  /** GPS older than this is OFFLINE. */
  offlineGpsMinutes: number;
  /** Distance from the planned corridor that counts as a ROUTE_DEVIATION. */
  routeDeviationMeters: number;
  /** Traffic impact above this raises a TRAFFIC exception. */
  trafficExceptionMinutes: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  noMovementMinutes: 30,
  hubDwellWarningMinutes: 45,
  hubDwellCriticalMinutes: 90,
  etaNotificationDeltaMinutes: 30,
  staleGpsMinutes: 20,
  offlineGpsMinutes: 60,
  routeDeviationMeters: 1000,
  trafficExceptionMinutes: 45,
};

/**
 * Delay-risk bands, expressed as the buffer (in minutes) between the predicted
 * ETA and the promised delivery time. Positive buffer = early.
 * brain/20_AI_INTELLIGENCE_SPEC.md §5.
 */
export const RISK_BUFFER_MINUTES = {
  /** LOW when the shipment is ahead of promise by at least this buffer. */
  comfortable: 90,
  /** HIGH when predicted to be late by up to this many minutes; CRITICAL beyond. */
  severeBreach: 180,
} as const;

/** ETA model constants (deterministic demo rules, not a trained model). */
export const ETA_MODEL = {
  /** Planning speed used for remaining-route time, including short breaks. */
  plannedAverageSpeedKph: 45,
  /** Expected processing time per remaining intermediate hub. */
  expectedHubDwellMinutes: 40,
  /** Last-mile allowance once the trunk vehicle reaches the destination city. */
  lastMileMinutes: 75,
  /** Confidence bounds. */
  minConfidence: 0.35,
  maxConfidence: 0.97,
} as const;

/** Hub load bands used to derive NORMAL / BUSY / CONGESTED. */
export const HUB_LOAD_BANDS = {
  busyActiveShipments: 45,
  congestedActiveShipments: 70,
  busyDwellMinutes: 55,
  congestedDwellMinutes: 85,
} as const;
