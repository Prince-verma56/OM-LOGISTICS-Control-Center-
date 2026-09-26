import { RISK_BUFFER_MINUTES, ETA_MODEL } from "@/lib/constants/thresholds";
import type { RiskLevel } from "@/lib/constants/statuses";
import { clamp } from "@/lib/formatters/number";
import type { EtaFactor, EtaInput, EtaPrediction } from "@/types/eta";

/**
 * Prototype ETA rules (brain/20_AI_INTELLIGENCE_SPEC.md §4):
 *
 *   ETA = now + remainingRouteTime + trafficImpact + expectedHubDelay
 *             + historicalAdjustment (+ dwell / stoppage / detour allowances)
 *
 * Deterministic: the same input always yields the same prediction
 * (brain/13_TESTING.md §2). This is a rules engine, not a trained model.
 */

const MINUTE = 60_000;

export function classifyRisk(bufferMinutes: number): RiskLevel {
  if (bufferMinutes >= RISK_BUFFER_MINUTES.comfortable) return "LOW";
  if (bufferMinutes >= 0) return "MEDIUM";
  if (bufferMinutes >= -RISK_BUFFER_MINUTES.severeBreach) return "HIGH";
  return "CRITICAL";
}

function factor(key: string, label: string, impactMinutes: number): EtaFactor {
  return { key, label, impactMinutes: Math.round(impactMinutes) };
}

export function computeEta(input: EtaInput): EtaPrediction {
  const nowMs = input.now.getTime();
  const factors: EtaFactor[] = [];
  let totalMinutes: number;

  if (input.awaitingPickup) {
    const pickupMs = Math.max(nowMs, input.scheduledPickupAt ? Date.parse(input.scheduledPickupAt) : nowMs);
    const waitMinutes = (pickupMs - nowMs) / MINUTE;
    totalMinutes = waitMinutes + input.plannedDurationMinutes + ETA_MODEL.lastMileMinutes;
    if (waitMinutes > 0) factors.push(factor("pickup_wait", "Awaiting scheduled pickup", waitMinutes));
    factors.push(factor("planned_linehaul", "Planned line-haul", input.plannedDurationMinutes));
    factors.push(factor("last_mile", "Last-mile delivery", ETA_MODEL.lastMileMinutes));
  } else if (input.inLastMile) {
    totalMinutes = Math.max(5, input.lastMileRemainingMinutes);
    factors.push(factor("last_mile", "Last-mile delivery in progress", totalMinutes));
  } else {
    const driveMinutes = (input.remainingKm / ETA_MODEL.plannedAverageSpeedKph) * 60;
    const hubMinutes = input.remainingHubStops * ETA_MODEL.expectedHubDwellMinutes;
    const historicalMinutes = driveMinutes * (input.historicalFactor - 1);
    const stoppageMinutes = input.stationaryMinutes > 0 ? Math.min(90, 20 + input.stationaryMinutes * 0.5) : 0;

    totalMinutes =
      driveMinutes +
      hubMinutes +
      historicalMinutes +
      input.trafficDelayMinutes +
      input.currentHubRemainingMinutes +
      stoppageMinutes +
      input.deviationDetourMinutes +
      ETA_MODEL.lastMileMinutes;

    factors.push(factor("remaining_route", `Remaining drive (${Math.round(input.remainingKm)} km)`, driveMinutes));
    if (hubMinutes > 0) {
      factors.push(factor("hub_processing", `Processing at ${input.remainingHubStops} hub(s) ahead`, hubMinutes));
    }
    if (input.trafficDelayMinutes >= 1) {
      factors.push(factor("traffic", "Heavy traffic detected", input.trafficDelayMinutes));
    }
    if (input.currentHubRemainingMinutes >= 1 || input.currentHubDwellMinutes > 0) {
      const overPlan = input.currentHubDwellMinutes > ETA_MODEL.expectedHubDwellMinutes;
      factors.push(
        factor(
          overPlan ? "hub_dwell" : "hub_processing_current",
          overPlan
            ? `Hub dwell ${Math.round(input.currentHubDwellMinutes)} min (plan ${ETA_MODEL.expectedHubDwellMinutes} min)`
            : "Current hub processing",
          input.currentHubRemainingMinutes,
        ),
      );
    }
    if (stoppageMinutes > 0) {
      factors.push(factor("no_movement", `Vehicle stationary for ${Math.round(input.stationaryMinutes)} min`, stoppageMinutes));
    }
    if (input.deviationDetourMinutes > 0) {
      factors.push(factor("route_deviation", "Detour off planned corridor", input.deviationDetourMinutes));
    }
    if (Math.abs(historicalMinutes) >= 1) {
      factors.push(factor("historical_lane", "Historical lane performance", historicalMinutes));
    }
    factors.push(factor("last_mile", "Last-mile delivery", ETA_MODEL.lastMileMinutes));
  }

  const predictedMs = nowMs + totalMinutes * MINUTE;
  const originalMs = Date.parse(input.originalEtaAt);
  const promisedMs = Date.parse(input.promisedDeliveryAt);
  const delayMinutes = Math.max(0, Math.round((predictedMs - originalMs) / MINUTE));
  const bufferMinutes = Math.round((promisedMs - predictedMs) / MINUTE);
  const riskLevel = classifyRisk(bufferMinutes);

  const freshnessMinutes = Math.max(0, (nowMs - Date.parse(input.dataFreshnessAt)) / MINUTE);
  const confidence = clamp(
    0.96 -
      input.remainingKm / 6000 -
      (input.trafficDelayMinutes > 0 ? 0.08 : 0) -
      (input.currentHubDwellMinutes > ETA_MODEL.expectedHubDwellMinutes ? 0.05 : 0) -
      (input.stationaryMinutes > 0 ? 0.08 : 0) -
      (input.deviationDetourMinutes > 0 ? 0.06 : 0) -
      Math.min(0.3, freshnessMinutes / 200),
    ETA_MODEL.minConfidence,
    ETA_MODEL.maxConfidence,
  );

  return {
    shipmentId: input.shipmentId,
    predictedEtaAt: new Date(predictedMs).toISOString(),
    previousEtaAt: input.previousEtaAt,
    generatedAt: input.now.toISOString(),
    delayMinutes,
    confidence: Math.round(confidence * 100) / 100,
    riskLevel,
    factors,
    bufferMinutes,
    dataFreshnessAt: input.dataFreshnessAt,
    explanation: explain(factors, bufferMinutes, delayMinutes),
  };
}

/** Short reason string (brain/20 §7). */
export function explain(factors: EtaFactor[], bufferMinutes: number, delayMinutes: number): string {
  const adverse = factors
    .filter((item) => ["traffic", "hub_dwell", "no_movement", "route_deviation"].includes(item.key))
    .sort((a, b) => b.impactMinutes - a.impactMinutes)[0];
  if (bufferMinutes < 0) {
    const breach = `Revised ETA is ${Math.abs(bufferMinutes)} min after promised delivery`;
    return adverse ? `${adverse.label}. ${breach}.` : `${breach}.`;
  }
  if (adverse) return `${adverse.label} (+${adverse.impactMinutes} min).`;
  if (delayMinutes > 0) return `Running ${delayMinutes} min behind plan; still within promise.`;
  return "On plan.";
}
