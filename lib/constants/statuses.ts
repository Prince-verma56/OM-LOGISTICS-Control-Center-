/**
 * Canonical status vocabularies for the control tower.
 *
 * Every union type in `types/` derives from these arrays so that Zod schemas,
 * UI labels and API contracts share one source of truth.
 */

export type Tone = "neutral" | "info" | "good" | "warning" | "serious" | "critical";

/* -------------------------------------------------------------------------- */
/* Shipment                                                                   */
/* -------------------------------------------------------------------------- */

export const SHIPMENT_STATUSES = [
  "ORDER_BOOKED",
  "PICKED_UP",
  "IN_TRANSIT",
  "HUB_REACHED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const ACTIVE_SHIPMENT_STATUSES: readonly ShipmentStatus[] = SHIPMENT_STATUSES.filter(
  (status) => status !== "DELIVERED",
);

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  ORDER_BOOKED: "Order Booked",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  HUB_REACHED: "Hub Reached",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

/** Milestone labels used on the journey timeline (presentation wording). */
export const SHIPMENT_MILESTONE_LABELS: Record<ShipmentStatus, string> = {
  ORDER_BOOKED: "Order Booked",
  PICKED_UP: "Shipment Picked Up",
  IN_TRANSIT: "In Transit",
  HUB_REACHED: "Hub Reached",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

export const SHIPMENT_STATUS_TONES: Record<ShipmentStatus, Tone> = {
  ORDER_BOOKED: "neutral",
  PICKED_UP: "info",
  IN_TRANSIT: "info",
  HUB_REACHED: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "good",
};

export const SHIPMENT_SCOPES = ["active", "delivered", "all"] as const;
export type ShipmentScope = (typeof SHIPMENT_SCOPES)[number];

export const SHIPMENT_SORT_FIELDS = ["risk", "eta", "delay", "lastUpdated", "trackingNumber"] as const;
export type ShipmentSortField = (typeof SHIPMENT_SORT_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const SHIPMENT_EVENT_TYPES = [
  "ORDER_BOOKED",
  "PICKED_UP",
  "DEPARTED_ORIGIN",
  "HUB_REACHED",
  "HUB_DEPARTED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "ETA_REVISED",
  "EXCEPTION_RAISED",
] as const;
export type ShipmentEventType = (typeof SHIPMENT_EVENT_TYPES)[number];

export const DATA_SOURCES = ["DEMO", "TMS", "WMS", "GPS_PROVIDER", "HUB_SYSTEM"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

/* -------------------------------------------------------------------------- */
/* Risk                                                                       */
/* -------------------------------------------------------------------------- */

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "On track",
  MEDIUM: "Watch",
  HIGH: "At risk",
  CRITICAL: "Critical",
};

export const RISK_TONES: Record<RiskLevel, Tone> = {
  LOW: "good",
  MEDIUM: "warning",
  HIGH: "serious",
  CRITICAL: "critical",
};

export const RISK_RANK: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

export const AT_RISK_LEVELS: readonly RiskLevel[] = ["HIGH", "CRITICAL"];

/* -------------------------------------------------------------------------- */
/* Fleet                                                                      */
/* -------------------------------------------------------------------------- */

export const VEHICLE_STATUSES = ["MOVING", "IDLE", "STOPPED", "OFFLINE"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  MOVING: "Moving",
  IDLE: "Idle",
  STOPPED: "Stopped",
  OFFLINE: "Offline",
};

export const VEHICLE_STATUS_TONES: Record<VehicleStatus, Tone> = {
  MOVING: "good",
  IDLE: "neutral",
  STOPPED: "warning",
  OFFLINE: "critical",
};

export const DATA_FRESHNESS_STATES = ["FRESH", "STALE", "OFFLINE", "UNKNOWN"] as const;
export type DataFreshness = (typeof DATA_FRESHNESS_STATES)[number];

export const DATA_FRESHNESS_LABELS: Record<DataFreshness, string> = {
  FRESH: "Fresh",
  STALE: "Stale",
  OFFLINE: "Offline",
  UNKNOWN: "Unknown",
};

export const DATA_FRESHNESS_TONES: Record<DataFreshness, Tone> = {
  FRESH: "good",
  STALE: "warning",
  OFFLINE: "critical",
  UNKNOWN: "neutral",
};

/* -------------------------------------------------------------------------- */
/* Hubs                                                                       */
/* -------------------------------------------------------------------------- */

export const HUB_STATUSES = ["NORMAL", "BUSY", "CONGESTED"] as const;
export type HubStatus = (typeof HUB_STATUSES)[number];

export const HUB_STATUS_LABELS: Record<HubStatus, string> = {
  NORMAL: "Normal",
  BUSY: "Busy",
  CONGESTED: "Congested",
};

export const HUB_STATUS_TONES: Record<HubStatus, Tone> = {
  NORMAL: "good",
  BUSY: "warning",
  CONGESTED: "critical",
};

export const HUB_VISIT_STATUSES = ["UPCOMING", "ARRIVED", "WAITING", "PROCESSING", "DEPARTED"] as const;
export type HubVisitStatus = (typeof HUB_VISIT_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/* Exceptions                                                                 */
/* -------------------------------------------------------------------------- */

export const EXCEPTION_TYPES = [
  "DELAY_RISK",
  "HUB_DWELL",
  "NO_MOVEMENT",
  "ROUTE_DEVIATION",
  "TRAFFIC",
  "STALE_GPS",
  "MISSED_MILESTONE",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  DELAY_RISK: "Delay risk",
  HUB_DWELL: "Hub dwell",
  NO_MOVEMENT: "No movement",
  ROUTE_DEVIATION: "Route deviation",
  TRAFFIC: "Traffic",
  STALE_GPS: "Stale GPS",
  MISSED_MILESTONE: "Missed milestone",
};

export const EXCEPTION_SEVERITIES = ["INFO", "WARNING", "HIGH", "CRITICAL"] as const;
export type ExceptionSeverity = (typeof EXCEPTION_SEVERITIES)[number];

export const EXCEPTION_SEVERITY_LABELS: Record<ExceptionSeverity, string> = {
  INFO: "Info",
  WARNING: "Warning",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const EXCEPTION_SEVERITY_TONES: Record<ExceptionSeverity, Tone> = {
  INFO: "info",
  WARNING: "warning",
  HIGH: "serious",
  CRITICAL: "critical",
};

export const EXCEPTION_SEVERITY_RANK: Record<ExceptionSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export const EXCEPTION_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const EXCEPTION_STATUS_LABELS: Record<ExceptionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const EXCEPTION_STATUS_TONES: Record<ExceptionStatus, Tone> = {
  OPEN: "critical",
  IN_PROGRESS: "warning",
  RESOLVED: "good",
  DISMISSED: "neutral",
};

export const OPEN_EXCEPTION_STATUSES: readonly ExceptionStatus[] = ["OPEN", "IN_PROGRESS"];

/**
 * Allowed exception workflow transitions (brain/09_ERROR_HANDLING.md §6).
 * A same-status update is permitted for OPEN/IN_PROGRESS so operators can
 * reassign or add notes without changing state.
 */
export const EXCEPTION_STATUS_TRANSITIONS: Record<ExceptionStatus, readonly ExceptionStatus[]> = {
  OPEN: ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"],
  IN_PROGRESS: ["IN_PROGRESS", "RESOLVED", "DISMISSED"],
  RESOLVED: [],
  DISMISSED: [],
};

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_TEMPLATES = [
  "SHIPMENT_UPDATE",
  "DELAY_NOTICE",
  "REVISED_ETA",
  "TRACKING_LINK",
] as const;
export type NotificationTemplate = (typeof NOTIFICATION_TEMPLATES)[number];

export const NOTIFICATION_TEMPLATE_LABELS: Record<NotificationTemplate, string> = {
  SHIPMENT_UPDATE: "Shipment update",
  DELAY_NOTICE: "Delay notice",
  REVISED_ETA: "Revised ETA",
  TRACKING_LINK: "Tracking link",
};

export const NOTIFICATION_STATUSES = ["TRIGGERED", "DELIVERED", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_SEVERITIES = ["INFO", "SUCCESS", "WARNING", "CRITICAL"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export const NOTIFICATION_SEVERITY_TONES: Record<NotificationSeverity, Tone> = {
  INFO: "info",
  SUCCESS: "good",
  WARNING: "warning",
  CRITICAL: "critical",
};

/* -------------------------------------------------------------------------- */
/* Route intelligence                                                         */
/* -------------------------------------------------------------------------- */

export const TRAFFIC_STATES = ["CLEAR", "MODERATE", "HEAVY"] as const;
export type TrafficState = (typeof TRAFFIC_STATES)[number];

export const TRAFFIC_STATE_LABELS: Record<TrafficState, string> = {
  CLEAR: "Clear",
  MODERATE: "Moderate",
  HEAVY: "Heavy traffic",
};

export const TRAFFIC_STATE_TONES: Record<TrafficState, Tone> = {
  CLEAR: "good",
  MODERATE: "warning",
  HEAVY: "critical",
};
