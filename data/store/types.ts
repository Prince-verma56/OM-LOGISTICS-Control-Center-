import type { DemoScenarioTrigger, SimulationSpeed } from "@/types/realtime";
import type { Exception, ExceptionAuditEntry } from "@/types/exception";
import type { EtaPrediction } from "@/types/eta";
import type { GpsPoint } from "@/types/geo";
import type { HubVisit } from "@/types/hub";
import type { KpiSnapshot } from "@/types/kpi";
import type { DemoNotification } from "@/types/notification";
import type { Route } from "@/types/route";
import type { Shipment, ShipmentEvent } from "@/types/shipment";
import type { HubStatus, VehicleStatus } from "@/lib/constants/statuses";
import type { RouteLine } from "@/lib/map/geo";

/**
 * Internal record shapes of the in-memory demo store. These never leave the
 * data layer: repositories map them to the public contracts in `types/`.
 */

export interface CustomerRecord {
  id: string;
  name: string;
  segment: string;
  homeHubId: string;
}

export interface HubRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  status: HubStatus;
  arrivals: number;
  departures: number;
  /** Shipments held in the hub's WMS that are not individually modelled. */
  baselineInventory: number;
  baselineDwellMinutes: number;
  averageDwellMinutes: number;
  activeShipments: number;
}

export interface VehicleRecord {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  homeHubId: string;
  status: VehicleStatus;
  lat: number;
  lng: number;
  headingDeg: number;
  speedKph: number;
  lastGpsAt: string;
  shipmentIds: string[];
}

export type TripPhase = "EN_ROUTE" | "AT_HUB" | "LAST_MILE" | "IDLE";

/** Simulation-owned state of a vehicle's current trip. */
export interface VehicleTrip {
  vehicleId: string;
  routeId: string;
  phase: TripPhase;
  travelledKm: number;
  totalKm: number;
  departedAt: string;
  /** Index into route.stops of the next hub to reach. */
  nextStopIndex: number;
  atHubId?: string;
  hubArrivedAt?: string;
  dwellUntil?: string;
  lastMileUntil?: string;
  idleUntil?: string;
  cruiseSpeedKph: number;
  /** Expected congestion delay still ahead (realised as the vehicle crawls). */
  trafficDelayMinutes: number;
  /** Lateral offset from the planned corridor, km. */
  deviationKm: number;
  deviationSide: 1 | -1;
  deviationTicksRemaining?: number;
  /** Set while stationary outside a hub. */
  stationarySince?: string;
  /** An organic stoppage ends at this time (scenario holds use the exception instead). */
  stationaryUntil?: string;
  /** Vehicle stays put until this exception is closed by operations. */
  holdUntilExceptionClosed?: string;
  /** Scenario fixture held in a steady on-plan state until triggered. */
  fixtureHold: boolean;
  offline: boolean;
  /** GPS feed recovers at this time. */
  offlineUntil?: string;
  /** Lane historical factor (1.0 = plan). */
  historicalFactor: number;
}

export interface ShipmentRecord extends Shipment {
  /** Scheduled pickup for ORDER_BOOKED shipments. */
  scheduledPickupAt?: string;
  /** Last ETA a customer was notified about (dedupe for REVISED_ETA). */
  lastNotifiedEtaAt?: string;
  /** Last risk a DELAY_NOTICE was sent for. */
  lastNotifiedRisk?: Shipment["riskLevel"];
  /** ETA before the most recent material revision (shown as "previous ETA"). */
  previousEtaAt?: string;
  /** Simulated time of the last material ETA revision (notification cool-down). */
  lastEtaRevisionAt?: string;
  /** Last adverse cause observed (e.g. "Heavy traffic detected"), kept after it is realised. */
  lastDelayCause?: string;
}

export interface SimulationRuntime {
  running: boolean;
  speed: SimulationSpeed;
  tick: number;
  simNowMs: number;
  lastTickAt?: number;
  rngState: number;
  activeScenarios: Set<DemoScenarioTrigger>;
  autoNotificationsThisTick: number;
}

export interface DashboardBaseline {
  activeShipments: number;
  vehiclesInTransit: number;
  atRiskShipments: number;
  onTimeDeliveryPct: number;
  openExceptions: number;
}

export interface Counters {
  event: number;
  gps: number;
  exception: number;
  notification: number;
  audit: number;
  shipment: number;
  trackingSeq: number;
  realtime: number;
}

export interface DemoDataset {
  seed: number;
  seededAtMs: number;
  customers: Map<string, CustomerRecord>;
  hubs: Map<string, HubRecord>;
  routes: Map<string, Route>;
  routeLines: Map<string, RouteLine>;
  vehicles: Map<string, VehicleRecord>;
  trips: Map<string, VehicleTrip>;
  shipments: Map<string, ShipmentRecord>;
  shipmentIdByTracking: Map<string, string>;
  shipmentIdByToken: Map<string, string>;
  events: Map<string, ShipmentEvent[]>;
  hubVisits: Map<string, HubVisit[]>;
  gps: Map<string, GpsPoint[]>;
  eta: Map<string, EtaPrediction>;
  exceptions: Map<string, Exception>;
  audit: Map<string, ExceptionAuditEntry[]>;
  /** Newest first. */
  notifications: DemoNotification[];
  notificationKeys: Set<string>;
  kpiHistory: KpiSnapshot[];
  /** KPI values captured on the first summary after (re)seeding. */
  baseline?: DashboardBaseline;
  counters: Counters;
  sim: SimulationRuntime;
}
