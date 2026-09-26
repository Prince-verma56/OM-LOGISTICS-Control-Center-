import { DEMO_CONFIG } from "@/config/demo";
import { getRepositories } from "@/data/repositories";
import type { ShipmentRecord } from "@/data/store/types";
import { progressPct } from "@/data/store/trip-math";
import { getThresholds } from "@/lib/config/app";
import {
  ACTIVE_SHIPMENT_STATUSES,
  AT_RISK_LEVELS,
  RISK_RANK,
  SHIPMENT_MILESTONE_LABELS,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
  type TrafficState,
} from "@/lib/constants/statuses";
import { ETA_MODEL } from "@/lib/constants/thresholds";
import { currentEta, trackingPath } from "@/lib/formatters/shipment";
import { detectRouteDeviation } from "@/lib/intelligence/rules";
import { coarsen, projectOntoLineKm } from "@/lib/map/geo";
import { notFound } from "@/lib/server/errors";
import { toInstant } from "@/lib/validation/common";
import type { FilterOptions, PaginatedResponse, ShipmentListQuery } from "@/types/api";
import type { EtaPrediction } from "@/types/eta";
import type { LngLat } from "@/types/geo";
import type { Route, ShipmentRouteView } from "@/types/route";
import type {
  PublicTrackingView,
  Shipment,
  ShipmentDetail,
  ShipmentEvent,
  ShipmentMilestone,
} from "@/types/shipment";
import { alertService } from "./alert-service";
import { etaService } from "./eta-service";
import { fleetService } from "./fleet-service";
import { toShipment } from "./mappers";
import { notificationService } from "./notification-service";

const MINUTE = 60_000;

async function requireShipment(shipmentId: string): Promise<ShipmentRecord> {
  const shipment = await getRepositories().shipments.getById(shipmentId);
  if (!shipment) throw notFound("SHIPMENT_NOT_FOUND", "Shipment not found.");
  return shipment;
}

async function requireRoute(routeId: string): Promise<Route> {
  const route = await getRepositories().routes.getById(routeId);
  if (!route) throw notFound("NOT_FOUND", "Route not found.");
  return route;
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

function matchesSearch(shipment: ShipmentRecord, search: string): boolean {
  const needle = search.toLowerCase();
  return [
    shipment.id,
    shipment.trackingNumber,
    shipment.customerName,
    shipment.vehicleNumber,
    shipment.origin,
    shipment.destination,
    SHIPMENT_STATUS_LABELS[shipment.status],
  ].some((value) => value?.toLowerCase().includes(needle));
}

const sorters: Record<ShipmentListQuery["sort"], (a: ShipmentRecord, b: ShipmentRecord) => number> = {
  risk: (a, b) => RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel] || a.delayMinutes - b.delayMinutes,
  eta: (a, b) => currentEta(a).localeCompare(currentEta(b)),
  delay: (a, b) => a.delayMinutes - b.delayMinutes,
  lastUpdated: (a, b) => a.lastUpdatedAt.localeCompare(b.lastUpdatedAt),
  trackingNumber: (a, b) => a.trackingNumber.localeCompare(b.trackingNumber),
};

async function list(query: ShipmentListQuery): Promise<PaginatedResponse<Shipment>> {
  const repos = getRepositories();
  const from = toInstant(query.from, "start")?.getTime();
  const to = toInstant(query.to, "end")?.getTime();
  const routeHubs = new Map((await repos.routes.list()).map((route) => [route.id, route.stops.map((stop) => stop.hubId)]));

  const filtered = (await repos.shipments.list()).filter((shipment) => {
    if (query.status) {
      if (shipment.status !== query.status) return false;
    } else if (query.scope === "active" && !ACTIVE_SHIPMENT_STATUSES.includes(shipment.status)) return false;
    else if (query.scope === "delivered" && shipment.status !== "DELIVERED") return false;
    if (query.riskLevel && shipment.riskLevel !== query.riskLevel) return false;
    if (query.customerId && shipment.customerId !== query.customerId) return false;
    if (query.vehicleId && shipment.vehicleId !== query.vehicleId) return false;
    if (query.routeId && shipment.routeId !== query.routeId) return false;
    if (query.hubId && !routeHubs.get(shipment.routeId)?.includes(query.hubId)) return false;
    const booked = Date.parse(shipment.bookedAt);
    if (from !== undefined && booked < from) return false;
    if (to !== undefined && booked > to) return false;
    if (query.search && !matchesSearch(shipment, query.search)) return false;
    return true;
  });

  const direction = query.order === "asc" ? 1 : -1;
  filtered.sort((a, b) => sorters[query.sort](a, b) * direction || a.trackingNumber.localeCompare(b.trackingNumber));

  const start = (query.page - 1) * query.pageSize;
  return {
    data: filtered.slice(start, start + query.pageSize).map(toShipment),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

const MILESTONE_EVENT: Record<ShipmentStatus, ShipmentEvent["type"][]> = {
  ORDER_BOOKED: ["ORDER_BOOKED"],
  PICKED_UP: ["PICKED_UP"],
  IN_TRANSIT: ["DEPARTED_ORIGIN"],
  HUB_REACHED: ["HUB_REACHED"],
  OUT_FOR_DELIVERY: ["OUT_FOR_DELIVERY"],
  DELIVERED: ["DELIVERED"],
};

export function buildTimeline(shipment: ShipmentRecord, events: ShipmentEvent[], etaAt: string): ShipmentMilestone[] {
  const currentIndex = SHIPMENT_STATUSES.indexOf(shipment.status);
  const delayed = AT_RISK_LEVELS.includes(shipment.riskLevel) && shipment.status !== "DELIVERED";
  const etaMs = Date.parse(etaAt);

  return SHIPMENT_STATUSES.map((status, index) => {
    const matching = events.filter((event) => MILESTONE_EVENT[status].includes(event.type));
    const event = status === "HUB_REACHED" ? matching[matching.length - 1] : matching[0];
    let state: ShipmentMilestone["state"] =
      index < currentIndex || shipment.status === "DELIVERED"
        ? "COMPLETED"
        : index === currentIndex
          ? "CURRENT"
          : "UPCOMING";
    if (state === "CURRENT" && delayed) state = "DELAYED";

    let expectedAt: string | undefined;
    if (state === "UPCOMING" || state === "DELAYED" || state === "CURRENT") {
      if (status === "DELIVERED") expectedAt = etaAt;
      else if (status === "OUT_FOR_DELIVERY") expectedAt = new Date(etaMs - 45 * MINUTE).toISOString();
      else if (status === "HUB_REACHED" && index > currentIndex) expectedAt = new Date(etaMs - ETA_MODEL.lastMileMinutes * MINUTE).toISOString();
      else if (status === "PICKED_UP") expectedAt = shipment.scheduledPickupAt;
    }

    return {
      status,
      label: SHIPMENT_MILESTONE_LABELS[status],
      state,
      occurredAt: state === "UPCOMING" ? undefined : event?.occurredAt,
      expectedAt: state === "COMPLETED" ? undefined : expectedAt,
      locationLabel: state === "UPCOMING" ? undefined : event?.locationLabel,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

async function getDetail(shipmentId: string): Promise<ShipmentDetail> {
  const repos = getRepositories();
  const shipment = await requireShipment(shipmentId);
  const [events, eta, route, hubHistory, exceptions, notifications] = await Promise.all([
    repos.shipments.listEvents(shipmentId),
    etaService.getForShipment(shipmentId),
    requireRoute(shipment.routeId),
    repos.shipments.listHubVisits(shipmentId),
    alertService.listForShipment(shipmentId),
    notificationService.listForShipment(shipmentId),
  ]);
  const vehicle =
    shipment.vehicleId && shipment.status !== "DELIVERED" ? await fleetService.getById(shipment.vehicleId) : undefined;

  const sortedEvents = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  return {
    shipment: toShipment(shipment),
    timeline: buildTimeline(shipment, sortedEvents, eta.predictedEtaAt),
    vehicle,
    route,
    eta,
    exceptions,
    notifications: notifications.data,
    hubHistory,
    recentEvents: [...sortedEvents].reverse().slice(0, 30),
    trackingUrl: trackingPath(shipment.publicTrackingToken),
  };
}

async function getEvents(shipmentId: string): Promise<ShipmentEvent[]> {
  await requireShipment(shipmentId);
  const events = await getRepositories().shipments.listEvents(shipmentId);
  return events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

async function getEta(shipmentId: string): Promise<EtaPrediction> {
  return etaService.getForShipment(shipmentId);
}

function trafficStateFor(minutes: number): TrafficState {
  if (minutes >= 90) return "HEAVY";
  if (minutes >= 30) return "MODERATE";
  return "CLEAR";
}

async function getRoute(shipmentId: string): Promise<ShipmentRouteView> {
  const repos = getRepositories();
  const shipment = await requireShipment(shipmentId);
  const route = await requireRoute(shipment.routeId);
  const line = await repos.routes.getLine(route.id);
  const now = repos.clock.now();
  const nowIso = now.toISOString();
  const thresholds = getThresholds();

  const base: ShipmentRouteView = {
    shipmentId,
    route,
    actualTrail: [],
    progressPct: shipment.progressPct,
    travelledKm: 0,
    remainingKm: route.plannedDistanceKm,
    estimatedRemainingMinutes: Math.max(0, Math.round((Date.parse(currentEta(shipment)) - now.getTime()) / MINUTE)),
    trafficState: "CLEAR",
    trafficDelayMinutes: 0,
    deviation: { deviated: false, distanceFromRouteMeters: 0, detectedAt: nowIso, confidence: 1 },
    nextHubId: shipment.nextHubId,
    generatedAt: nowIso,
  };

  if (shipment.status === "DELIVERED") {
    return {
      ...base,
      actualTrail: route.geometry,
      currentPosition: [shipment.destinationLng, shipment.destinationLat],
      progressPct: 100,
      travelledKm: route.plannedDistanceKm,
      remainingKm: 0,
      estimatedRemainingMinutes: 0,
      nextHubId: undefined,
    };
  }

  const trip = shipment.vehicleId ? await repos.fleet.getTrip(shipment.vehicleId) : undefined;
  if (!trip || shipment.status === "ORDER_BOOKED" || !line) {
    return { ...base, currentPosition: [shipment.originLng, shipment.originLat] };
  }

  const since = shipment.pickedUpAt ? Date.parse(shipment.pickedUpAt) : 0;
  const gps = await repos.fleet.listGps(trip.vehicleId);
  const trail: LngLat[] = gps
    .filter((point) => Date.parse(point.recordedAt) >= since - 5 * MINUTE)
    .map((point) => [point.longitude, point.latitude]);
  const position: LngLat | undefined = shipment.currentLocation
    ? [shipment.currentLocation.lng, shipment.currentLocation.lat]
    : undefined;
  const nextHub = shipment.nextHubId ? await repos.hubs.getById(shipment.nextHubId) : undefined;
  const travelled = trip.phase === "LAST_MILE" ? route.plannedDistanceKm : position ? projectOntoLineKm(position, line) : trip.travelledKm;

  return {
    ...base,
    actualTrail: trail,
    currentPosition: position,
    progressPct: progressPct(trip),
    travelledKm: Math.round(travelled),
    remainingKm: Math.max(0, Math.round(route.plannedDistanceKm - travelled)),
    trafficState: trafficStateFor(trip.trafficDelayMinutes),
    trafficDelayMinutes: trip.trafficDelayMinutes,
    deviation: position
      ? detectRouteDeviation(position, line, thresholds, nowIso)
      : base.deviation,
    nextHubName: nextHub?.name,
  };
}

async function getNotifications(shipmentId: string) {
  await requireShipment(shipmentId);
  return notificationService.listForShipment(shipmentId);
}

/* -------------------------------------------------------------------------- */
/* Public tracking (customer-facing, data-minimised)                          */
/* -------------------------------------------------------------------------- */

function publicDelayReason(eta: EtaPrediction | undefined, shipment: ShipmentRecord): string | undefined {
  if (shipment.delayMinutes < 15 && shipment.status !== "DELIVERED") return undefined;
  if (shipment.status === "DELIVERED") return shipment.delayMinutes > 0 ? "Delivered later than originally planned." : undefined;
  const keys = new Set(eta?.factors.map((factor) => factor.key));
  const cause = shipment.lastDelayCause?.toLowerCase() ?? "";
  if (keys.has("traffic") || cause.includes("traffic")) return "Heavy traffic on the route.";
  if (keys.has("hub_dwell") || cause.includes("hub dwell")) return "Processing delay at a transit hub.";
  if (keys.has("no_movement") || cause.includes("stationary")) return "Unplanned halt en route.";
  if (keys.has("route_deviation") || cause.includes("detour")) return "Route diversion in progress.";
  return "Running behind the original schedule.";
}

async function getPublicTracking(token: string): Promise<PublicTrackingView> {
  const repos = getRepositories();
  const shipment = await repos.shipments.getByPublicToken(token);
  if (!shipment) throw notFound("TRACKING_NOT_FOUND", "We could not find a shipment for this tracking link.");
  const events = (await repos.shipments.listEvents(shipment.id)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const eta = shipment.status === "DELIVERED" ? undefined : await repos.shipments.getEta(shipment.id);
  const etaAt = shipment.deliveredAt ?? currentEta(shipment);
  const originHub = (await repos.routes.getById(shipment.routeId))?.stops[0].hubId;
  const originHubName = originHub ? (await repos.hubs.getById(originHub))?.name : undefined;

  const location =
    shipment.status === "ORDER_BOOKED"
      ? { label: `Awaiting pickup${originHubName ? ` · ${originHubName}` : ""}`, lat: shipment.originLat, lng: shipment.originLng, at: shipment.lastUpdatedAt }
      : shipment.currentLocation
        ? {
            label: shipment.locationLabel ?? "En route",
            lat: shipment.currentLocation.lat,
            lng: shipment.currentLocation.lng,
            at: shipment.currentLocation.recordedAt,
          }
        : undefined;

  return {
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    origin: shipment.origin,
    destination: shipment.destination,
    bookedAt: shipment.bookedAt,
    promisedDeliveryAt: shipment.promisedDeliveryAt,
    originalEtaAt: shipment.originalEtaAt,
    revisedEtaAt: shipment.status === "DELIVERED" ? undefined : shipment.revisedEtaAt,
    deliveredAt: shipment.deliveredAt,
    delayMinutes: shipment.delayMinutes,
    delayReason: publicDelayReason(eta, shipment),
    progressPct: shipment.progressPct,
    latestLocation: location && {
      // Location labels only name towns — never driver, vehicle or precise GPS.
      label: location.label.replace(/\s*\(last mile\)$/, ""),
      approxLat: coarsen(location.lat),
      approxLng: coarsen(location.lng),
      recordedAt: location.at,
    },
    timeline: buildTimeline(shipment, events, etaAt).map((milestone) => ({
      status: milestone.status,
      label: milestone.label,
      state: milestone.state === "DELAYED" ? "CURRENT" : milestone.state,
      occurredAt: milestone.occurredAt,
      locationLabel: milestone.locationLabel,
    })),
    lastUpdatedAt: shipment.lastUpdatedAt,
    isSimulated: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Reference data                                                             */
/* -------------------------------------------------------------------------- */

async function listRoutes(): Promise<Route[]> {
  return getRepositories().routes.list();
}

async function getFilterOptions(): Promise<FilterOptions> {
  const repos = getRepositories();
  const [customers, hubs, vehicles, routes] = await Promise.all([
    repos.shipments.listCustomers(),
    repos.hubs.list(),
    repos.fleet.list(),
    repos.routes.list(),
  ]);
  return {
    customers: customers
      .map((customer) => ({ value: customer.id, label: customer.name, hint: customer.segment }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    hubs: hubs.map((hub) => ({ value: hub.id, label: hub.name, hint: hub.code })).sort((a, b) => a.label.localeCompare(b.label)),
    vehicles: vehicles
      .map((vehicle) => ({ value: vehicle.id, label: vehicle.vehicleNumber, hint: vehicle.vehicleType }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    routes: routes
      .map((route) => ({ value: route.id, label: `${route.origin} → ${route.destination}`, hint: route.code }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    assignees: DEMO_CONFIG.assignees.map((assignee) => ({ value: assignee.id, label: assignee.name })),
  };
}

export const shipmentService = {
  list,
  getDetail,
  getEvents,
  getEta,
  getRoute,
  getNotifications,
  getPublicTracking,
  listRoutes,
  getFilterOptions,
};
