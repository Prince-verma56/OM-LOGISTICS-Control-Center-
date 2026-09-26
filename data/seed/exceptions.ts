import { DEMO_CONFIG } from "@/config/demo";
import { hubDwellMinutes, stationaryMinutes, tripPosition } from "@/data/store/trip-math";
import type {
  Counters,
  HubRecord,
  ShipmentRecord,
  VehicleRecord,
  VehicleTrip,
} from "@/data/store/types";
import {
  AT_RISK_LEVELS,
  RISK_RANK,
  type ExceptionSeverity,
  type ExceptionStatus,
  type ExceptionType,
} from "@/lib/constants/statuses";
import type { Thresholds } from "@/lib/constants/thresholds";
import { exceptionCopy, type ExceptionCopyContext } from "@/lib/intelligence/copy";
import { detectRouteDeviation } from "@/lib/intelligence/rules";
import { describeLocation, type RouteLine } from "@/lib/map/geo";
import type { Exception, ExceptionAuditEntry } from "@/types/exception";
import type { Route } from "@/types/route";
import { PLACE_LIST } from "./geography";
import type { Rng } from "./prng";
import { MINUTE_MS, isoAt } from "./shipment-events";

export interface ExceptionSeedContext {
  rng: Rng;
  nowMs: number;
  counters: Counters;
  thresholds: Thresholds;
  hubs: Map<string, HubRecord>;
  routes: Map<string, Route>;
  lines: Map<string, RouteLine>;
  vehicles: Map<string, VehicleRecord>;
  trips: Map<string, VehicleTrip>;
  shipments: Map<string, ShipmentRecord>;
}

export const SEED_EXCEPTION_TOTAL = 100;

const REGION_DESK: Record<string, string> = {
  hub_del: "usr_ops_002",
  hub_agr: "usr_ops_002",
  hub_jai: "usr_ops_002",
  hub_lko: "usr_ops_002",
  hub_knu: "usr_ops_002",
  hub_luh: "usr_ops_002",
  hub_bom: "usr_ops_003",
  hub_pnq: "usr_ops_003",
  hub_amd: "usr_ops_003",
  hub_nag: "usr_ops_003",
  hub_idr: "usr_ops_003",
  hub_blr: "usr_ops_004",
  hub_maa: "usr_ops_004",
  hub_hyd: "usr_ops_004",
  hub_vga: "usr_ops_004",
  hub_cjb: "usr_ops_004",
  hub_ccu: "usr_ops_005",
  hub_vns: "usr_ops_005",
  hub_gau: "usr_ops_005",
  hub_pat: "usr_ops_005",
};

const RESOLUTION_NOTES = [
  "Transport partner confirmed revised dispatch; customer informed.",
  "Vehicle resumed after a scheduled driver rest stop.",
  "Hub team cleared the sorting backlog; shipment departed.",
  "GPS device rebooted remotely; feed restored.",
  "Rerouted via alternate corridor; ETA recovered.",
  "Customer accepted the revised delivery slot.",
  "Escalated to hub supervisor; priority loading completed.",
  "Toll-plaza congestion cleared; vehicle back on plan.",
];

const DISMISS_NOTES = [
  "False positive — planned halt at a toll plaza.",
  "Duplicate of an existing incident on the same vehicle.",
  "Customer-requested hold; no action required.",
];

export function deskFor(hubId: string | undefined): string {
  return (hubId && REGION_DESK[hubId]) || "usr_ops_001";
}

export function nextExceptionId(counters: Counters): string {
  counters.exception += 1;
  return `exc_${String(counters.exception).padStart(5, "0")}`;
}

export function auditEntry(
  counters: Counters,
  entry: Omit<ExceptionAuditEntry, "id">,
): ExceptionAuditEntry {
  counters.audit += 1;
  return { id: `aud_${counters.audit.toString(36).padStart(5, "0")}`, ...entry };
}

export function buildExceptions(ctx: ExceptionSeedContext): {
  exceptions: Map<string, Exception>;
  audit: Map<string, ExceptionAuditEntry[]>;
} {
  const { rng, nowMs, counters, thresholds } = ctx;
  const exceptions = new Map<string, Exception>();
  const audit = new Map<string, ExceptionAuditEntry[]>();
  const place = (lng: number, lat: number) => describeLocation([lng, lat], PLACE_LIST);

  const add = (
    input: {
      type: ExceptionType;
      severity: ExceptionSeverity;
      shipment: ShipmentRecord;
      detectedMs: number;
      copy: ExceptionCopyContext;
      vehicleId?: string;
      hubId?: string;
      affectedShipmentIds?: string[];
      forceOpen?: boolean;
      closed?: { status: Extract<ExceptionStatus, "RESOLVED" | "DISMISSED">; respondedMs: number; closedMs: number };
    },
  ): Exception => {
    const id = nextExceptionId(counters);
    const { title, description } = exceptionCopy(input.type, input.copy, thresholds);
    const detectedAt = isoAt(Math.min(input.detectedMs, nowMs - MINUTE_MS));
    const trail: ExceptionAuditEntry[] = [
      auditEntry(counters, { exceptionId: id, actor: "Rule engine (demo)", action: "CREATED", toStatus: "OPEN", at: detectedAt }),
    ];
    let status: ExceptionStatus = "OPEN";
    let assignedTo: string | undefined;
    let resolvedAt: string | undefined;
    let resolutionNote: string | undefined;
    let updatedAt = detectedAt;

    if (input.closed) {
      assignedTo = deskFor(input.hubId ?? ctx.routes.get(input.shipment.routeId)?.stops[0].hubId);
      const respondedAt = isoAt(input.closed.respondedMs);
      trail.push(
        auditEntry(counters, {
          exceptionId: id,
          actor: "Demo Operator",
          action: "UPDATED",
          fromStatus: "OPEN",
          toStatus: "IN_PROGRESS",
          toAssignee: assignedTo,
          note: "Investigating with transport partner.",
          at: respondedAt,
        }),
      );
      status = input.closed.status;
      resolvedAt = isoAt(input.closed.closedMs);
      resolutionNote = status === "RESOLVED" ? rng.pick(RESOLUTION_NOTES) : rng.pick(DISMISS_NOTES);
      trail.push(
        auditEntry(counters, {
          exceptionId: id,
          actor: "Demo Operator",
          action: "UPDATED",
          fromStatus: "IN_PROGRESS",
          toStatus: status,
          note: resolutionNote,
          at: resolvedAt,
        }),
      );
      updatedAt = resolvedAt;
    } else if (!input.forceOpen && rng.chance(0.4)) {
      status = "IN_PROGRESS";
      assignedTo = deskFor(input.hubId ?? ctx.routes.get(input.shipment.routeId)?.stops[0].hubId);
      const respondedMs = Math.min(nowMs - MINUTE_MS, Date.parse(detectedAt) + rng.float(4, 35) * MINUTE_MS);
      updatedAt = isoAt(respondedMs);
      trail.push(
        auditEntry(counters, {
          exceptionId: id,
          actor: "Demo Operator",
          action: "UPDATED",
          fromStatus: "OPEN",
          toStatus: "IN_PROGRESS",
          toAssignee: assignedTo,
          note: "Contacted transport partner.",
          at: updatedAt,
        }),
      );
    }

    const exception: Exception = {
      id,
      shipmentId: input.shipment.id,
      type: input.type,
      severity: input.severity,
      title,
      description,
      detectedAt,
      status,
      assignedTo,
      resolutionNote,
      resolvedAt,
      source: "SEED",
      vehicleId: input.vehicleId,
      hubId: input.hubId,
      affectedShipmentIds: input.affectedShipmentIds,
      updatedAt,
    };
    exceptions.set(id, exception);
    audit.set(id, trail);
    return exception;
  };

  /* ---------------- Vehicle-level incidents from live state ---------------- */
  for (const trip of ctx.trips.values()) {
    const vehicle = ctx.vehicles.get(trip.vehicleId);
    const route = ctx.routes.get(trip.routeId);
    const line = ctx.lines.get(trip.routeId);
    if (!vehicle || !route || !line || vehicle.shipmentIds.length === 0) continue;
    const carried = vehicle.shipmentIds.map((id) => ctx.shipments.get(id)).filter(Boolean) as ShipmentRecord[];
    const lead = [...carried].sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel])[0];
    const scenarioLead = carried.find((shipment) => shipment.demoScenario);
    const primary = scenarioLead ?? lead;
    const affected = carried.map((shipment) => shipment.id);
    const locationLabel = trip.atHubId ? ctx.hubs.get(trip.atHubId)?.name : place(vehicle.lng, vehicle.lat);
    const baseCopy: ExceptionCopyContext = {
      trackingNumber: primary.trackingNumber,
      vehicleNumber: vehicle.vehicleNumber,
      locationLabel,
      corridor: route.corridor,
      affectedCount: carried.length,
    };

    if (trip.offline) {
      const age = (nowMs - Date.parse(vehicle.lastGpsAt)) / MINUTE_MS;
      add({
        type: "STALE_GPS",
        severity: age > thresholds.offlineGpsMinutes ? "HIGH" : "WARNING",
        shipment: primary,
        detectedMs: Date.parse(vehicle.lastGpsAt) + thresholds.staleGpsMinutes * MINUTE_MS,
        copy: { ...baseCopy, gpsAgeMinutes: age },
        vehicleId: vehicle.id,
        affectedShipmentIds: affected,
      });
    }
    if (trip.trafficDelayMinutes >= thresholds.trafficExceptionMinutes) {
      add({
        type: "TRAFFIC",
        severity: trip.trafficDelayMinutes > 90 ? "HIGH" : "WARNING",
        shipment: primary,
        detectedMs: nowMs - rng.float(10, 60) * MINUTE_MS,
        copy: { ...baseCopy, trafficMinutes: trip.trafficDelayMinutes },
        vehicleId: vehicle.id,
        affectedShipmentIds: affected,
      });
    }
    const dwell = hubDwellMinutes(trip, nowMs);
    if (dwell > thresholds.hubDwellWarningMinutes) {
      const hub = trip.atHubId ? ctx.hubs.get(trip.atHubId) : undefined;
      const created = add({
        type: "HUB_DWELL",
        severity: dwell > thresholds.hubDwellCriticalMinutes ? "HIGH" : "WARNING",
        shipment: primary,
        detectedMs: Date.parse(trip.hubArrivedAt!) + thresholds.hubDwellWarningMinutes * MINUTE_MS,
        copy: { ...baseCopy, hubName: hub?.name, dwellMinutes: dwell },
        vehicleId: vehicle.id,
        hubId: trip.atHubId,
        affectedShipmentIds: affected,
        forceOpen: Boolean(scenarioLead),
      });
      if (scenarioLead?.demoScenario === "C_HUB_DWELL") trip.holdUntilExceptionClosed = created.id;
    }
    const stationary = stationaryMinutes(trip, nowMs);
    if (stationary > thresholds.noMovementMinutes) {
      const created = add({
        type: "NO_MOVEMENT",
        severity: "HIGH",
        shipment: primary,
        detectedMs: Date.parse(trip.stationarySince!) + thresholds.noMovementMinutes * MINUTE_MS,
        copy: { ...baseCopy, stationaryMinutes: stationary },
        vehicleId: vehicle.id,
        affectedShipmentIds: affected,
        forceOpen: Boolean(scenarioLead),
      });
      if (scenarioLead?.demoScenario === "E_NO_MOVEMENT") trip.holdUntilExceptionClosed = created.id;
    }
    if (trip.deviationKm > 0) {
      const { position } = tripPosition(trip, line);
      const deviation = detectRouteDeviation(position, line, thresholds, isoAt(nowMs));
      if (deviation.deviated) {
        add({
          type: "ROUTE_DEVIATION",
          severity: "HIGH",
          shipment: primary,
          detectedMs: nowMs - rng.float(8, 30) * MINUTE_MS,
          copy: { ...baseCopy, deviationMeters: deviation.distanceFromRouteMeters },
          vehicleId: vehicle.id,
          affectedShipmentIds: affected,
          forceOpen: Boolean(scenarioLead),
        });
      }
    }
    if (AT_RISK_LEVELS.includes(lead.riskLevel)) {
      const prediction = lead;
      const bufferMinutes = Math.round(
        (Date.parse(prediction.promisedDeliveryAt) - Date.parse(prediction.revisedEtaAt ?? prediction.originalEtaAt)) /
          MINUTE_MS,
      );
      add({
        type: "DELAY_RISK",
        severity: lead.riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
        shipment: lead,
        detectedMs: nowMs - rng.float(5, 90) * MINUTE_MS,
        copy: {
          ...baseCopy,
          trackingNumber: lead.trackingNumber,
          bufferMinutes,
          affectedCount: carried.filter((shipment) => AT_RISK_LEVELS.includes(shipment.riskLevel)).length,
        },
        vehicleId: vehicle.id,
        affectedShipmentIds: carried.filter((shipment) => AT_RISK_LEVELS.includes(shipment.riskLevel)).map((s) => s.id),
      });
    }
  }

  /* ---------------- Missed pickups ---------------- */
  for (const shipment of ctx.shipments.values()) {
    if (shipment.status !== "ORDER_BOOKED" || !shipment.scheduledPickupAt) continue;
    const overdue = (nowMs - Date.parse(shipment.scheduledPickupAt)) / MINUTE_MS;
    if (overdue <= 60) continue;
    const originHubId = ctx.routes.get(shipment.routeId)?.stops[0].hubId;
    add({
      type: "MISSED_MILESTONE",
      severity: "WARNING",
      shipment,
      detectedMs: Date.parse(shipment.scheduledPickupAt) + 60 * MINUTE_MS,
      copy: {
        trackingNumber: shipment.trackingNumber,
        originHubName: originHubId ? ctx.hubs.get(originHubId)?.name : undefined,
        overdueMinutes: overdue,
      },
      hubId: originHubId,
    });
  }

  /* ---------------- Closed history on delivered shipments ---------------- */
  const delivered = rng.shuffle([...ctx.shipments.values()].filter((shipment) => shipment.status === "DELIVERED"));
  const historicalTypes: ExceptionType[] = [
    "DELAY_RISK",
    "TRAFFIC",
    "HUB_DWELL",
    "NO_MOVEMENT",
    "ROUTE_DEVIATION",
    "STALE_GPS",
    "MISSED_MILESTONE",
  ];
  const historicalWeights = [30, 22, 18, 10, 8, 8, 4];
  let cursor = 0;
  while (exceptions.size < SEED_EXCEPTION_TOTAL && cursor < delivered.length) {
    const shipment = delivered[cursor];
    cursor += 1;
    const route = ctx.routes.get(shipment.routeId);
    if (!route || !shipment.pickedUpAt || !shipment.deliveredAt) continue;
    const type = rng.weighted(historicalTypes, historicalWeights);
    const startMs = Date.parse(shipment.pickedUpAt);
    const endMs = Date.parse(shipment.deliveredAt);
    const detectedMs = startMs + (endMs - startMs) * rng.float(0.2, 0.8);
    const respondedMs = detectedMs + rng.float(4, 45) * MINUTE_MS;
    const closedMs = Math.min(endMs + 60 * MINUTE_MS, respondedMs + rng.float(20, 240) * MINUTE_MS);
    const hubStop = route.stops[rng.int(0, route.stops.length - 1)];
    const hub = ctx.hubs.get(hubStop.hubId);
    add({
      type,
      severity: rng.weighted<ExceptionSeverity>(["WARNING", "HIGH", "CRITICAL"], [45, 45, 10]),
      shipment,
      detectedMs,
      copy: {
        trackingNumber: shipment.trackingNumber,
        vehicleNumber: shipment.vehicleNumber,
        hubName: hub?.name,
        locationLabel: hub?.city,
        corridor: route.corridor,
        originHubName: ctx.hubs.get(route.stops[0].hubId)?.name,
        dwellMinutes: rng.float(50, 140),
        stationaryMinutes: rng.float(35, 90),
        deviationMeters: rng.float(1_300, 4_200),
        trafficMinutes: rng.float(45, 150),
        bufferMinutes: -Math.round(rng.float(15, 160)),
        gpsAgeMinutes: rng.float(25, 90),
        overdueMinutes: rng.float(65, 150),
      },
      vehicleId: shipment.vehicleId,
      hubId: type === "HUB_DWELL" || type === "MISSED_MILESTONE" ? hub?.id : undefined,
      closed: { status: rng.chance(0.88) ? "RESOLVED" : "DISMISSED", respondedMs, closedMs },
    });
  }

  return { exceptions, audit };
}

/** Demo assignee label used in seed notes. */
export const DEMO_OPERATOR_NAME = DEMO_CONFIG.operator.name;
