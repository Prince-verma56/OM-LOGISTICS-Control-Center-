import { hashString } from "@/data/seed/prng";
import { getRepositories } from "@/data/repositories";
import {
  AT_RISK_LEVELS,
  EXCEPTION_TYPE_LABELS,
  EXCEPTION_TYPES,
  OPEN_EXCEPTION_STATUSES,
} from "@/lib/constants/statuses";
import { toDayKey } from "@/lib/formatters/date";
import { clamp, round } from "@/lib/formatters/number";
import { toInstant } from "@/lib/validation/common";
import type { KpiQuery } from "@/types/api";
import type { AnalyticsKpis, DashboardSummary, KpiKey, KpiSnapshot } from "@/types/kpi";

const DAY = 24 * 60 * 60_000;

/* -------------------------------------------------------------------------- */
/* Dashboard summary (live, computed from current state)                      */
/* -------------------------------------------------------------------------- */

async function getDashboardSummary(): Promise<DashboardSummary> {
  const repos = getRepositories();
  const now = repos.clock.now();
  const [shipments, vehicles, exceptions] = await Promise.all([
    repos.shipments.list(),
    repos.fleet.list(),
    repos.exceptions.list(),
  ]);

  const active = shipments.filter((shipment) => shipment.status !== "DELIVERED");
  const recentDelivered = shipments.filter(
    (shipment) =>
      shipment.status === "DELIVERED" && shipment.deliveredAt && now.getTime() - Date.parse(shipment.deliveredAt) <= 30 * DAY,
  );
  const onTime = recentDelivered.filter(
    (shipment) => Date.parse(shipment.deliveredAt!) <= Date.parse(shipment.promisedDeliveryAt),
  ).length;
  const openExceptions = exceptions.filter((exception) => OPEN_EXCEPTION_STATUSES.includes(exception.status));

  const summary = {
    activeShipments: active.length,
    vehiclesInTransit: vehicles.filter((vehicle) => vehicle.shipmentIds.length > 0 && vehicle.status !== "IDLE").length,
    atRiskShipments: active.filter((shipment) => AT_RISK_LEVELS.includes(shipment.riskLevel)).length,
    onTimeDeliveryPct: recentDelivered.length ? round((onTime / recentDelivered.length) * 100, 1) : 100,
    openExceptions: openExceptions.length,
  };

  let baseline = await repos.analytics.getBaseline();
  if (!baseline) {
    baseline = summary;
    await repos.analytics.setBaseline(summary);
  }

  return {
    generatedAt: now.toISOString(),
    ...summary,
    deltas: {
      activeShipments: summary.activeShipments - baseline.activeShipments,
      vehiclesInTransit: summary.vehiclesInTransit - baseline.vehiclesInTransit,
      atRiskShipments: summary.atRiskShipments - baseline.atRiskShipments,
      onTimeDeliveryPct: round(summary.onTimeDeliveryPct - baseline.onTimeDeliveryPct, 1),
      openExceptions: summary.openExceptions - baseline.openExceptions,
    },
    breakdown: {
      criticalShipments: active.filter((shipment) => shipment.riskLevel === "CRITICAL").length,
      criticalExceptions: openExceptions.filter((exception) => exception.severity === "CRITICAL").length,
      deliveredLast30Days: recentDelivered.length,
      totalVehicles: vehicles.length,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Analytics (simulated history + live exception counts)                      */
/* -------------------------------------------------------------------------- */

/** Deterministic per-dimension variation so filtered views differ plausibly. */
function applyDimension(snapshot: KpiSnapshot, dimensionId: string): KpiSnapshot {
  const h = hashString(dimensionId);
  const share = 0.05 + ((h >>> 7) % 12) / 100;
  return {
    date: snapshot.date,
    etaAccuracy: round(clamp(snapshot.etaAccuracy + (((h % 70) - 35) / 10), 60, 99.5), 1),
    otif: round(clamp(snapshot.otif + ((((h >>> 3) % 80) - 40) / 10), 60, 99.5), 1),
    avgDelayResponseMinutes: Math.max(4, Math.round(snapshot.avgDelayResponseMinutes * (0.85 + ((h >>> 5) % 30) / 100))),
    customerQueries: Math.max(1, Math.round(snapshot.customerQueries * share)),
    avgHubDwellMinutes: Math.max(12, snapshot.avgHubDwellMinutes + (((h >>> 9) % 20) - 10)),
    routeExceptions: Math.max(0, Math.round(snapshot.routeExceptions * share * 3)),
  };
}

function average(snapshots: KpiSnapshot[], date: string): KpiSnapshot {
  const keys: KpiKey[] = [
    "etaAccuracy",
    "otif",
    "avgDelayResponseMinutes",
    "customerQueries",
    "avgHubDwellMinutes",
    "routeExceptions",
  ];
  const result = { date } as KpiSnapshot;
  for (const key of keys) {
    const values = snapshots.map((snapshot) => snapshot[key]);
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    result[key] = key === "etaAccuracy" || key === "otif" ? round(mean, 1) : Math.round(mean);
  }
  return result;
}

async function getAnalytics(query: KpiQuery): Promise<AnalyticsKpis> {
  const repos = getRepositories();
  const now = repos.clock.now();
  const toDate = toInstant(query.to, "end") ?? now;
  const fromDate = toInstant(query.from, "start") ?? new Date(toDate.getTime() - 29 * DAY);
  const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / DAY));
  const fromKey = toDayKey(fromDate);
  const toKey = toDayKey(toDate);
  const previousFromKey = toDayKey(new Date(fromDate.getTime() - days * DAY));

  const dimensions = [query.hubId, query.customerId, query.routeId].filter(Boolean) as string[];
  const adjust = (snapshot: KpiSnapshot) => dimensions.reduce(applyDimension, snapshot);
  const history = (await repos.analytics.listKpiHistory()).map(adjust);

  const trend = history.filter((snapshot) => snapshot.date >= fromKey && snapshot.date <= toKey);
  const previous = history.filter((snapshot) => snapshot.date >= previousFromKey && snapshot.date < fromKey);

  // Exceptions by type are computed from the live exception store.
  const [exceptions, shipments, routes] = await Promise.all([
    repos.exceptions.list(),
    repos.shipments.list(),
    repos.routes.list(),
  ]);
  const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));
  const routeHubs = new Map(routes.map((route) => [route.id, route.stops.map((stop) => stop.hubId)]));
  const counts = new Map<string, number>(EXCEPTION_TYPES.map((type) => [type, 0]));
  for (const exception of exceptions) {
    const detected = Date.parse(exception.detectedAt);
    if (detected < fromDate.getTime() || detected > toDate.getTime()) continue;
    const shipment = shipmentById.get(exception.shipmentId);
    if (query.customerId && shipment?.customerId !== query.customerId) continue;
    if (query.routeId && shipment?.routeId !== query.routeId) continue;
    if (query.hubId && exception.hubId !== query.hubId && !(shipment && routeHubs.get(shipment.routeId)?.includes(query.hubId))) {
      continue;
    }
    counts.set(exception.type, (counts.get(exception.type) ?? 0) + 1);
  }

  return {
    generatedAt: now.toISOString(),
    range: { from: fromDate.toISOString(), to: toDate.toISOString(), days },
    current: average(trend, toKey),
    previous: average(previous, toDayKey(new Date(fromDate.getTime() - DAY))),
    trend,
    exceptionsByType: EXCEPTION_TYPES.map((type) => ({
      type,
      label: EXCEPTION_TYPE_LABELS[type],
      count: counts.get(type) ?? 0,
    })),
    isSimulated: true,
  };
}

export const kpiService = { getDashboardSummary, getAnalytics };
