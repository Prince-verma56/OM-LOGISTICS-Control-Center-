import { recomputeHubStats } from "@/data/store/hub-stats";
import type { Counters, DemoDataset } from "@/data/store/types";
import type { Thresholds } from "@/lib/constants/thresholds";
import type { SimulationSpeed } from "@/types/realtime";
import { buildCustomers } from "./customers";
import { buildExceptions } from "./exceptions";
import { buildHubs } from "./hubs";
import { buildKpiHistory } from "./kpi-history";
import { buildNotifications } from "./notifications";
import { createRng } from "./prng";
import { buildRoutes } from "./routes";
import { buildOperations } from "./shipments";
import { buildVehicles } from "./vehicles";

export interface SeedOptions {
  seed: number;
  /** Wall-clock anchor; the simulated clock starts here. */
  anchorMs: number;
  trackingSecret: string;
  thresholds: Thresholds;
  simulation: { running: boolean; speed: SimulationSpeed };
}

/**
 * Generates the complete demo dataset. Deterministic for a given
 * (seed, anchor) pair — timestamps are relative to the anchor so the demo
 * always looks current.
 */
export function generateDemoDataset(options: SeedOptions): DemoDataset {
  const nowMs = Math.floor(options.anchorMs / 60_000) * 60_000;
  const counters: Counters = {
    event: 0,
    gps: 0,
    exception: 0,
    notification: 0,
    audit: 0,
    shipment: 0,
    trackingSeq: 0,
    realtime: 0,
  };

  // Independent streams so adding data to one area does not reshuffle others.
  const geoRng = createRng(options.seed);
  const fleetRng = createRng(options.seed + 1);
  const opsRng = createRng(options.seed + 2);
  const exceptionRng = createRng(options.seed + 3);
  const notificationRng = createRng(options.seed + 4);
  const kpiRng = createRng(options.seed + 5);

  const hubs = new Map(buildHubs(geoRng).map((hub) => [hub.id, hub]));
  const built = buildRoutes(geoRng);
  const routes = new Map(built.routes.map((route) => [route.id, route]));
  const customers = buildCustomers(fleetRng);
  const vehicles = new Map(buildVehicles(fleetRng).map((vehicle) => [vehicle.id, vehicle]));

  const operations = buildOperations({
    rng: opsRng,
    nowMs,
    trackingSecret: options.trackingSecret,
    counters,
    customers,
    hubs,
    routes,
    lines: built.lines,
    historicalFactors: built.historicalFactors,
    vehicles,
  });

  const { exceptions, audit } = buildExceptions({
    rng: exceptionRng,
    nowMs,
    counters,
    thresholds: options.thresholds,
    hubs,
    routes,
    lines: built.lines,
    vehicles,
    trips: operations.trips,
    shipments: operations.shipments,
  });

  const { notifications, keys } = buildNotifications({
    rng: notificationRng,
    nowMs,
    counters,
    shipments: operations.shipments,
    hubVisits: operations.hubVisits,
    hubs,
  });

  const dataset: DemoDataset = {
    seed: options.seed,
    seededAtMs: options.anchorMs,
    customers: new Map(customers.map((customer) => [customer.id, customer])),
    hubs,
    routes,
    routeLines: built.lines,
    vehicles,
    trips: operations.trips,
    shipments: operations.shipments,
    shipmentIdByTracking: new Map([...operations.shipments.values()].map((s) => [s.trackingNumber, s.id])),
    shipmentIdByToken: new Map([...operations.shipments.values()].map((s) => [s.publicTrackingToken, s.id])),
    events: operations.events,
    hubVisits: operations.hubVisits,
    gps: operations.gps,
    eta: operations.eta,
    exceptions,
    audit,
    notifications,
    notificationKeys: keys,
    kpiHistory: buildKpiHistory(kpiRng, nowMs),
    counters,
    sim: {
      running: options.simulation.running,
      speed: options.simulation.speed,
      tick: 0,
      simNowMs: nowMs,
      rngState: (options.seed ^ 0x9e3779b9) >>> 0,
      activeScenarios: new Set(),
      autoNotificationsThisTick: 0,
    },
  };

  recomputeHubStats(dataset, nowMs);
  return dataset;
}

export { SEED_VOLUMES } from "./shipments";
