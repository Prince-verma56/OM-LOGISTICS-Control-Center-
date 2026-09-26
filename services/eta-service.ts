import { getRepositories } from "@/data/repositories";
import type { ShipmentRecord } from "@/data/store/types";
import { buildEtaInput } from "@/data/store/trip-math";
import { getThresholds } from "@/lib/config/app";
import { RISK_RANK, type RiskLevel } from "@/lib/constants/statuses";
import { computeEta } from "@/lib/intelligence/eta";
import { notFound } from "@/lib/server/errors";
import type { EtaPrediction } from "@/types/eta";

/**
 * ETA service — orchestrates the deterministic ETA rules
 * (lib/intelligence/eta.ts) over repository data. A future ML model can be
 * introduced behind `computeEta` without changing callers (brain/20).
 */

export interface EtaChange {
  shipmentId: string;
  trackingNumber: string;
  previousPredictedAt?: string;
  predictedAt: string;
  riskFrom: RiskLevel;
  riskTo: RiskLevel;
  /** ETA moved by at least ETA_NOTIFICATION_DELTA_MINUTES vs the last communicated ETA. */
  material: boolean;
  /** Last communicated ETA before this revision. */
  communicatedEtaAt?: string;
  explanation: string;
}

const MINUTE = 60_000;
/** Minimum simulated time between two customer-facing ETA revisions for one shipment. */
const REVISION_COOLDOWN_MINUTES = 90;
const ADVERSE_FACTORS = new Set(["traffic", "hub_dwell", "no_movement", "route_deviation"]);

function applyPrediction(shipment: ShipmentRecord, prediction: EtaPrediction) {
  const adverse = prediction.factors
    .filter((factor) => ADVERSE_FACTORS.has(factor.key))
    .sort((a, b) => b.impactMinutes - a.impactMinutes)[0];
  if (adverse) shipment.lastDelayCause = adverse.label.replace(/\s*\(.*\)$/, "");

  shipment.revisedEtaAt = prediction.predictedEtaAt;
  shipment.delayMinutes = prediction.delayMinutes;
  shipment.riskLevel = prediction.riskLevel;
  const flagged = RISK_RANK[prediction.riskLevel] >= RISK_RANK.MEDIUM || prediction.delayMinutes > 15;
  if (!flagged) {
    shipment.delayReason = undefined;
  } else if (!adverse && shipment.lastDelayCause && prediction.delayMinutes > 15) {
    // Keep the original cause visible after the delay has been realised.
    shipment.delayReason = `${shipment.lastDelayCause} earlier on the route. ${prediction.explanation}`;
    prediction.explanation = shipment.delayReason;
  } else {
    shipment.delayReason = prediction.explanation;
  }
}

/** Predicts one shipment's ETA from current state (no persistence). */
async function predict(shipment: ShipmentRecord): Promise<EtaPrediction | undefined> {
  const repos = getRepositories();
  const route = await repos.routes.getById(shipment.routeId);
  if (!route) return undefined;
  const trip = shipment.vehicleId ? await repos.fleet.getTrip(shipment.vehicleId) : undefined;
  const vehicle = shipment.vehicleId ? await repos.fleet.getById(shipment.vehicleId) : undefined;
  const prediction = computeEta(
    buildEtaInput({
      shipment,
      trip: shipment.status === "ORDER_BOOKED" ? undefined : trip,
      vehicle,
      route,
      nowMs: repos.clock.now().getTime(),
      previousEtaAt: shipment.previousEtaAt,
    }),
  );
  return prediction;
}

/**
 * Recomputes ETA + risk for every active shipment. Returns the changes the
 * caller may want to notify on. Deterministic for the same world state.
 */
async function refreshActive(): Promise<EtaChange[]> {
  const repos = getRepositories();
  const threshold = getThresholds().etaNotificationDeltaMinutes;
  const changes: EtaChange[] = [];

  for (const shipment of await repos.shipments.list()) {
    if (shipment.status === "DELIVERED") continue;
    const prediction = await predict(shipment);
    if (!prediction) continue;

    const riskFrom = shipment.riskLevel;
    const previousPredictedAt = shipment.revisedEtaAt;
    const communicated = shipment.lastNotifiedEtaAt ?? shipment.originalEtaAt;
    const deltaMinutes = Math.abs(Date.parse(prediction.predictedEtaAt) - Date.parse(communicated)) / MINUTE;
    const nowMs = Date.parse(prediction.generatedAt);
    const coolingDown =
      shipment.lastEtaRevisionAt !== undefined &&
      nowMs - Date.parse(shipment.lastEtaRevisionAt) < REVISION_COOLDOWN_MINUTES * MINUTE;
    // Customer-facing revisions only once the shipment is moving (brain/11 §4).
    const material = shipment.status !== "ORDER_BOOKED" && deltaMinutes >= threshold && !coolingDown;

    if (material) {
      shipment.previousEtaAt = communicated;
      shipment.lastNotifiedEtaAt = prediction.predictedEtaAt;
      shipment.lastEtaRevisionAt = prediction.generatedAt;
    }
    prediction.previousEtaAt = shipment.previousEtaAt;
    applyPrediction(shipment, prediction);
    await repos.shipments.saveEta(prediction);

    const moved = previousPredictedAt
      ? Math.abs(Date.parse(prediction.predictedEtaAt) - Date.parse(previousPredictedAt)) / MINUTE >= 1
      : true;
    if (moved || riskFrom !== prediction.riskLevel) {
      changes.push({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        previousPredictedAt,
        predictedAt: prediction.predictedEtaAt,
        riskFrom,
        riskTo: prediction.riskLevel,
        material,
        communicatedEtaAt: material ? communicated : undefined,
        explanation: prediction.explanation,
      });
    }
  }
  return changes;
}

async function getForShipment(shipmentId: string): Promise<EtaPrediction> {
  const repos = getRepositories();
  const shipment = await repos.shipments.getById(shipmentId);
  if (!shipment) throw notFound("SHIPMENT_NOT_FOUND", "Shipment not found.");
  if (shipment.status === "DELIVERED") {
    const deliveredAt = shipment.deliveredAt ?? shipment.lastUpdatedAt;
    return {
      shipmentId,
      predictedEtaAt: deliveredAt,
      previousEtaAt: shipment.revisedEtaAt,
      generatedAt: deliveredAt,
      delayMinutes: shipment.delayMinutes,
      confidence: 1,
      riskLevel: shipment.riskLevel,
      factors: [],
      bufferMinutes: Math.round((Date.parse(shipment.promisedDeliveryAt) - Date.parse(deliveredAt)) / MINUTE),
      dataFreshnessAt: deliveredAt,
      explanation: shipment.delayReason ?? "Delivered within the promised window.",
    };
  }
  const stored = await repos.shipments.getEta(shipmentId);
  if (stored) return { ...stored, previousEtaAt: stored.previousEtaAt ?? shipment.previousEtaAt };
  const prediction = await predict(shipment);
  if (!prediction) throw notFound("SHIPMENT_NOT_FOUND", "Route for shipment not found.");
  return prediction;
}

export const etaService = { compute: computeEta, predict, refreshActive, getForShipment };
