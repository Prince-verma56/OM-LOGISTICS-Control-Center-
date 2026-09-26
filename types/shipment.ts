import type {
  DataSource,
  RiskLevel,
  ShipmentEventType,
  ShipmentStatus,
} from "@/lib/constants/statuses";
import type { EtaPrediction } from "./eta";
import type { ExceptionListItem } from "./exception";
import type { Vehicle } from "./fleet";
import type { GeoPoint } from "./geo";
import type { HubVisit } from "./hub";
import type { DemoNotification } from "./notification";
import type { Route } from "./route";

export type { GeoPoint, RiskLevel, ShipmentStatus };

export interface Shipment {
  id: string;
  trackingNumber: string;

  customerId: string;
  customerName: string;

  origin: string;
  destination: string;

  originLat: number;
  originLng: number;

  destinationLat: number;
  destinationLng: number;

  status: ShipmentStatus;

  vehicleId?: string;
  vehicleNumber?: string;
  routeId: string;

  bookedAt: string;
  pickedUpAt?: string;

  promisedDeliveryAt: string;
  originalEtaAt: string;
  revisedEtaAt?: string;

  deliveredAt?: string;

  delayMinutes: number;

  riskLevel: RiskLevel;

  currentLocation?: GeoPoint;

  lastUpdatedAt: string;

  /* ---- Control-tower enrichments (additive to the base contract) ---- */
  /** Opaque, unguessable token for the public tracking page (ADR-005). */
  publicTrackingToken: string;
  /** Trip completion 0..100. */
  progressPct: number;
  /** Hub the shipment is currently at (HUB_REACHED). */
  currentHubId?: string;
  nextHubId?: string;
  /** Nearest-place description of the current location, e.g. "Near Agra, UP". */
  locationLabel?: string;
  /** Short explanation when delayed or at risk (brain/20 §7). */
  delayReason?: string;
  /** Marks the curated demo scenario shipments (A–F). */
  demoScenario?: string;
}

/** A normalized operational event (brain/02_TRD.md §8: source + timestamps). */
export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  type: ShipmentEventType;
  title: string;
  description?: string;
  locationLabel?: string;
  hubId?: string;
  occurredAt: string;
  receivedAt: string;
  source: DataSource;
}

export type MilestoneState = "COMPLETED" | "CURRENT" | "UPCOMING" | "DELAYED";

export interface ShipmentMilestone {
  status: ShipmentStatus;
  label: string;
  state: MilestoneState;
  occurredAt?: string;
  expectedAt?: string;
  locationLabel?: string;
}

export interface ShipmentDetail {
  shipment: Shipment;
  timeline: ShipmentMilestone[];
  vehicle?: Vehicle;
  route: Route;
  eta: EtaPrediction;
  exceptions: ExceptionListItem[];
  notifications: DemoNotification[];
  hubHistory: HubVisit[];
  recentEvents: ShipmentEvent[];
  trackingUrl: string;
}

/**
 * Customer-facing projection (GET /api/v1/public/tracking/:token).
 * Deliberately excludes: customer IDs, risk metadata, exception notes,
 * vehicle/driver data, internal identifiers and precise GPS.
 */
export interface PublicTrackingView {
  trackingNumber: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  bookedAt: string;
  promisedDeliveryAt: string;
  originalEtaAt: string;
  revisedEtaAt?: string;
  deliveredAt?: string;
  delayMinutes: number;
  delayReason?: string;
  progressPct: number;
  latestLocation?: {
    label: string;
    /** Rounded to ~10 km precision for privacy. */
    approxLat: number;
    approxLng: number;
    recordedAt: string;
  };
  timeline: Array<{
    status: ShipmentStatus;
    label: string;
    state: MilestoneState;
    occurredAt?: string;
    locationLabel?: string;
  }>;
  lastUpdatedAt: string;
  isSimulated: true;
}
