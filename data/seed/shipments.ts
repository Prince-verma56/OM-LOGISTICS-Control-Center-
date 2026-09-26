import {
  ACTIVE_SCENARIOS,
  DELIVERED_SCENARIO,
  RESERVED_TRACKING_NUMBERS,
  type ActiveScenarioFixture,
} from "@/data/fixtures/demo-scenarios";
import {
  buildEtaInput,
  hubDwellMinutes,
  nextStopIndexFor,
  progressPct,
  shipmentStatusForTrip,
  tripPosition,
} from "@/data/store/trip-math";
import type {
  Counters,
  CustomerRecord,
  HubRecord,
  ShipmentRecord,
  TripPhase,
  VehicleRecord,
  VehicleTrip,
} from "@/data/store/types";
import { RISK_RANK } from "@/lib/constants/statuses";
import { ETA_MODEL } from "@/lib/constants/thresholds";
import { computeEta } from "@/lib/intelligence/eta";
import { describeLocation, pointAlong, round6, type RouteLine } from "@/lib/map/geo";
import type { EtaPrediction } from "@/types/eta";
import type { GpsPoint, LngLat } from "@/types/geo";
import type { HubVisit } from "@/types/hub";
import type { Route } from "@/types/route";
import type { ShipmentEvent } from "@/types/shipment";
import { PLACE_LIST } from "./geography";
import type { Rng } from "./prng";
import { MINUTE_MS, hubVisit, isoAt, makeEvent } from "./shipment-events";
import { trackingToken } from "./tokens";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface OperationsContext {
  rng: Rng;
  nowMs: number;
  trackingSecret: string;
  counters: Counters;
  customers: CustomerRecord[];
  hubs: Map<string, HubRecord>;
  routes: Map<string, Route>;
  lines: Map<string, RouteLine>;
  historicalFactors: Map<string, number>;
  vehicles: Map<string, VehicleRecord>;
}

export interface OperationsResult {
  trips: Map<string, VehicleTrip>;
  shipments: Map<string, ShipmentRecord>;
  events: Map<string, ShipmentEvent[]>;
  hubVisits: Map<string, HubVisit[]>;
  gps: Map<string, GpsPoint[]>;
  eta: Map<string, EtaPrediction>;
}

interface TripPlan {
  vehicle: VehicleRecord;
  route: Route;
  line: RouteLine;
  phase: TripPhase;
  travelledKm: number;
  atHubId?: string;
  dwellSoFar: number;
  dwellPlanned: number;
  lastMileElapsed: number;
  lastMileRemaining: number;
  destinationDwell: number;
  lostMinutes: number;
  shipmentCount: number;
  fixture?: ActiveScenarioFixture;
  offlineMinutes: number;
  trafficDelay: number;
  stationaryMinutes: number;
  deviationKm: number;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

export const SEED_VOLUMES = {
  activeShipments: 500,
  deliveredShipments: 150,
  /** Vehicles veh_001..veh_094 run trips; the rest are idle at their home hub. */
  tripVehicles: 94,
} as const;

const PLANNED_KPH = ETA_MODEL.plannedAverageSpeedKph;
const HUB_DWELL_PLAN = ETA_MODEL.expectedHubDwellMinutes;
const BUFFER_CHOICES = [90, 120, 120, 150, 180, 240];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const driveMinutes = (km: number) => (km / PLANNED_KPH) * 60;

/** Planned line-haul including the lane's historical adjustment (the plan at dispatch). */
function plannedTransitMinutes(route: Route, historicalFactor: number): number {
  return route.plannedDurationMinutes + driveMinutes(route.plannedDistanceKm) * (historicalFactor - 1);
}
const place = (position: LngLat) => describeLocation(position, PLACE_LIST);
const roundUpToHalfHour = (ms: number) => Math.ceil(ms / (30 * MINUTE_MS)) * 30 * MINUTE_MS;

function hubOf(ctx: OperationsContext, hubId: string): HubRecord {
  const hub = ctx.hubs.get(hubId);
  if (!hub) throw new Error(`Unknown hub ${hubId}`);
  return hub;
}

function pickCustomer(ctx: OperationsContext, originHubId: string): CustomerRecord {
  const weights = ctx.customers.map((customer) => (customer.homeHubId === originHubId ? 4 : 1));
  return ctx.rng.weighted(ctx.customers, weights);
}

function nextTrackingNumber(ctx: OperationsContext, used: Set<string>): string {
  let value = `OML${ctx.rng.int(200_000, 999_999)}`;
  while (used.has(value) || RESERVED_TRACKING_NUMBERS.has(value)) value = `OML${ctx.rng.int(200_000, 999_999)}`;
  used.add(value);
  return value;
}

function nextShipmentId(ctx: OperationsContext): string {
  ctx.counters.shipment += 1;
  return `shp_${10_000 + ctx.counters.shipment}`;
}

function lostMinutesSample(rng: Rng): number {
  const roll = rng.next();
  if (roll < 0.07) return rng.float(160, 400);
  if (roll < 0.27) return rng.float(35, 130);
  return Math.max(-20, rng.normal(0, 12));
}

function promisedFrom(rng: Rng, originalEtaMs: number, bufferMinutes?: number): number {
  const buffer = bufferMinutes ?? rng.pick(BUFFER_CHOICES);
  return bufferMinutes !== undefined
    ? originalEtaMs + buffer * MINUTE_MS
    : roundUpToHalfHour(originalEtaMs + buffer * MINUTE_MS);
}

function routesTouchingHub(ctx: OperationsContext, hubId: string): Route[] {
  return [...ctx.routes.values()].filter(
    (route) => route.stops[0].hubId === hubId || route.stops[route.stops.length - 1].hubId === hubId,
  );
}

/* -------------------------------------------------------------------------- */
/* Trip planning                                                              */
/* -------------------------------------------------------------------------- */

function planFixture(ctx: OperationsContext, fixture: ActiveScenarioFixture): TripPlan {
  const vehicle = ctx.vehicles.get(fixture.vehicleId);
  const route = ctx.routes.get(fixture.routeId);
  const line = ctx.lines.get(fixture.routeId);
  if (!vehicle || !route || !line) throw new Error(`Invalid fixture ${fixture.key}`);
  vehicle.vehicleNumber = fixture.vehicleNumber;

  const plan: TripPlan = {
    vehicle,
    route,
    line,
    phase: "EN_ROUTE",
    travelledKm: 0,
    dwellSoFar: 0,
    dwellPlanned: 0,
    lastMileElapsed: 0,
    lastMileRemaining: 0,
    destinationDwell: 0,
    lostMinutes: fixture.lostMinutes,
    shipmentCount: fixture.companionShipments + 1,
    fixture,
    offlineMinutes: 0,
    trafficDelay: 0,
    stationaryMinutes: fixture.stationaryMinutes ?? 0,
    deviationKm: fixture.deviationKm ?? 0,
  };

  const placement = fixture.placement;
  if (placement.kind === "FRACTION") {
    plan.travelledKm = route.plannedDistanceKm * placement.fraction;
  } else {
    const stop = route.stops.find((item) => item.hubId === placement.hubId);
    if (!stop) throw new Error(`Hub ${placement.hubId} not on ${route.id}`);
    if (placement.kind === "AFTER_HUB") {
      plan.travelledKm = stop.distanceKm + placement.offsetKm;
    } else {
      plan.phase = "AT_HUB";
      plan.travelledKm = stop.distanceKm;
      plan.atHubId = placement.hubId;
      plan.dwellSoFar = placement.dwellMinutes;
      plan.dwellPlanned = placement.dwellMinutes + 60;
    }
  }
  return plan;
}

function planOrganic(ctx: OperationsContext, vehicle: VehicleRecord): TripPlan {
  const { rng } = ctx;
  const candidates = routesTouchingHub(ctx, vehicle.homeHubId);
  const route = candidates.length > 0 && rng.chance(0.8) ? rng.pick(candidates) : rng.pick([...ctx.routes.values()]);
  const line = ctx.lines.get(route.id);
  if (!line) throw new Error(`Missing line for ${route.id}`);

  const plan: TripPlan = {
    vehicle,
    route,
    line,
    phase: "EN_ROUTE",
    travelledKm: 0,
    dwellSoFar: 0,
    dwellPlanned: 0,
    lastMileElapsed: 0,
    lastMileRemaining: 0,
    destinationDwell: 0,
    lostMinutes: lostMinutesSample(rng),
    shipmentCount: rng.int(3, 7),
    offlineMinutes: 0,
    trafficDelay: 0,
    stationaryMinutes: 0,
    deviationKm: 0,
  };

  const intermediate = route.stops.slice(1, -1);
  // Phase mix ≈ share of trip time spent in each phase (steady state), so the
  // simulation does not open with a burst of deliveries.
  const roll = rng.next();
  if (roll < 0.04) {
    // Loading at origin — shipments PICKED_UP.
    plan.phase = "AT_HUB";
    plan.atHubId = route.stops[0].hubId;
    plan.dwellSoFar = rng.float(8, 40);
    plan.dwellPlanned = plan.dwellSoFar + rng.float(10, 45);
  } else if (roll < 0.14) {
    if (intermediate.length === 0) {
      // Lanes without transit hubs: treat as en route rather than falling
      // through to the destination-hub branch.
      plan.travelledKm = route.plannedDistanceKm * rng.float(0.04, 0.9);
      return plan;
    }
    const stop = rng.pick(intermediate);
    plan.phase = "AT_HUB";
    plan.travelledKm = stop.distanceKm;
    plan.atHubId = stop.hubId;
    plan.dwellSoFar = rng.float(8, 58);
    plan.dwellPlanned = Math.max(plan.dwellSoFar + 8, rng.float(35, 70));
  } else if (roll < 0.17) {
    const destination = route.stops[route.stops.length - 1];
    plan.phase = "AT_HUB";
    plan.travelledKm = destination.distanceKm;
    plan.atHubId = destination.hubId;
    plan.dwellSoFar = rng.float(5, 30);
    plan.dwellPlanned = plan.dwellSoFar + rng.float(8, 30);
    plan.lostMinutes = Math.min(plan.lostMinutes, 90);
  } else if (roll < 0.22) {
    plan.phase = "LAST_MILE";
    plan.travelledKm = route.plannedDistanceKm;
    plan.destinationDwell = rng.float(20, 45);
    plan.lastMileElapsed = rng.float(5, 40);
    plan.lastMileRemaining = rng.float(15, 70);
    plan.lostMinutes = Math.min(plan.lostMinutes, 90);
  } else {
    plan.travelledKm = route.plannedDistanceKm * rng.float(0.04, 0.95);
    // Avoid parking exactly on an intermediate hub.
    for (const stop of intermediate) {
      if (Math.abs(stop.distanceKm - plan.travelledKm) < 4) plan.travelledKm = stop.distanceKm + 6;
    }
  }
  return plan;
}

/* -------------------------------------------------------------------------- */
/* Main builder                                                               */
/* -------------------------------------------------------------------------- */

export function buildOperations(ctx: OperationsContext): OperationsResult {
  const { rng, nowMs } = ctx;
  const result: OperationsResult = {
    trips: new Map(),
    shipments: new Map(),
    events: new Map(),
    hubVisits: new Map(),
    gps: new Map(),
    eta: new Map(),
  };
  const usedTracking = new Set<string>();
  const vehicles = [...ctx.vehicles.values()];

  /* ---------------- Trip plans ---------------- */
  const plans: TripPlan[] = ACTIVE_SCENARIOS.map((fixture) => planFixture(ctx, fixture));
  const fixtureVehicleIds = new Set(plans.map((plan) => plan.vehicle.id));
  vehicles.forEach((vehicle, index) => {
    if (fixtureVehicleIds.has(vehicle.id) || index >= SEED_VOLUMES.tripVehicles) return;
    plans.push(planOrganic(ctx, vehicle));
  });

  // Organic incidents on a few en-route vehicles.
  const organicEnRoute = plans.filter((plan) => !plan.fixture && plan.phase === "EN_ROUTE");
  const shuffled = rng.shuffle(organicEnRoute);
  shuffled.slice(0, 4).forEach((plan) => (plan.offlineMinutes = rng.float(28, 110)));
  shuffled.slice(4, 10).forEach((plan) => (plan.trafficDelay = Math.round(rng.float(50, 140))));
  shuffled.slice(10, 12).forEach((plan) => (plan.stationaryMinutes = rng.float(34, 52)));
  shuffled.slice(12, 13).forEach((plan) => (plan.deviationKm = rng.float(1.8, 2.6)));

  /* ---------------- Materialize trips ---------------- */
  for (const plan of plans) {
    materializeTrip(ctx, plan, result, usedTracking);
  }

  /* ---------------- Idle vehicles ---------------- */
  vehicles.forEach((vehicle, index) => {
    if (index < SEED_VOLUMES.tripVehicles || fixtureVehicleIds.has(vehicle.id)) return;
    const hub = hubOf(ctx, vehicle.homeHubId);
    vehicle.status = "IDLE";
    vehicle.lat = hub.latitude + rng.float(-0.01, 0.01);
    vehicle.lng = hub.longitude + rng.float(-0.01, 0.01);
    vehicle.speedKph = 0;
    vehicle.headingDeg = rng.int(0, 359);
    vehicle.lastGpsAt = isoAt(nowMs - rng.float(0.2, 3) * MINUTE_MS);
    result.gps.set(vehicle.id, idleGpsTrail(ctx, vehicle));
  });

  /* ---------------- Order-booked (awaiting pickup) ---------------- */
  const assigned = [...result.shipments.values()].length;
  const toBook = Math.max(0, SEED_VOLUMES.activeShipments - assigned);
  const hubWeights = [...ctx.routes.values()].map((route) => hubOf(ctx, route.stops[0].hubId).baselineInventory);
  for (let index = 0; index < toBook; index += 1) {
    const route = rng.weighted([...ctx.routes.values()], hubWeights);
    createBookedShipment(ctx, route, result, usedTracking);
  }

  /* ---------------- Delivered ---------------- */
  createDeliveredShipment(ctx, ctx.routes.get(DELIVERED_SCENARIO.routeId)!, result, usedTracking, {
    trackingNumber: DELIVERED_SCENARIO.trackingNumber,
    customerId: DELIVERED_SCENARIO.customerId,
    deliveredHoursAgo: DELIVERED_SCENARIO.deliveredHoursAgo,
  });
  for (let index = 1; index < SEED_VOLUMES.deliveredShipments; index += 1) {
    createDeliveredShipment(ctx, rng.pick([...ctx.routes.values()]), result, usedTracking);
  }

  /* ---------------- ETA + risk for active shipments ---------------- */
  for (const shipment of result.shipments.values()) {
    if (shipment.status === "DELIVERED") continue;
    const trip = shipment.vehicleId ? result.trips.get(shipment.vehicleId) : undefined;
    const vehicle = shipment.vehicleId ? ctx.vehicles.get(shipment.vehicleId) : undefined;
    const route = ctx.routes.get(shipment.routeId)!;
    const prediction = computeEta(buildEtaInput({ shipment, trip, vehicle, route, nowMs }));
    applyPrediction(shipment, prediction);
    result.eta.set(shipment.id, prediction);
  }

  // Vehicle risk = highest risk of carried shipments.
  for (const vehicle of vehicles) {
    vehicle.shipmentIds = vehicle.shipmentIds.filter((id) => result.shipments.has(id));
  }

  return result;
}

export function applyPrediction(shipment: ShipmentRecord, prediction: EtaPrediction): void {
  shipment.revisedEtaAt = prediction.predictedEtaAt;
  shipment.delayMinutes = prediction.delayMinutes;
  shipment.riskLevel = prediction.riskLevel;
  shipment.delayReason =
    RISK_RANK[prediction.riskLevel] >= RISK_RANK.MEDIUM || prediction.delayMinutes > 15
      ? prediction.explanation
      : undefined;
  shipment.lastNotifiedEtaAt ??= prediction.predictedEtaAt;
  shipment.lastNotifiedRisk ??= prediction.riskLevel;
  if (prediction.delayMinutes >= 30) {
    shipment.previousEtaAt = shipment.originalEtaAt;
    prediction.previousEtaAt = shipment.originalEtaAt;
  }
}

/* -------------------------------------------------------------------------- */
/* Trip materialization                                                       */
/* -------------------------------------------------------------------------- */

function materializeTrip(
  ctx: OperationsContext,
  plan: TripPlan,
  result: OperationsResult,
  usedTracking: Set<string>,
): void {
  const { rng, nowMs } = ctx;
  const { route, vehicle, line } = plan;
  const lastIndex = route.stops.length - 1;
  const passedStops = route.stops.filter(
    (stop, index) => index > 0 && index < lastIndex && stop.distanceKm < plan.travelledKm - 0.05,
  );

  // Elapsed time since departing the origin hub.
  const historicalFactor = ctx.historicalFactors.get(route.id) ?? 1;
  let elapsed = driveMinutes(plan.travelledKm) * historicalFactor + passedStops.length * HUB_DWELL_PLAN + plan.lostMinutes;
  const atOrigin = plan.phase === "AT_HUB" && plan.atHubId === route.stops[0].hubId;
  if (plan.phase === "AT_HUB" && !atOrigin) elapsed += plan.dwellSoFar;
  if (plan.phase === "LAST_MILE") elapsed += plan.destinationDwell + plan.lastMileElapsed;
  if (plan.stationaryMinutes > 0) elapsed += plan.stationaryMinutes;

  // For vehicles still loading at origin, departure is planned for the future.
  const departedAtMs = atOrigin
    ? nowMs + (plan.dwellPlanned - plan.dwellSoFar) * MINUTE_MS
    : nowMs - Math.max(elapsed, 20) * MINUTE_MS;

  const trip: VehicleTrip = {
    vehicleId: vehicle.id,
    routeId: route.id,
    phase: plan.phase,
    travelledKm: plan.travelledKm,
    totalKm: route.plannedDistanceKm,
    departedAt: isoAt(departedAtMs),
    nextStopIndex: 1,
    atHubId: plan.atHubId,
    cruiseSpeedKph: rng.float(41, 52),
    trafficDelayMinutes: plan.trafficDelay,
    deviationKm: plan.deviationKm,
    deviationSide: rng.chance(0.5) ? 1 : -1,
    fixtureHold: Boolean(plan.fixture?.fixtureHold),
    offline: plan.offlineMinutes > 0,
    historicalFactor,
  };
  if (plan.phase === "AT_HUB") {
    trip.hubArrivedAt = isoAt(nowMs - plan.dwellSoFar * MINUTE_MS);
    trip.dwellUntil = isoAt(nowMs + Math.max(4, plan.dwellPlanned - plan.dwellSoFar) * MINUTE_MS);
    trip.nextStopIndex = Math.min(lastIndex, route.stops.findIndex((stop) => stop.hubId === plan.atHubId) + 1);
  } else if (plan.phase === "LAST_MILE") {
    trip.nextStopIndex = lastIndex;
    trip.lastMileUntil = isoAt(nowMs + plan.lastMileRemaining * MINUTE_MS);
  } else {
    trip.nextStopIndex = nextStopIndexFor(route, plan.travelledKm);
  }
  if (plan.stationaryMinutes > 0) {
    trip.stationarySince = isoAt(nowMs - plan.stationaryMinutes * MINUTE_MS);
    if (!plan.fixture) trip.stationaryUntil = isoAt(nowMs + rng.float(20, 80) * MINUTE_MS);
  }
  if (trip.offline) trip.offlineUntil = isoAt(nowMs + rng.float(120, 480) * MINUTE_MS);
  result.trips.set(vehicle.id, trip);

  /* ---- Vehicle state ---- */
  const { position, headingDeg } = tripPosition(trip, line);
  vehicle.lat = round6(position[1]);
  vehicle.lng = round6(position[0]);
  vehicle.headingDeg = Math.round(headingDeg);
  if (trip.offline) {
    vehicle.status = "OFFLINE";
    vehicle.speedKph = Math.round(rng.float(30, 50));
    vehicle.lastGpsAt = isoAt(nowMs - plan.offlineMinutes * MINUTE_MS);
  } else {
    const stopped = plan.phase === "AT_HUB" || plan.stationaryMinutes > 0;
    vehicle.status = stopped ? "STOPPED" : "MOVING";
    vehicle.speedKph = stopped ? 0 : Math.round(plan.phase === "LAST_MILE" ? rng.float(14, 26) : trip.cruiseSpeedKph);
    vehicle.lastGpsAt = isoAt(nowMs - rng.float(0.1, 1.5) * MINUTE_MS);
  }

  /* ---- Hub visits for the trip ---- */
  const visits = tripHubVisits(ctx, plan, trip, departedAtMs, atOrigin);

  /* ---- GPS trail ---- */
  result.gps.set(vehicle.id, tripGpsTrail(ctx, plan, trip, departedAtMs));

  /* ---- Shipments ---- */
  const status = shipmentStatusForTrip(trip, route);
  const originHub = hubOf(ctx, route.stops[0].hubId);
  const destinationHub = hubOf(ctx, route.stops[lastIndex].hubId);
  const originalEtaMs =
    departedAtMs + (plannedTransitMinutes(route, historicalFactor) + ETA_MODEL.lastMileMinutes) * MINUTE_MS;
  const locationLabel = trip.atHubId ? hubOf(ctx, trip.atHubId).name : place(position);

  for (let index = 0; index < plan.shipmentCount; index += 1) {
    const isLead = index === 0 && plan.fixture;
    const customer = isLead
      ? ctx.customers.find((item) => item.id === plan.fixture!.customerId)!
      : pickCustomer(ctx, originHub.id);
    const trackingNumber = isLead ? plan.fixture!.trackingNumber : nextTrackingNumber(ctx, usedTracking);
    const id = nextShipmentId(ctx);
    const pickedUpMs = Math.min(departedAtMs, nowMs) - rng.float(20, 90) * MINUTE_MS;
    const bookedMs = pickedUpMs - rng.float(180, 1_800) * MINUTE_MS;
    const promisedMs = promisedFrom(rng, originalEtaMs, isLead ? plan.fixture!.bufferMinutes : undefined);

    const shipment: ShipmentRecord = {
      id,
      trackingNumber,
      customerId: customer.id,
      customerName: customer.name,
      origin: route.origin,
      destination: route.destination,
      originLat: originHub.latitude,
      originLng: originHub.longitude,
      destinationLat: destinationHub.latitude,
      destinationLng: destinationHub.longitude,
      status,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      routeId: route.id,
      bookedAt: isoAt(bookedMs),
      pickedUpAt: isoAt(pickedUpMs),
      promisedDeliveryAt: isoAt(promisedMs),
      originalEtaAt: isoAt(originalEtaMs),
      delayMinutes: 0,
      riskLevel: "LOW",
      currentLocation: {
        lat: vehicle.lat,
        lng: vehicle.lng,
        headingDeg: vehicle.headingDeg,
        speedKph: vehicle.speedKph,
        recordedAt: vehicle.lastGpsAt,
      },
      lastUpdatedAt: vehicle.lastGpsAt,
      publicTrackingToken: trackingToken(id, ctx.trackingSecret),
      progressPct: progressPct(trip),
      currentHubId: status === "HUB_REACHED" ? trip.atHubId : undefined,
      nextHubId: route.stops[trip.nextStopIndex]?.hubId,
      locationLabel,
      demoScenario: isLead ? plan.fixture!.key : undefined,
    };
    result.shipments.set(id, shipment);
    vehicle.shipmentIds.push(id);
    result.hubVisits.set(id, visits.map((visit) => ({ ...visit })));
    result.events.set(id, tripShipmentEvents(ctx, shipment, plan, trip, visits, departedAtMs));
  }
}

function tripHubVisits(
  ctx: OperationsContext,
  plan: TripPlan,
  trip: VehicleTrip,
  departedAtMs: number,
  atOrigin: boolean,
): HubVisit[] {
  const { rng, nowMs } = ctx;
  const { route } = plan;
  const lastIndex = route.stops.length - 1;
  const visits: HubVisit[] = [];

  route.stops.forEach((stop, index) => {
    const hub = hubOf(ctx, stop.hubId);
    if (index === 0) {
      visits.push(
        atOrigin
          ? hubVisit(hub, {
              arrivedAt: trip.hubArrivedAt,
              dwellMinutes: Math.round(plan.dwellSoFar),
              status: "PROCESSING",
            })
          : hubVisit(hub, { departedAt: isoAt(departedAtMs), status: "DEPARTED" }),
      );
      return;
    }
    const isCurrent = plan.phase === "AT_HUB" && stop.hubId === plan.atHubId;
    if (isCurrent) {
      visits.push(
        hubVisit(hub, {
          arrivedAt: trip.hubArrivedAt,
          dwellMinutes: Math.round(plan.dwellSoFar),
          status: plan.dwellSoFar > HUB_DWELL_PLAN ? "WAITING" : "PROCESSING",
        }),
      );
      return;
    }
    const passed =
      (index < lastIndex && stop.distanceKm < plan.travelledKm - 0.05) || (index === lastIndex && plan.phase === "LAST_MILE");
    if (passed) {
      const share = plan.travelledKm > 0 ? stop.distanceKm / plan.travelledKm : 1;
      const arrivedMs =
        index === lastIndex
          ? nowMs - (plan.lastMileElapsed + plan.destinationDwell) * MINUTE_MS
          : departedAtMs +
            (driveMinutes(stop.distanceKm) + (index - 1) * HUB_DWELL_PLAN + plan.lostMinutes * share) * MINUTE_MS;
      const dwell = index === lastIndex ? plan.destinationDwell : rng.float(26, 56);
      visits.push(
        hubVisit(hub, {
          arrivedAt: isoAt(arrivedMs),
          departedAt: isoAt(Math.min(arrivedMs + dwell * MINUTE_MS, nowMs - MINUTE_MS)),
          dwellMinutes: Math.round(dwell),
          status: "DEPARTED",
        }),
      );
      return;
    }
    visits.push(hubVisit(hub, { status: "UPCOMING" }));
  });
  return visits;
}

function tripShipmentEvents(
  ctx: OperationsContext,
  shipment: ShipmentRecord,
  plan: TripPlan,
  trip: VehicleTrip,
  visits: HubVisit[],
  departedAtMs: number,
): ShipmentEvent[] {
  const { counters, nowMs } = ctx;
  const originHub = hubOf(ctx, plan.route.stops[0].hubId);
  const events: ShipmentEvent[] = [
    makeEvent(counters, {
      shipmentId: shipment.id,
      type: "ORDER_BOOKED",
      occurredAt: shipment.bookedAt,
      title: "Order booked",
      description: `${shipment.customerName} booked ${plan.route.origin} → ${plan.route.destination}.`,
      locationLabel: originHub.city,
    }),
    makeEvent(counters, {
      shipmentId: shipment.id,
      type: "PICKED_UP",
      occurredAt: shipment.pickedUpAt!,
      title: `Picked up — ${originHub.name}`,
      locationLabel: originHub.name,
      hubId: originHub.id,
    }),
  ];

  if (departedAtMs <= nowMs) {
    events.push(
      makeEvent(counters, {
        shipmentId: shipment.id,
        type: "DEPARTED_ORIGIN",
        occurredAt: isoAt(departedAtMs),
        title: `Departed ${originHub.name}`,
        description: `Line-haul on ${plan.route.corridor} with ${plan.vehicle.vehicleNumber}.`,
        locationLabel: originHub.name,
        hubId: originHub.id,
      }),
    );
  }

  visits.slice(1).forEach((visit) => {
    if (visit.arrivedAt) {
      events.push(
        makeEvent(counters, {
          shipmentId: shipment.id,
          type: "HUB_REACHED",
          occurredAt: visit.arrivedAt,
          title: `Reached ${visit.hubName}`,
          locationLabel: visit.hubName,
          hubId: visit.hubId,
        }),
      );
    }
    if (visit.departedAt && visit.status === "DEPARTED") {
      const isDestination = visit.hubId === plan.route.stops[plan.route.stops.length - 1].hubId;
      events.push(
        makeEvent(counters, {
          shipmentId: shipment.id,
          type: isDestination ? "OUT_FOR_DELIVERY" : "HUB_DEPARTED",
          occurredAt: visit.departedAt,
          title: isDestination ? `Out for delivery — ${plan.route.destination}` : `Departed ${visit.hubName}`,
          locationLabel: visit.hubName,
          hubId: visit.hubId,
        }),
      );
    }
  });

  if (plan.lostMinutes > 45 && trip.phase !== "AT_HUB") {
    events.push(
      makeEvent(counters, {
        shipmentId: shipment.id,
        type: "ETA_REVISED",
        occurredAt: isoAt(nowMs - Math.min(plan.lostMinutes, 180) * 0.4 * MINUTE_MS),
        title: "ETA revised",
        description: `Running ~${Math.round(plan.lostMinutes)} min behind plan.`,
      }),
    );
  }

  return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

function tripGpsTrail(ctx: OperationsContext, plan: TripPlan, trip: VehicleTrip, departedAtMs: number): GpsPoint[] {
  const { rng, nowMs, counters } = ctx;
  const vehicle = plan.vehicle;
  const endMs = Math.min(nowMs, Date.parse(vehicle.lastGpsAt));
  const startMs = Math.min(departedAtMs, endMs - 30 * MINUTE_MS);
  const count = plan.travelledKm < 1 ? 6 : rng.int(56, 72);
  const points: GpsPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const fraction = count === 1 ? 1 : index / (count - 1);
    const km = plan.travelledKm * fraction;
    let [lng, lat] = pointAlong(plan.line, km);
    if (trip.deviationKm > 0 && fraction > 0.82) {
      const scaled = { ...trip, travelledKm: km, deviationKm: trip.deviationKm * ((fraction - 0.82) / 0.18) };
      [lng, lat] = tripPosition(scaled, plan.line).position;
    }
    const recordedMs = startMs + (endMs - startMs) * fraction;
    counters.gps += 1;
    points.push({
      id: `gps_${counters.gps.toString(36).padStart(6, "0")}`,
      vehicleId: vehicle.id,
      latitude: round6(lat),
      longitude: round6(lng),
      speedKph: Math.round(plan.travelledKm < 1 ? 0 : rng.float(28, 62)),
      headingDeg: vehicle.headingDeg,
      recordedAt: isoAt(recordedMs),
      receivedAt: isoAt(recordedMs + rng.float(2, 40) * 1000),
      source: "DEMO",
    });
  }
  return points;
}

function idleGpsTrail(ctx: OperationsContext, vehicle: VehicleRecord): GpsPoint[] {
  const { rng, nowMs, counters } = ctx;
  return Array.from({ length: 4 }, (_, index) => {
    counters.gps += 1;
    const recordedMs = nowMs - (4 - index) * 15 * MINUTE_MS;
    return {
      id: `gps_${counters.gps.toString(36).padStart(6, "0")}`,
      vehicleId: vehicle.id,
      latitude: round6(vehicle.lat + rng.float(-0.002, 0.002)),
      longitude: round6(vehicle.lng + rng.float(-0.002, 0.002)),
      speedKph: 0,
      headingDeg: vehicle.headingDeg,
      recordedAt: isoAt(recordedMs),
      receivedAt: isoAt(recordedMs + 5_000),
      source: "DEMO" as const,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Booked + delivered shipments                                               */
/* -------------------------------------------------------------------------- */

function createBookedShipment(
  ctx: OperationsContext,
  route: Route,
  result: OperationsResult,
  usedTracking: Set<string>,
): void {
  const { rng, nowMs, counters } = ctx;
  const originHub = hubOf(ctx, route.stops[0].hubId);
  const destinationHub = hubOf(ctx, route.stops[route.stops.length - 1].hubId);
  const customer = pickCustomer(ctx, originHub.id);
  const id = nextShipmentId(ctx);
  const bookedMs = nowMs - rng.float(20, 600) * MINUTE_MS;
  // ~10% of pickups are already overdue (MISSED_MILESTONE candidates).
  const pickupMs = rng.chance(0.1)
    ? nowMs - rng.float(70, 180) * MINUTE_MS
    : nowMs + rng.float(30, 480) * MINUTE_MS;
  const originalEtaMs =
    Math.max(pickupMs, bookedMs) + (route.plannedDurationMinutes + ETA_MODEL.lastMileMinutes) * MINUTE_MS;
  const promisedMs = promisedFrom(rng, originalEtaMs);

  const shipment: ShipmentRecord = {
    id,
    trackingNumber: nextTrackingNumber(ctx, usedTracking),
    customerId: customer.id,
    customerName: customer.name,
    origin: route.origin,
    destination: route.destination,
    originLat: originHub.latitude,
    originLng: originHub.longitude,
    destinationLat: destinationHub.latitude,
    destinationLng: destinationHub.longitude,
    status: "ORDER_BOOKED",
    routeId: route.id,
    bookedAt: isoAt(bookedMs),
    promisedDeliveryAt: isoAt(promisedMs),
    originalEtaAt: isoAt(originalEtaMs),
    delayMinutes: 0,
    riskLevel: "LOW",
    lastUpdatedAt: isoAt(bookedMs),
    publicTrackingToken: trackingToken(id, ctx.trackingSecret),
    progressPct: 0,
    nextHubId: originHub.id,
    locationLabel: `Awaiting pickup · ${originHub.name}`,
    scheduledPickupAt: isoAt(pickupMs),
  };
  result.shipments.set(id, shipment);
  result.hubVisits.set(
    id,
    route.stops.map((stop) => hubVisit(hubOf(ctx, stop.hubId), { status: "UPCOMING" })),
  );
  result.events.set(id, [
    makeEvent(counters, {
      shipmentId: id,
      type: "ORDER_BOOKED",
      occurredAt: shipment.bookedAt,
      title: "Order booked",
      description: `Pickup scheduled at ${originHub.name}.`,
      locationLabel: originHub.city,
    }),
  ]);
}

function createDeliveredShipment(
  ctx: OperationsContext,
  route: Route,
  result: OperationsResult,
  usedTracking: Set<string>,
  fixture?: { trackingNumber: string; customerId: string; deliveredHoursAgo: number },
): void {
  const { rng, nowMs, counters } = ctx;
  const originHub = hubOf(ctx, route.stops[0].hubId);
  const destinationHub = hubOf(ctx, route.stops[route.stops.length - 1].hubId);
  const customer = fixture
    ? ctx.customers.find((item) => item.id === fixture.customerId)!
    : pickCustomer(ctx, originHub.id);
  const id = nextShipmentId(ctx);

  // Skew delivery dates toward the recent past (last 30 days).
  const hoursAgo = fixture ? fixture.deliveredHoursAgo : Math.min(29 * 24, 2 + Math.pow(rng.next(), 1.6) * 29 * 24);
  const deliveredMs = nowMs - hoursAgo * 60 * MINUTE_MS;
  const transitFactor = fixture ? 0.97 : rng.chance(0.86) ? rng.float(0.9, 1.04) : rng.float(1.08, 1.3);
  const transitMinutes = route.plannedDurationMinutes * transitFactor + ETA_MODEL.lastMileMinutes;
  const departedMs = deliveredMs - transitMinutes * MINUTE_MS;
  const pickedUpMs = departedMs - rng.float(20, 90) * MINUTE_MS;
  const bookedMs = pickedUpMs - rng.float(180, 1_800) * MINUTE_MS;
  const originalEtaMs = departedMs + (route.plannedDurationMinutes + ETA_MODEL.lastMileMinutes) * MINUTE_MS;
  const promisedMs = promisedFrom(rng, originalEtaMs, fixture ? 120 : undefined);
  const carrier = rng.pick([...ctx.vehicles.values()]);
  const lastPredictionMs = deliveredMs + rng.normal(0, 26) * MINUTE_MS;
  const onTime = deliveredMs <= promisedMs;

  const shipment: ShipmentRecord = {
    id,
    trackingNumber: fixture ? fixture.trackingNumber : nextTrackingNumber(ctx, usedTracking),
    customerId: customer.id,
    customerName: customer.name,
    origin: route.origin,
    destination: route.destination,
    originLat: originHub.latitude,
    originLng: originHub.longitude,
    destinationLat: destinationHub.latitude,
    destinationLng: destinationHub.longitude,
    status: "DELIVERED",
    vehicleId: carrier.id,
    vehicleNumber: carrier.vehicleNumber,
    routeId: route.id,
    bookedAt: isoAt(bookedMs),
    pickedUpAt: isoAt(pickedUpMs),
    promisedDeliveryAt: isoAt(promisedMs),
    originalEtaAt: isoAt(originalEtaMs),
    revisedEtaAt: isoAt(lastPredictionMs),
    deliveredAt: isoAt(deliveredMs),
    delayMinutes: Math.max(0, Math.round((deliveredMs - originalEtaMs) / MINUTE_MS)),
    riskLevel: onTime ? "LOW" : "HIGH",
    currentLocation: {
      lat: destinationHub.latitude,
      lng: destinationHub.longitude,
      recordedAt: isoAt(deliveredMs),
    },
    lastUpdatedAt: isoAt(deliveredMs),
    publicTrackingToken: trackingToken(id, ctx.trackingSecret),
    progressPct: 100,
    locationLabel: `Delivered · ${route.destination}`,
    delayReason: onTime ? undefined : "Delivered after promised time.",
    demoScenario: fixture ? DELIVERED_SCENARIO.key : undefined,
  };
  result.shipments.set(id, shipment);

  // Hub visits and events spread across the transit window.
  const visits: HubVisit[] = [];
  const events: ShipmentEvent[] = [
    makeEvent(counters, {
      shipmentId: id,
      type: "ORDER_BOOKED",
      occurredAt: shipment.bookedAt,
      title: "Order booked",
      locationLabel: originHub.city,
    }),
    makeEvent(counters, {
      shipmentId: id,
      type: "PICKED_UP",
      occurredAt: shipment.pickedUpAt!,
      title: `Picked up — ${originHub.name}`,
      locationLabel: originHub.name,
      hubId: originHub.id,
    }),
    makeEvent(counters, {
      shipmentId: id,
      type: "DEPARTED_ORIGIN",
      occurredAt: isoAt(departedMs),
      title: `Departed ${originHub.name}`,
      locationLabel: originHub.name,
      hubId: originHub.id,
    }),
  ];
  const lastIndex = route.stops.length - 1;
  route.stops.forEach((stop, index) => {
    const hub = hubOf(ctx, stop.hubId);
    if (index === 0) {
      visits.push(hubVisit(hub, { departedAt: isoAt(departedMs), status: "DEPARTED" }));
      return;
    }
    const share = stop.distanceKm / route.plannedDistanceKm;
    const arrivedMs = departedMs + share * (transitMinutes - ETA_MODEL.lastMileMinutes) * MINUTE_MS;
    const dwell = index === lastIndex ? rng.float(20, 45) : rng.float(26, 62);
    const leftMs = Math.min(arrivedMs + dwell * MINUTE_MS, deliveredMs - 20 * MINUTE_MS);
    visits.push(
      hubVisit(hub, { arrivedAt: isoAt(arrivedMs), departedAt: isoAt(leftMs), dwellMinutes: Math.round(dwell), status: "DEPARTED" }),
    );
    events.push(
      makeEvent(counters, {
        shipmentId: id,
        type: "HUB_REACHED",
        occurredAt: isoAt(arrivedMs),
        title: `Reached ${hub.name}`,
        locationLabel: hub.name,
        hubId: hub.id,
      }),
      makeEvent(counters, {
        shipmentId: id,
        type: index === lastIndex ? "OUT_FOR_DELIVERY" : "HUB_DEPARTED",
        occurredAt: isoAt(leftMs),
        title: index === lastIndex ? `Out for delivery — ${route.destination}` : `Departed ${hub.name}`,
        locationLabel: hub.name,
        hubId: hub.id,
      }),
    );
  });
  events.push(
    makeEvent(counters, {
      shipmentId: id,
      type: "DELIVERED",
      occurredAt: shipment.deliveredAt!,
      title: `Delivered — ${route.destination}`,
      description: onTime ? "Delivered within the promised window." : "Delivered after the promised time.",
      locationLabel: route.destination,
    }),
  );
  result.hubVisits.set(id, visits);
  result.events.set(id, events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)));
}

/** Dwell minutes so far for a vehicle at a hub (re-exported for exception seeding). */
export { hubDwellMinutes };
