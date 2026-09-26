import type {
  CustomerRecord,
  DashboardBaseline,
  HubRecord,
  ShipmentRecord,
  VehicleRecord,
  VehicleTrip,
} from "@/data/store/types";
import type { RouteLine } from "@/lib/map/geo";
import type { EtaPrediction } from "@/types/eta";
import type { Exception, ExceptionAuditEntry } from "@/types/exception";
import type { GpsPoint } from "@/types/geo";
import type { HubVisit } from "@/types/hub";
import type { KpiSnapshot } from "@/types/kpi";
import type { DemoNotification } from "@/types/notification";
import type { Route } from "@/types/route";
import type { ShipmentEvent } from "@/types/shipment";

/**
 * Repository contracts (ADR-003). Services depend only on these interfaces.
 *
 * Phase 1: `Dummy*Repository` implementations over the in-memory demo store.
 * Later:   Prisma/PostgreSQL repositories fed by TMS / WMS / GPS / traffic
 *          adapters implement the same contracts — the UI and API do not change.
 *
 * Methods are async so database-backed implementations are drop-in.
 */

export interface ShipmentRepository {
  list(): Promise<ShipmentRecord[]>;
  getById(id: string): Promise<ShipmentRecord | undefined>;
  getByTrackingNumber(trackingNumber: string): Promise<ShipmentRecord | undefined>;
  getByPublicToken(token: string): Promise<ShipmentRecord | undefined>;
  update(id: string, patch: Partial<ShipmentRecord>): Promise<ShipmentRecord | undefined>;
  listEvents(shipmentId: string): Promise<ShipmentEvent[]>;
  appendEvent(event: ShipmentEvent): Promise<void>;
  listHubVisits(shipmentId: string): Promise<HubVisit[]>;
  getEta(shipmentId: string): Promise<EtaPrediction | undefined>;
  saveEta(prediction: EtaPrediction): Promise<void>;
  listCustomers(): Promise<CustomerRecord[]>;
}

export interface RouteRepository {
  list(): Promise<Route[]>;
  getById(id: string): Promise<Route | undefined>;
  /** Planned polyline as a GeoJSON feature for spatial rules. */
  getLine(id: string): Promise<RouteLine | undefined>;
}

export interface FleetRepository {
  list(): Promise<VehicleRecord[]>;
  getById(id: string): Promise<VehicleRecord | undefined>;
  getTrip(vehicleId: string): Promise<VehicleTrip | undefined>;
  listTrips(): Promise<VehicleTrip[]>;
  listGps(vehicleId: string, limit?: number): Promise<GpsPoint[]>;
}

export interface HubRepository {
  list(): Promise<HubRecord[]>;
  getById(id: string): Promise<HubRecord | undefined>;
}

export interface ExceptionRepository {
  list(): Promise<Exception[]>;
  getById(id: string): Promise<Exception | undefined>;
  create(exception: Exception, audit: ExceptionAuditEntry): Promise<Exception>;
  update(id: string, patch: Partial<Exception>, audit?: ExceptionAuditEntry): Promise<Exception | undefined>;
  listAudit(exceptionId: string): Promise<ExceptionAuditEntry[]>;
  nextId(): Promise<string>;
  nextAuditId(): Promise<string>;
}

export interface NotificationRepository {
  list(limit?: number): Promise<DemoNotification[]>;
  listForShipment(shipmentId: string): Promise<DemoNotification[]>;
  add(notification: DemoNotification, dedupeKey?: string): Promise<void>;
  hasKey(dedupeKey: string): Promise<boolean>;
  nextId(): Promise<string>;
}

export interface AnalyticsRepository {
  listKpiHistory(): Promise<KpiSnapshot[]>;
  getBaseline(): Promise<DashboardBaseline | undefined>;
  setBaseline(baseline: DashboardBaseline): Promise<void>;
}

/**
 * Operational clock. Demo: the simulated clock (advances with the simulator).
 * Production: wall-clock time.
 */
export interface ClockProvider {
  now(): Date;
}

export interface Repositories {
  /** Where the data comes from — surfaced in the UI as DEMO DATA. */
  source: "DEMO";
  clock: ClockProvider;
  shipments: ShipmentRepository;
  routes: RouteRepository;
  fleet: FleetRepository;
  hubs: HubRepository;
  exceptions: ExceptionRepository;
  notifications: NotificationRepository;
  analytics: AnalyticsRepository;
}
