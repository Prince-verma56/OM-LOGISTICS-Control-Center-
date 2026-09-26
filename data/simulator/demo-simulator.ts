import { ETA_MODEL } from "@/lib/constants/thresholds";
import type { ShipmentStatus } from "@/lib/constants/statuses";
import { getAppConfig } from "@/lib/config/app";
import { describeLocation, normalizeHeading, round6 } from "@/lib/map/geo";
import type { HubVisit } from "@/types/hub";
import type { Route } from "@/types/route";
import { PLACE_LIST } from "@/data/seed/geography";
import { createRng, type Rng } from "@/data/seed/prng";
import { MINUTE_MS, hubVisit, isoAt, makeEvent } from "@/data/seed/shipment-events";
import { trackingToken } from "@/data/seed/tokens";
import {
  isAtDestinationHub,
  isAtOriginHub,
  nextStopIndexFor,
  progressPct,
  shipmentStatusForTrip,
  tripPosition,
} from "@/data/store/trip-math";
import type { DemoDataset, HubRecord, ShipmentRecord, VehicleRecord, VehicleTrip } from "@/data/store/types";

/**
 * DemoSimulator — the simulated "physical world" behind the dummy data
 * provider. It moves vehicles along planned routes, runs hub dwell, last-mile
 * delivery, new bookings and organic incidents, then reports *what changed*.
 *
 * It deliberately knows nothing about ETA rules, exceptions or notifications:
 * the application services react to the returned `WorldChanges`. A future
 * `ExternalEventConsumer` (real GPS/TMS/WMS feeds) produces the same signals
 * and replaces this module without touching services or UI (brain/19 §7).
 */

export interface StatusChange {
  shipmentId: string;
  trackingNumber: string;
  from: ShipmentStatus;
  to: ShipmentStatus;
  hubId?: string;
}

export interface HubMovement {
  vehicleId: string;
  hubId: string;
  shipmentIds: string[];
  origin: boolean;
  destination: boolean;
}

export interface WorldChanges {
  movedVehicleIds: Set<string>;
  statusChanges: StatusChange[];
  hubArrivals: HubMovement[];
  hubDepartures: HubMovement[];
  deliveries: string[];
  newShipments: string[];
  tripsStarted: string[];
  trafficIncidents: Array<{ vehicleId: string; minutes: number }>;
  gpsLost: string[];
  gpsRecovered: string[];
  stoppages: string[];
  resumed: string[];
  deviationsCleared: string[];
}

export function emptyChanges(): WorldChanges {
  return {
    movedVehicleIds: new Set(),
    statusChanges: [],
    hubArrivals: [],
    hubDepartures: [],
    deliveries: [],
    newShipments: [],
    tripsStarted: [],
    trafficIncidents: [],
    gpsLost: [],
    gpsRecovered: [],
    stoppages: [],
    resumed: [],
    deviationsCleared: [],
  };
}

const MAX_BOOKING_POOL = 80;
const PLANNED_KPH = ETA_MODEL.plannedAverageSpeedKph;

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/** Advances the simulated world by `dtMinutes` (the sim clock is already advanced). */
export function advanceWorld(dataset: DemoDataset, dtMinutes: number): WorldChanges {
  const rng = createRng(dataset.sim.rngState);
  const nowMs = dataset.sim.simNowMs;
  const changes = emptyChanges();

  for (const vehicle of dataset.vehicles.values()) {
    const trip = dataset.trips.get(vehicle.id);
    if (!trip) {
      // Idle at a hub without a trip — dispatch occasionally.
      if (rng.chance(Math.min(0.6, dtMinutes / 90))) startTrip(dataset, vehicle, vehicle.homeHubId, nowMs, rng, changes);
      else refreshIdle(dataset, vehicle, nowMs);
      continue;
    }
    advanceVehicle(dataset, vehicle, trip, dtMinutes, nowMs, rng, changes);
  }

  // Keep a pool of new bookings flowing.
  const pool = [...dataset.shipments.values()].filter((shipment) => shipment.status === "ORDER_BOOKED").length;
  if (pool < MAX_BOOKING_POOL) {
    // ~1 booking per 6 simulated minutes across the network.
    const expected = dtMinutes / 6;
    const bookings = Math.floor(expected) + (rng.chance(expected % 1) ? 1 : 0);
    for (let index = 0; index < bookings; index += 1) {
      const route = rng.pick([...dataset.routes.values()]);
      changes.newShipments.push(createBooking(dataset, route, nowMs, rng).id);
    }
  }

  dataset.sim.rngState = rng.getState();
  return changes;
}

/* -------------------------------------------------------------------------- */
/* Per-vehicle state machine                                                  */
/* -------------------------------------------------------------------------- */

function advanceVehicle(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  dtMinutes: number,
  nowMs: number,
  rng: Rng,
  changes: WorldChanges,
): void {
  const route = dataset.routes.get(trip.routeId);
  const line = dataset.routeLines.get(trip.routeId);
  if (!route || !line) return;

  // Scenario fixture waiting for its trigger: hold a steady, on-plan state.
  if (trip.fixtureHold) {
    holdFixture(dataset, vehicle, trip, dtMinutes, nowMs, rng);
    changes.movedVehicleIds.add(vehicle.id);
    return;
  }

  if (trip.phase === "IDLE") {
    if (trip.idleUntil && nowMs >= Date.parse(trip.idleUntil)) {
      dataset.trips.delete(vehicle.id);
      startTrip(dataset, vehicle, route.stops[route.stops.length - 1].hubId, nowMs, rng, changes);
    } else {
      refreshIdle(dataset, vehicle, nowMs);
    }
    return;
  }

  // GPS offline: no telemetry until the feed recovers.
  if (trip.offline) {
    if (trip.offlineUntil && nowMs >= Date.parse(trip.offlineUntil)) {
      trip.offline = false;
      trip.offlineUntil = undefined;
      // The truck kept driving while dark — catch up at plan pace.
      const darkMinutes = (nowMs - Date.parse(vehicle.lastGpsAt)) / MINUTE_MS;
      if (trip.phase === "EN_ROUTE") {
        const nextStop = route.stops[trip.nextStopIndex];
        trip.travelledKm = Math.min(nextStop.distanceKm - 1, trip.travelledKm + (darkMinutes / 60) * PLANNED_KPH * 0.8);
      }
      vehicle.status = "MOVING";
      changes.gpsRecovered.push(vehicle.id);
      moveTo(dataset, vehicle, trip, nowMs, rng.float(38, 52), changes);
    }
    return;
  }

  switch (trip.phase) {
    case "AT_HUB":
      advanceAtHub(dataset, vehicle, trip, route, nowMs, rng, changes);
      return;
    case "LAST_MILE":
      advanceLastMile(dataset, vehicle, trip, route, dtMinutes, nowMs, rng, changes);
      return;
    case "EN_ROUTE":
      advanceEnRoute(dataset, vehicle, trip, route, dtMinutes, nowMs, rng, changes);
      return;
  }
}

function advanceAtHub(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  route: Route,
  nowMs: number,
  rng: Rng,
  changes: WorldChanges,
): void {
  if (trip.holdUntilExceptionClosed) {
    const exception = dataset.exceptions.get(trip.holdUntilExceptionClosed);
    if (exception && (exception.status === "OPEN" || exception.status === "IN_PROGRESS")) {
      stayPut(dataset, vehicle, trip, nowMs, changes);
      return;
    }
    trip.holdUntilExceptionClosed = undefined;
    trip.dwellUntil = isoAt(nowMs);
  }

  if (!trip.dwellUntil || nowMs < Date.parse(trip.dwellUntil)) {
    stayPut(dataset, vehicle, trip, nowMs, changes);
    markWaiting(dataset, vehicle, trip, nowMs);
    return;
  }

  // Depart the hub.
  const hubId = trip.atHubId!;
  const hub = dataset.hubs.get(hubId);
  const origin = isAtOriginHub(trip, route);
  const destination = isAtDestinationHub(trip, route);
  const shipmentIds = [...vehicle.shipmentIds];
  if (hub) hub.departures += 1;
  changes.hubDepartures.push({ vehicleId: vehicle.id, hubId, shipmentIds, origin, destination });

  for (const shipmentId of shipmentIds) {
    const shipment = dataset.shipments.get(shipmentId);
    if (!shipment) continue;
    closeVisit(dataset, shipmentId, hubId, nowMs);
    if (destination) {
      addEvent(dataset, shipment, "OUT_FOR_DELIVERY", nowMs, `Out for delivery — ${route.destination}`, hub);
    } else if (origin) {
      addEvent(dataset, shipment, "DEPARTED_ORIGIN", nowMs, `Departed ${hub?.name ?? "origin hub"}`, hub);
    } else {
      addEvent(dataset, shipment, "HUB_DEPARTED", nowMs, `Departed ${hub?.name ?? "hub"}`, hub);
    }
  }

  trip.atHubId = undefined;
  trip.hubArrivedAt = undefined;
  trip.dwellUntil = undefined;
  if (destination) {
    trip.phase = "LAST_MILE";
    trip.lastMileUntil = isoAt(nowMs + rng.float(35, 95) * MINUTE_MS);
  } else {
    trip.phase = "EN_ROUTE";
    if (origin) trip.departedAt = isoAt(nowMs);
  }
  setTripShipmentStatus(dataset, vehicle, trip, route, changes);
  moveTo(dataset, vehicle, trip, nowMs, destination ? rng.float(14, 26) : trip.cruiseSpeedKph, changes);
}

function advanceLastMile(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  route: Route,
  dtMinutes: number,
  nowMs: number,
  rng: Rng,
  changes: WorldChanges,
): void {
  const untilMs = trip.lastMileUntil ? Date.parse(trip.lastMileUntil) : nowMs;
  const remaining = Math.max(0, (untilMs - nowMs) / MINUTE_MS);
  const probability = remaining <= 0 ? 1 : Math.min(1, dtMinutes / (remaining + dtMinutes));

  for (const shipmentId of [...vehicle.shipmentIds]) {
    const shipment = dataset.shipments.get(shipmentId);
    if (!shipment || shipment.status === "DELIVERED") continue;
    if (rng.chance(probability)) deliverShipment(dataset, vehicle, shipment, nowMs, changes);
  }

  if (vehicle.shipmentIds.length === 0) {
    trip.phase = "IDLE";
    trip.idleUntil = isoAt(nowMs + rng.float(30, 120) * MINUTE_MS);
    vehicle.status = "IDLE";
    vehicle.speedKph = 0;
    const destinationHub = dataset.hubs.get(route.stops[route.stops.length - 1].hubId);
    if (destinationHub) {
      vehicle.lat = round6(destinationHub.latitude + rng.float(-0.01, 0.01));
      vehicle.lng = round6(destinationHub.longitude + rng.float(-0.01, 0.01));
    }
    vehicle.lastGpsAt = isoAt(nowMs);
    appendGps(dataset, vehicle);
    changes.movedVehicleIds.add(vehicle.id);
    return;
  }

  // Wander within the destination city.
  const destinationHub = dataset.hubs.get(route.stops[route.stops.length - 1].hubId);
  if (destinationHub) {
    const angle = rng.float(0, Math.PI * 2);
    const radius = rng.float(0.01, 0.07);
    vehicle.lat = round6(destinationHub.latitude + Math.sin(angle) * radius);
    vehicle.lng = round6(destinationHub.longitude + Math.cos(angle) * radius);
    vehicle.headingDeg = Math.round(normalizeHeading((angle * 180) / Math.PI));
  }
  vehicle.status = "MOVING";
  vehicle.speedKph = Math.round(rng.float(12, 28));
  vehicle.lastGpsAt = isoAt(nowMs);
  appendGps(dataset, vehicle);
  syncShipmentsToVehicle(dataset, vehicle, trip, route, destinationHub ? `${destinationHub.city} (last mile)` : undefined);
  changes.movedVehicleIds.add(vehicle.id);
}

function advanceEnRoute(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  route: Route,
  dtMinutes: number,
  nowMs: number,
  rng: Rng,
  changes: WorldChanges,
): void {
  // Stationary (organic stoppage or scenario hold).
  if (trip.stationarySince) {
    let resume = false;
    if (trip.holdUntilExceptionClosed) {
      const exception = dataset.exceptions.get(trip.holdUntilExceptionClosed);
      resume = !exception || exception.status === "RESOLVED" || exception.status === "DISMISSED";
      if (resume) trip.holdUntilExceptionClosed = undefined;
    } else if (!trip.stationaryUntil || nowMs >= Date.parse(trip.stationaryUntil)) {
      resume = true;
    }
    if (!resume) {
      stayPut(dataset, vehicle, trip, nowMs, changes);
      return;
    }
    trip.stationarySince = undefined;
    trip.stationaryUntil = undefined;
    changes.resumed.push(vehicle.id);
  }

  // Organic incidents (rare, deterministic stream). Rates are per simulated
  // minute per vehicle: roughly one traffic event every ~10 ticks at 5x across
  // the fleet, stoppages and GPS dropouts much rarer.
  if (rng.chance(0.00008 * dtMinutes)) {
    const minutes = Math.round(rng.float(50, 150));
    trip.trafficDelayMinutes += minutes;
    changes.trafficIncidents.push({ vehicleId: vehicle.id, minutes });
  } else if (rng.chance(0.00003 * dtMinutes)) {
    trip.stationarySince = isoAt(nowMs);
    trip.stationaryUntil = isoAt(nowMs + rng.float(40, 95) * MINUTE_MS);
    changes.stoppages.push(vehicle.id);
    stayPut(dataset, vehicle, trip, nowMs, changes);
    return;
  } else if (rng.chance(0.000015 * dtMinutes)) {
    trip.offline = true;
    trip.offlineUntil = isoAt(nowMs + rng.float(60, 240) * MINUTE_MS);
    vehicle.status = "OFFLINE";
    changes.gpsLost.push(vehicle.id);
    return;
  }

  // Speed: cruise with noise; congestion slows the truck while the expected
  // traffic delay is "realised" (keeps the ETA consistent).
  let speed = Math.min(64, Math.max(28, trip.cruiseSpeedKph + rng.normal(0, 4)));
  if (trip.trafficDelayMinutes > 0) speed *= 0.4;
  const distance = (speed * dtMinutes) / 60;
  if (trip.trafficDelayMinutes > 0) {
    const lost = Math.max(0, dtMinutes - (distance / PLANNED_KPH) * 60);
    trip.trafficDelayMinutes = Math.max(0, Math.round(trip.trafficDelayMinutes - lost));
  }

  const nextStop = route.stops[trip.nextStopIndex];
  const target = trip.travelledKm + distance;

  if (nextStop && target >= nextStop.distanceKm) {
    // Arrive at the next hub (intermediate or destination).
    trip.travelledKm = nextStop.distanceKm;
    trip.phase = "AT_HUB";
    trip.atHubId = nextStop.hubId;
    trip.hubArrivedAt = isoAt(nowMs);
    const destination = trip.nextStopIndex === route.stops.length - 1;
    trip.dwellUntil = isoAt(nowMs + (destination ? rng.float(20, 45) : rng.float(25, 72)) * MINUTE_MS);
    trip.nextStopIndex = Math.min(route.stops.length - 1, trip.nextStopIndex + 1);
    trip.deviationKm = 0;
    trip.deviationTicksRemaining = undefined;

    const hub = dataset.hubs.get(nextStop.hubId);
    if (hub) hub.arrivals += 1;
    const shipmentIds = [...vehicle.shipmentIds];
    changes.hubArrivals.push({ vehicleId: vehicle.id, hubId: nextStop.hubId, shipmentIds, origin: false, destination });
    for (const shipmentId of shipmentIds) {
      const shipment = dataset.shipments.get(shipmentId);
      if (!shipment) continue;
      openVisit(dataset, shipmentId, nextStop.hubId, nowMs);
      addEvent(dataset, shipment, "HUB_REACHED", nowMs, `Reached ${hub?.name ?? "hub"}`, hub);
    }
    setTripShipmentStatus(dataset, vehicle, trip, route, changes);
    stayPut(dataset, vehicle, trip, nowMs, changes);
    return;
  }

  trip.travelledKm = target;
  if (trip.deviationTicksRemaining !== undefined) {
    trip.deviationTicksRemaining -= 1;
    if (trip.deviationTicksRemaining <= 0) {
      trip.deviationKm = 0;
      trip.deviationTicksRemaining = undefined;
      changes.deviationsCleared.push(vehicle.id);
    }
  }
  moveTo(dataset, vehicle, trip, nowMs, speed, changes);
}

/* -------------------------------------------------------------------------- */
/* Movement + telemetry                                                       */
/* -------------------------------------------------------------------------- */

function moveTo(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  nowMs: number,
  speed: number,
  changes: WorldChanges,
): void {
  const route = dataset.routes.get(trip.routeId);
  const line = dataset.routeLines.get(trip.routeId);
  if (!route || !line) return;
  if (trip.phase !== "LAST_MILE") {
    const { position, headingDeg } = tripPosition(trip, line);
    vehicle.lat = round6(position[1]);
    vehicle.lng = round6(position[0]);
    vehicle.headingDeg = Math.round(headingDeg);
  }
  vehicle.status = "MOVING";
  vehicle.speedKph = Math.round(speed);
  vehicle.lastGpsAt = isoAt(nowMs);
  appendGps(dataset, vehicle);
  syncShipmentsToVehicle(dataset, vehicle, trip, route);
  changes.movedVehicleIds.add(vehicle.id);
}

/** Stationary but reporting (GPS heartbeat keeps data fresh). */
function stayPut(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  nowMs: number,
  changes: WorldChanges,
): void {
  const route = dataset.routes.get(trip.routeId);
  vehicle.status = "STOPPED";
  vehicle.speedKph = 0;
  vehicle.lastGpsAt = isoAt(nowMs);
  if (route) syncShipmentsToVehicle(dataset, vehicle, trip, route);
  changes.movedVehicleIds.add(vehicle.id);
}

function refreshIdle(dataset: DemoDataset, vehicle: VehicleRecord, nowMs: number): void {
  vehicle.status = "IDLE";
  vehicle.speedKph = 0;
  vehicle.lastGpsAt = isoAt(nowMs);
}

function appendGps(dataset: DemoDataset, vehicle: VehicleRecord): void {
  const trail = dataset.gps.get(vehicle.id) ?? [];
  dataset.counters.gps += 1;
  trail.push({
    id: `gps_${dataset.counters.gps.toString(36).padStart(6, "0")}`,
    vehicleId: vehicle.id,
    latitude: vehicle.lat,
    longitude: vehicle.lng,
    speedKph: vehicle.speedKph,
    headingDeg: vehicle.headingDeg,
    recordedAt: vehicle.lastGpsAt,
    receivedAt: isoAt(Date.parse(vehicle.lastGpsAt) + 4_000),
    source: "DEMO",
  });
  if (trail.length > 140) trail.splice(0, trail.length - 140);
  dataset.gps.set(vehicle.id, trail);
}

function syncShipmentsToVehicle(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  route: Route,
  labelOverride?: string,
): void {
  const hub = trip.atHubId ? dataset.hubs.get(trip.atHubId) : undefined;
  const label = labelOverride ?? hub?.name ?? describeLocation([vehicle.lng, vehicle.lat], PLACE_LIST);
  const progress = progressPct(trip);
  for (const shipmentId of vehicle.shipmentIds) {
    const shipment = dataset.shipments.get(shipmentId);
    if (!shipment || shipment.status === "DELIVERED") continue;
    shipment.currentLocation = {
      lat: vehicle.lat,
      lng: vehicle.lng,
      headingDeg: vehicle.headingDeg,
      speedKph: vehicle.speedKph,
      recordedAt: vehicle.lastGpsAt,
    };
    shipment.lastUpdatedAt = vehicle.lastGpsAt;
    shipment.locationLabel = label;
    shipment.progressPct = progress;
    shipment.nextHubId = route.stops[trip.nextStopIndex]?.hubId;
  }
}

function setTripShipmentStatus(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  route: Route,
  changes: WorldChanges,
): void {
  const status = shipmentStatusForTrip(trip, route);
  for (const shipmentId of vehicle.shipmentIds) {
    const shipment = dataset.shipments.get(shipmentId);
    if (!shipment || shipment.status === "DELIVERED") continue;
    if (shipment.status !== status) {
      changes.statusChanges.push({
        shipmentId,
        trackingNumber: shipment.trackingNumber,
        from: shipment.status,
        to: status,
        hubId: trip.atHubId,
      });
      shipment.status = status;
    }
    shipment.currentHubId = status === "HUB_REACHED" ? trip.atHubId : undefined;
  }
}

function markWaiting(dataset: DemoDataset, vehicle: VehicleRecord, trip: VehicleTrip, nowMs: number): void {
  if (!trip.hubArrivedAt || !trip.atHubId) return;
  const dwell = (nowMs - Date.parse(trip.hubArrivedAt)) / MINUTE_MS;
  for (const shipmentId of vehicle.shipmentIds) {
    const visit = dataset.hubVisits.get(shipmentId)?.find((item) => item.hubId === trip.atHubId && !item.departedAt);
    if (visit) {
      visit.dwellMinutes = Math.round(dwell);
      visit.status = dwell > ETA_MODEL.expectedHubDwellMinutes ? "WAITING" : "PROCESSING";
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Hub visits, events, deliveries                                             */
/* -------------------------------------------------------------------------- */

function openVisit(dataset: DemoDataset, shipmentId: string, hubId: string, nowMs: number): void {
  const visits = dataset.hubVisits.get(shipmentId);
  const visit = visits?.find((item) => item.hubId === hubId && item.status === "UPCOMING");
  if (visit) {
    visit.arrivedAt = isoAt(nowMs);
    visit.status = "PROCESSING";
    visit.dwellMinutes = 0;
  }
}

function closeVisit(dataset: DemoDataset, shipmentId: string, hubId: string, nowMs: number): void {
  const visit = dataset.hubVisits.get(shipmentId)?.find((item) => item.hubId === hubId && !item.departedAt);
  if (!visit) return;
  visit.departedAt = isoAt(nowMs);
  visit.status = "DEPARTED";
  if (visit.arrivedAt) visit.dwellMinutes = Math.round((nowMs - Date.parse(visit.arrivedAt)) / MINUTE_MS);
}

function addEvent(
  dataset: DemoDataset,
  shipment: ShipmentRecord,
  type: Parameters<typeof makeEvent>[1]["type"],
  nowMs: number,
  title: string,
  hub?: HubRecord,
  description?: string,
): void {
  const events = dataset.events.get(shipment.id) ?? [];
  events.push(
    makeEvent(dataset.counters, {
      shipmentId: shipment.id,
      type,
      occurredAt: isoAt(nowMs),
      title,
      description,
      locationLabel: hub?.name ?? shipment.locationLabel,
      hubId: hub?.id,
    }),
  );
  dataset.events.set(shipment.id, events);
}

export function deliverShipment(
  dataset: DemoDataset,
  vehicle: VehicleRecord | undefined,
  shipment: ShipmentRecord,
  nowMs: number,
  changes: WorldChanges,
): void {
  const from = shipment.status;
  const onTime = nowMs <= Date.parse(shipment.promisedDeliveryAt);
  shipment.status = "DELIVERED";
  shipment.deliveredAt = isoAt(nowMs);
  shipment.progressPct = 100;
  shipment.currentHubId = undefined;
  shipment.nextHubId = undefined;
  shipment.delayMinutes = Math.max(0, Math.round((nowMs - Date.parse(shipment.originalEtaAt)) / MINUTE_MS));
  shipment.riskLevel = onTime ? "LOW" : "HIGH";
  shipment.delayReason = onTime ? undefined : "Delivered after promised time.";
  shipment.locationLabel = `Delivered · ${shipment.destination}`;
  shipment.currentLocation = { lat: shipment.destinationLat, lng: shipment.destinationLng, recordedAt: isoAt(nowMs) };
  shipment.lastUpdatedAt = isoAt(nowMs);
  addEvent(
    dataset,
    shipment,
    "DELIVERED",
    nowMs,
    `Delivered — ${shipment.destination}`,
    undefined,
    onTime ? "Delivered within the promised window." : "Delivered after the promised time.",
  );
  if (vehicle) vehicle.shipmentIds = vehicle.shipmentIds.filter((id) => id !== shipment.id);
  changes.deliveries.push(shipment.id);
  changes.statusChanges.push({ shipmentId: shipment.id, trackingNumber: shipment.trackingNumber, from, to: "DELIVERED" });
}

/* -------------------------------------------------------------------------- */
/* Trips + bookings                                                           */
/* -------------------------------------------------------------------------- */

function startTrip(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  fromHubId: string,
  nowMs: number,
  rng: Rng,
  changes: WorldChanges,
): void {
  const candidates = [...dataset.routes.values()].filter((route) => route.stops[0].hubId === fromHubId);
  if (candidates.length === 0) return;
  const waiting = (route: Route) =>
    [...dataset.shipments.values()].filter((s) => s.status === "ORDER_BOOKED" && s.routeId === route.id);
  const ranked = candidates
    .map((route) => ({ route, pool: waiting(route) }))
    .sort((a, b) => b.pool.length - a.pool.length);
  const { route, pool } = rng.chance(0.75) ? ranked[0] : rng.pick(ranked);
  const line = dataset.routeLines.get(route.id);
  if (!line) return;

  const hub = dataset.hubs.get(fromHubId);
  const loadingMinutes = rng.float(20, 50);
  const trip: VehicleTrip = {
    vehicleId: vehicle.id,
    routeId: route.id,
    phase: "AT_HUB",
    travelledKm: 0,
    totalKm: route.plannedDistanceKm,
    departedAt: isoAt(nowMs + loadingMinutes * MINUTE_MS),
    nextStopIndex: nextStopIndexFor(route, 0),
    atHubId: fromHubId,
    hubArrivedAt: isoAt(nowMs),
    dwellUntil: isoAt(nowMs + loadingMinutes * MINUTE_MS),
    cruiseSpeedKph: rng.float(41, 52),
    trafficDelayMinutes: 0,
    deviationKm: 0,
    deviationSide: rng.chance(0.5) ? 1 : -1,
    fixtureHold: false,
    offline: false,
    historicalFactor: 1,
  };
  dataset.trips.set(vehicle.id, trip);
  vehicle.shipmentIds = [];

  const target = rng.int(4, 7);
  const pickupKey = (shipment: ShipmentRecord) => shipment.scheduledPickupAt ?? shipment.bookedAt;
  const picked = pool.sort((a, b) => pickupKey(a).localeCompare(pickupKey(b))).slice(0, target);
  while (picked.length < target) picked.push(createBooking(dataset, route, nowMs, rng));

  for (const shipment of picked) {
    const from = shipment.status;
    shipment.status = "PICKED_UP";
    shipment.pickedUpAt = isoAt(nowMs);
    shipment.vehicleId = vehicle.id;
    shipment.vehicleNumber = vehicle.vehicleNumber;
    shipment.scheduledPickupAt = undefined;
    shipment.locationLabel = hub?.name;
    vehicle.shipmentIds.push(shipment.id);
    dataset.hubVisits.set(
      shipment.id,
      route.stops.map((stop, index): HubVisit => {
        const stopHub = dataset.hubs.get(stop.hubId)!;
        return index === 0
          ? hubVisit(stopHub, { arrivedAt: isoAt(nowMs), dwellMinutes: 0, status: "PROCESSING" })
          : hubVisit(stopHub, { status: "UPCOMING" });
      }),
    );
    addEvent(dataset, shipment, "PICKED_UP", nowMs, `Picked up — ${hub?.name ?? "origin hub"}`, hub);
    changes.statusChanges.push({ shipmentId: shipment.id, trackingNumber: shipment.trackingNumber, from, to: "PICKED_UP" });
  }

  vehicle.status = "STOPPED";
  vehicle.speedKph = 0;
  if (hub) {
    vehicle.lat = round6(hub.latitude);
    vehicle.lng = round6(hub.longitude);
  }
  vehicle.lastGpsAt = isoAt(nowMs);
  syncShipmentsToVehicle(dataset, vehicle, trip, route);
  changes.tripsStarted.push(vehicle.id);
  changes.movedVehicleIds.add(vehicle.id);
}

function createBooking(dataset: DemoDataset, route: Route, nowMs: number, rng: Rng): ShipmentRecord {
  const originHub = dataset.hubs.get(route.stops[0].hubId)!;
  const destinationHub = dataset.hubs.get(route.stops[route.stops.length - 1].hubId)!;
  const customers = [...dataset.customers.values()];
  const customer = rng.weighted(
    customers,
    customers.map((item) => (item.homeHubId === originHub.id ? 4 : 1)),
  );
  dataset.counters.shipment += 1;
  const id = `shp_${10_000 + dataset.counters.shipment}`;
  let trackingNumber = `OML${rng.int(200_000, 999_999)}`;
  while (dataset.shipmentIdByTracking.has(trackingNumber)) trackingNumber = `OML${rng.int(200_000, 999_999)}`;
  const pickupMs = nowMs + rng.float(30, 360) * MINUTE_MS;
  const originalEtaMs = pickupMs + (route.plannedDurationMinutes + ETA_MODEL.lastMileMinutes) * MINUTE_MS;
  const buffer = rng.pick([90, 120, 120, 150, 180, 240]);
  const promisedMs = Math.ceil((originalEtaMs + buffer * MINUTE_MS) / (30 * MINUTE_MS)) * 30 * MINUTE_MS;
  const token = trackingToken(id, getAppConfig().trackingTokenSecret);

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
    status: "ORDER_BOOKED",
    routeId: route.id,
    bookedAt: isoAt(nowMs),
    promisedDeliveryAt: isoAt(promisedMs),
    originalEtaAt: isoAt(originalEtaMs),
    delayMinutes: 0,
    riskLevel: "LOW",
    lastUpdatedAt: isoAt(nowMs),
    publicTrackingToken: token,
    progressPct: 0,
    nextHubId: originHub.id,
    locationLabel: `Awaiting pickup · ${originHub.name}`,
    scheduledPickupAt: isoAt(pickupMs),
  };
  dataset.shipments.set(id, shipment);
  dataset.shipmentIdByTracking.set(trackingNumber, id);
  dataset.shipmentIdByToken.set(token, id);
  dataset.hubVisits.set(
    id,
    route.stops.map((stop) => hubVisit(dataset.hubs.get(stop.hubId)!, { status: "UPCOMING" })),
  );
  addEvent(dataset, shipment, "ORDER_BOOKED", nowMs, "Order booked", originHub, `Pickup scheduled at ${originHub.name}.`);
  return shipment;
}

/* -------------------------------------------------------------------------- */
/* Scenario fixture steady state                                              */
/* -------------------------------------------------------------------------- */

/**
 * Keeps an un-triggered scenario fixture (e.g. OML123456 at Agra) in a stable,
 * on-plan state: its schedule advances with the clock so the story is intact
 * whenever the presenter triggers it.
 */
function holdFixture(
  dataset: DemoDataset,
  vehicle: VehicleRecord,
  trip: VehicleTrip,
  dtMinutes: number,
  nowMs: number,
  rng: Rng,
): void {
  const shiftMs = dtMinutes * MINUTE_MS;
  const shift = (value?: string) => (value ? isoAt(Date.parse(value) + shiftMs) : value);
  trip.departedAt = shift(trip.departedAt)!;
  for (const shipmentId of vehicle.shipmentIds) {
    const shipment = dataset.shipments.get(shipmentId);
    if (!shipment) continue;
    shipment.bookedAt = shift(shipment.bookedAt)!;
    shipment.pickedUpAt = shift(shipment.pickedUpAt);
    shipment.promisedDeliveryAt = shift(shipment.promisedDeliveryAt)!;
    shipment.originalEtaAt = shift(shipment.originalEtaAt)!;
    shipment.revisedEtaAt = shift(shipment.revisedEtaAt);
    shipment.lastNotifiedEtaAt = shift(shipment.lastNotifiedEtaAt);
    shipment.previousEtaAt = shift(shipment.previousEtaAt);
    shipment.lastEtaRevisionAt = shift(shipment.lastEtaRevisionAt);
    for (const event of dataset.events.get(shipmentId) ?? []) {
      event.occurredAt = shift(event.occurredAt)!;
      event.receivedAt = shift(event.receivedAt)!;
    }
    for (const visit of dataset.hubVisits.get(shipmentId) ?? []) {
      visit.arrivedAt = shift(visit.arrivedAt);
      visit.departedAt = shift(visit.departedAt);
    }
  }
  for (const point of dataset.gps.get(vehicle.id) ?? []) {
    point.recordedAt = shift(point.recordedAt)!;
    point.receivedAt = shift(point.receivedAt)!;
  }
  vehicle.status = "MOVING";
  vehicle.speedKph = Math.round(rng.float(36, 47));
  vehicle.lastGpsAt = isoAt(nowMs);
  const route = dataset.routes.get(trip.routeId);
  if (route) syncShipmentsToVehicle(dataset, vehicle, trip, route);
}
