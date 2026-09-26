import { DEMO_CONFIG, assigneeName } from "@/config/demo";
import { getRepositories } from "@/data/repositories";
import { deskFor } from "@/data/seed/exceptions";
import { PLACE_LIST } from "@/data/seed/geography";
import { hubDwellMinutes, stationaryMinutes, tripPosition } from "@/data/store/trip-math";
import type { ShipmentRecord } from "@/data/store/types";
import { getThresholds } from "@/lib/config/app";
import {
  AT_RISK_LEVELS,
  EXCEPTION_SEVERITY_LABELS,
  EXCEPTION_SEVERITY_RANK,
  EXCEPTION_STATUS_TRANSITIONS,
  OPEN_EXCEPTION_STATUSES,
  RISK_RANK,
  type ExceptionSeverity,
  type ExceptionType,
} from "@/lib/constants/statuses";
import { exceptionCopy, type ExceptionCopyContext } from "@/lib/intelligence/copy";
import { detectRouteDeviation } from "@/lib/intelligence/rules";
import { describeLocation } from "@/lib/map/geo";
import { eventBus } from "@/lib/realtime/event-bus";
import { AppError, notFound } from "@/lib/server/errors";
import { toInstant } from "@/lib/validation/common";
import type { ExceptionActionInput, ExceptionListQuery, PaginatedResponse } from "@/types/api";
import type { Exception, ExceptionAuditEntry, ExceptionDetail, ExceptionListItem } from "@/types/exception";
import { toExceptionListItem } from "./mappers";

/**
 * Alert service — exception detection (brain/11), workflow (brain/09 §6) and
 * audit (brain/00 §7). Detection rules are deterministic and live in
 * lib/intelligence; this service decides create / escalate / auto-resolve.
 */

const RULE_ENGINE_ACTOR = "Rule engine (demo)";
const MINUTE = 60_000;

export interface EvaluationResult {
  created: Exception[];
  updated: Exception[];
  resolved: Exception[];
}

interface Condition {
  key: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  shipment: ShipmentRecord;
  copy: ExceptionCopyContext;
  vehicleId?: string;
  hubId?: string;
  affectedShipmentIds?: string[];
}

const isOpen = (exception: Exception) => OPEN_EXCEPTION_STATUSES.includes(exception.status);

function conditionKey(exception: Pick<Exception, "type" | "vehicleId" | "shipmentId">): string {
  if (exception.type === "MISSED_MILESTONE" || !exception.vehicleId) return `${exception.shipmentId}:${exception.type}`;
  return `${exception.vehicleId}:${exception.type}`;
}

async function audit(entry: Omit<ExceptionAuditEntry, "id">): Promise<ExceptionAuditEntry> {
  return { id: await getRepositories().exceptions.nextAuditId(), ...entry };
}

/** Scenario exceptions stay open until operations acts on them. */
async function isProtected(exception: Exception): Promise<boolean> {
  if (exception.source === "DEMO_SCENARIO") return true;
  const shipment = await getRepositories().shipments.getById(exception.shipmentId);
  return Boolean(shipment?.demoScenario);
}

/* -------------------------------------------------------------------------- */
/* Detection                                                                  */
/* -------------------------------------------------------------------------- */

async function collectConditions(): Promise<Condition[]> {
  const repos = getRepositories();
  const thresholds = getThresholds();
  const nowMs = repos.clock.now().getTime();
  const conditions: Condition[] = [];

  for (const trip of await repos.fleet.listTrips()) {
    if (trip.phase === "IDLE") continue;
    const vehicle = await repos.fleet.getById(trip.vehicleId);
    const route = await repos.routes.getById(trip.routeId);
    const line = await repos.routes.getLine(trip.routeId);
    if (!vehicle || !route || !line || vehicle.shipmentIds.length === 0) continue;

    const carried = (await Promise.all(vehicle.shipmentIds.map((id) => repos.shipments.getById(id)))).filter(
      (shipment): shipment is ShipmentRecord => Boolean(shipment) && shipment!.status !== "DELIVERED",
    );
    if (carried.length === 0) continue;
    const lead = [...carried].sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel])[0];
    const primary = carried.find((shipment) => shipment.demoScenario) ?? lead;
    const hub = trip.atHubId ? await repos.hubs.getById(trip.atHubId) : undefined;
    const base: ExceptionCopyContext = {
      trackingNumber: primary.trackingNumber,
      vehicleNumber: vehicle.vehicleNumber,
      locationLabel: hub?.name ?? describeLocation([vehicle.lng, vehicle.lat], PLACE_LIST),
      corridor: route.corridor,
      affectedCount: carried.length,
    };
    const common = {
      shipment: primary,
      vehicleId: vehicle.id,
      affectedShipmentIds: carried.map((shipment) => shipment.id),
    };
    const push = (type: ExceptionType, severity: ExceptionSeverity, copy: Partial<ExceptionCopyContext>, extra: Partial<Condition> = {}) =>
      conditions.push({ key: `${vehicle.id}:${type}`, type, severity, copy: { ...base, ...copy }, ...common, ...extra });

    const gpsAge = (nowMs - Date.parse(vehicle.lastGpsAt)) / MINUTE;
    if (vehicle.status === "OFFLINE" && gpsAge > thresholds.staleGpsMinutes) {
      push("STALE_GPS", gpsAge > thresholds.offlineGpsMinutes ? "HIGH" : "WARNING", { gpsAgeMinutes: gpsAge });
    }
    if (trip.trafficDelayMinutes >= thresholds.trafficExceptionMinutes) {
      push("TRAFFIC", trip.trafficDelayMinutes > 90 ? "HIGH" : "WARNING", { trafficMinutes: trip.trafficDelayMinutes });
    }
    const dwell = hubDwellMinutes(trip, nowMs);
    if (dwell > thresholds.hubDwellWarningMinutes) {
      push(
        "HUB_DWELL",
        dwell > thresholds.hubDwellCriticalMinutes ? "HIGH" : "WARNING",
        { hubName: hub?.name, dwellMinutes: dwell },
        { hubId: trip.atHubId },
      );
    }
    const stationary = stationaryMinutes(trip, nowMs);
    if (stationary > thresholds.noMovementMinutes) {
      push("NO_MOVEMENT", "HIGH", { stationaryMinutes: stationary });
    }
    if (trip.deviationKm > 0 && trip.phase === "EN_ROUTE") {
      const { position } = tripPosition(trip, line);
      const deviation = detectRouteDeviation(position, line, thresholds, new Date(nowMs).toISOString());
      if (deviation.deviated) push("ROUTE_DEVIATION", "HIGH", { deviationMeters: deviation.distanceFromRouteMeters });
    }
    const atRisk = carried.filter((shipment) => AT_RISK_LEVELS.includes(shipment.riskLevel));
    if (atRisk.length > 0) {
      const riskLead = atRisk.find((shipment) => shipment.demoScenario) ?? lead;
      const bufferMinutes = Math.round(
        (Date.parse(riskLead.promisedDeliveryAt) - Date.parse(riskLead.revisedEtaAt ?? riskLead.originalEtaAt)) / MINUTE,
      );
      conditions.push({
        key: `${vehicle.id}:DELAY_RISK`,
        type: "DELAY_RISK",
        severity: riskLead.riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
        shipment: riskLead,
        vehicleId: vehicle.id,
        affectedShipmentIds: atRisk.map((shipment) => shipment.id),
        copy: { ...base, trackingNumber: riskLead.trackingNumber, bufferMinutes, affectedCount: atRisk.length },
      });
    }
  }

  // Missed pickups (shipment-level).
  for (const shipment of await repos.shipments.list()) {
    if (shipment.status !== "ORDER_BOOKED" || !shipment.scheduledPickupAt) continue;
    const overdue = (nowMs - Date.parse(shipment.scheduledPickupAt)) / MINUTE;
    if (overdue <= 60) continue;
    const route = await repos.routes.getById(shipment.routeId);
    const originHub = route ? await repos.hubs.getById(route.stops[0].hubId) : undefined;
    conditions.push({
      key: `${shipment.id}:MISSED_MILESTONE`,
      type: "MISSED_MILESTONE",
      severity: overdue > 180 ? "HIGH" : "WARNING",
      shipment,
      hubId: originHub?.id,
      copy: { trackingNumber: shipment.trackingNumber, originHubName: originHub?.name, overdueMinutes: overdue },
    });
  }
  return conditions;
}

/**
 * Runs every detection rule against the current world state:
 * creates new exceptions, escalates severity, and auto-resolves exceptions
 * whose condition has cleared (except protected demo-scenario exceptions).
 */
async function evaluate(options: { spotlightVehicleIds?: Set<string> } = {}): Promise<EvaluationResult> {
  const repos = getRepositories();
  const thresholds = getThresholds();
  const now = repos.clock.now().toISOString();
  const result: EvaluationResult = { created: [], updated: [], resolved: [] };

  const openByKey = new Map<string, Exception>();
  for (const exception of await repos.exceptions.list()) {
    if (isOpen(exception)) openByKey.set(conditionKey(exception), exception);
  }

  const seen = new Set<string>();
  for (const condition of await collectConditions()) {
    seen.add(condition.key);
    const existing = openByKey.get(condition.key);
    // An existing exception stays linked to its original shipment; keep its copy consistent with that link.
    const own = existing ? await repos.shipments.getById(existing.shipmentId) : undefined;
    const { title, description } = exceptionCopy(
      condition.type,
      own ? { ...condition.copy, trackingNumber: own.trackingNumber } : condition.copy,
      thresholds,
    );

    if (existing) {
      const escalated = EXCEPTION_SEVERITY_RANK[condition.severity] > EXCEPTION_SEVERITY_RANK[existing.severity];
      const patch: Partial<Exception> = { title, description, affectedShipmentIds: condition.affectedShipmentIds };
      if (escalated) {
        patch.severity = condition.severity;
        patch.updatedAt = now;
        const updated = await repos.exceptions.update(
          existing.id,
          patch,
          await audit({
            exceptionId: existing.id,
            actor: RULE_ENGINE_ACTOR,
            action: "UPDATED",
            fromStatus: existing.status,
            toStatus: existing.status,
            note: `Severity escalated to ${EXCEPTION_SEVERITY_LABELS[condition.severity]}.`,
            at: now,
          }),
        );
        if (updated) {
          result.updated.push(updated);
          eventBus.publish({ type: "EXCEPTION_UPDATED", occurredAt: now, data: { exception: updated } });
        }
      } else {
        await repos.exceptions.update(existing.id, patch);
      }
      continue;
    }

    const id = await repos.exceptions.nextId();
    const spotlight = condition.vehicleId ? options.spotlightVehicleIds?.has(condition.vehicleId) : false;
    const exception: Exception = {
      id,
      shipmentId: condition.shipment.id,
      type: condition.type,
      severity: condition.severity,
      title,
      description,
      detectedAt: now,
      status: "OPEN",
      source: spotlight ? "DEMO_SCENARIO" : "DEMO_SIMULATOR",
      vehicleId: condition.vehicleId,
      hubId: condition.hubId,
      affectedShipmentIds: condition.affectedShipmentIds,
      updatedAt: now,
    };
    await repos.exceptions.create(
      exception,
      await audit({ exceptionId: id, actor: RULE_ENGINE_ACTOR, action: "CREATED", toStatus: "OPEN", at: now }),
    );
    openByKey.set(condition.key, exception);
    result.created.push(exception);
    eventBus.publish({ type: "EXCEPTION_CREATED", occurredAt: now, data: { exception } });
  }

  // Auto-resolve cleared conditions.
  for (const [key, exception] of openByKey) {
    if (seen.has(key) || (await isProtected(exception))) continue;
    const shipment = await repos.shipments.getById(exception.shipmentId);
    const note =
      shipment?.status === "DELIVERED"
        ? "Shipment delivered — auto-resolved."
        : "Condition cleared — auto-resolved by rule engine.";
    const updated = await repos.exceptions.update(
      exception.id,
      { status: "RESOLVED", resolvedAt: now, resolutionNote: note, updatedAt: now },
      await audit({
        exceptionId: exception.id,
        actor: RULE_ENGINE_ACTOR,
        action: "AUTO_RESOLVED",
        fromStatus: exception.status,
        toStatus: "RESOLVED",
        note,
        at: now,
      }),
    );
    if (updated) {
      result.resolved.push(updated);
      eventBus.publish({ type: "EXCEPTION_UPDATED", occurredAt: now, data: { exception: updated } });
    }
  }

  return result;
}

/**
 * Simulated operations team (demo only): periodically acknowledges and
 * resolves non-scenario exceptions so the exception center stays alive.
 */
async function simulateOpsActivity(tick: number): Promise<Exception[]> {
  const repos = getRepositories();
  const nowMs = repos.clock.now().getTime();
  const now = new Date(nowMs).toISOString();
  const touched: Exception[] = [];
  const all = (await repos.exceptions.list()).sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));

  if (tick % 5 === 0) {
    for (const exception of all) {
      if (exception.status !== "OPEN" || nowMs - Date.parse(exception.detectedAt) < 10 * MINUTE) continue;
      if (await isProtected(exception)) continue;
      const route = (await repos.shipments.getById(exception.shipmentId))?.routeId;
      const hubId = exception.hubId ?? (route ? (await repos.routes.getById(route))?.stops[0].hubId : undefined);
      const assignee = deskFor(hubId);
      const updated = await repos.exceptions.update(
        exception.id,
        { status: "IN_PROGRESS", assignedTo: assignee, updatedAt: now },
        await audit({
          exceptionId: exception.id,
          actor: assigneeName(assignee) ?? assignee,
          action: "UPDATED",
          fromStatus: "OPEN",
          toStatus: "IN_PROGRESS",
          toAssignee: assignee,
          note: "Acknowledged — contacting transport partner.",
          at: now,
        }),
      );
      if (updated) touched.push(updated);
      break;
    }
  }

  if (tick % 7 === 0) {
    for (const exception of all) {
      if (exception.status !== "IN_PROGRESS" || nowMs - Date.parse(exception.updatedAt) < 30 * MINUTE) continue;
      if (await isProtected(exception)) continue;
      const note = "Resolved by operations desk after partner confirmation.";
      const updated = await repos.exceptions.update(
        exception.id,
        { status: "RESOLVED", resolvedAt: now, resolutionNote: note, updatedAt: now },
        await audit({
          exceptionId: exception.id,
          actor: assigneeName(exception.assignedTo) ?? "Operations desk",
          action: "UPDATED",
          fromStatus: "IN_PROGRESS",
          toStatus: "RESOLVED",
          note,
          at: now,
        }),
      );
      if (updated) touched.push(updated);
      break;
    }
  }

  for (const exception of touched) {
    eventBus.publish({ type: "EXCEPTION_UPDATED", occurredAt: now, data: { exception } });
  }
  return touched;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

async function enrich(exception: Exception): Promise<ExceptionListItem> {
  const repos = getRepositories();
  const shipment = await repos.shipments.getById(exception.shipmentId);
  const vehicleId = exception.vehicleId ?? shipment?.vehicleId;
  return toExceptionListItem(exception, {
    shipment,
    vehicle: vehicleId ? await repos.fleet.getById(vehicleId) : undefined,
    hub: exception.hubId ? await repos.hubs.getById(exception.hubId) : undefined,
  });
}

async function list(query: ExceptionListQuery): Promise<PaginatedResponse<ExceptionListItem>> {
  const repos = getRepositories();
  const from = toInstant(query.from, "start")?.getTime();
  const to = toInstant(query.to, "end")?.getTime();
  const routeCache = new Map<string, string[]>();

  const filtered: Exception[] = [];
  for (const exception of await repos.exceptions.list()) {
    if (query.status) {
      if (exception.status !== query.status) continue;
    } else if (query.view === "open" && !isOpen(exception)) continue;
    else if (query.view === "closed" && isOpen(exception)) continue;
    if (query.severity && exception.severity !== query.severity) continue;
    if (query.type && exception.type !== query.type) continue;
    if (query.assignedTo && exception.assignedTo !== query.assignedTo) continue;
    if (
      query.shipmentId &&
      exception.shipmentId !== query.shipmentId &&
      !exception.affectedShipmentIds?.includes(query.shipmentId)
    ) {
      continue;
    }
    const detected = Date.parse(exception.detectedAt);
    if (from !== undefined && detected < from) continue;
    if (to !== undefined && detected > to) continue;
    if (query.hubId && exception.hubId !== query.hubId) {
      const shipment = await repos.shipments.getById(exception.shipmentId);
      if (!shipment) continue;
      let hubs = routeCache.get(shipment.routeId);
      if (!hubs) {
        hubs = (await repos.routes.getById(shipment.routeId))?.stops.map((stop) => stop.hubId) ?? [];
        routeCache.set(shipment.routeId, hubs);
      }
      if (!hubs.includes(query.hubId)) continue;
    }
    filtered.push(exception);
  }

  filtered.sort((a, b) => {
    const open = Number(isOpen(b)) - Number(isOpen(a));
    if (open !== 0) return open;
    const severity = EXCEPTION_SEVERITY_RANK[b.severity] - EXCEPTION_SEVERITY_RANK[a.severity];
    if (severity !== 0 && isOpen(a)) return severity;
    return b.detectedAt.localeCompare(a.detectedAt);
  });

  const start = (query.page - 1) * query.pageSize;
  const page = await Promise.all(filtered.slice(start, start + query.pageSize).map(enrich));
  return {
    data: page,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)),
    },
  };
}

async function getDetail(id: string): Promise<ExceptionDetail> {
  const repos = getRepositories();
  const exception = await repos.exceptions.getById(id);
  if (!exception) throw notFound("EXCEPTION_NOT_FOUND", "Exception not found.");
  return {
    exception: await enrich(exception),
    audit: await repos.exceptions.listAudit(id),
    allowedTransitions: [...EXCEPTION_STATUS_TRANSITIONS[exception.status]],
  };
}

async function listForShipment(shipmentId: string): Promise<ExceptionListItem[]> {
  const result = await list({ shipmentId, view: "all", page: 1, pageSize: 100 });
  return result.data;
}

/* -------------------------------------------------------------------------- */
/* Workflow                                                                   */
/* -------------------------------------------------------------------------- */

async function applyAction(id: string, input: ExceptionActionInput, actorName = DEMO_CONFIG.operator.name): Promise<ExceptionDetail> {
  const repos = getRepositories();
  const exception = await repos.exceptions.getById(id);
  if (!exception) throw notFound("EXCEPTION_NOT_FOUND", "Exception not found.");
  if (!isOpen(exception)) {
    throw new AppError("EXCEPTION_ALREADY_CLOSED", `Exception is already ${exception.status.toLowerCase()}.`, 409);
  }
  const allowed = EXCEPTION_STATUS_TRANSITIONS[exception.status];
  if (!allowed.includes(input.status)) {
    throw new AppError(
      "INVALID_STATUS_TRANSITION",
      `Cannot move an exception from ${exception.status} to ${input.status}.`,
      409,
      { details: { from: exception.status, to: input.status, allowed } },
    );
  }

  const now = repos.clock.now().toISOString();
  const closing = input.status === "RESOLVED" || input.status === "DISMISSED";
  const assignedTo = input.assignedTo ?? exception.assignedTo;
  const updated = await repos.exceptions.update(
    id,
    {
      status: input.status,
      assignedTo,
      updatedAt: now,
      ...(closing && { resolvedAt: now, resolutionNote: input.note }),
    },
    await audit({
      exceptionId: id,
      actor: actorName,
      action: "UPDATED",
      fromStatus: exception.status,
      toStatus: input.status,
      fromAssignee: exception.assignedTo,
      toAssignee: assignedTo,
      note: input.note,
      at: now,
    }),
  );
  if (updated) eventBus.publish({ type: "EXCEPTION_UPDATED", occurredAt: now, data: { exception: updated } });
  return getDetail(id);
}

export const alertService = { evaluate, simulateOpsActivity, list, getDetail, listForShipment, applyAction };
