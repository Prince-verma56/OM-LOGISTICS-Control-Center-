import {
  RISK_LABELS,
  SHIPMENT_STATUS_LABELS,
  type RiskLevel,
  type ShipmentStatus,
} from "@/lib/constants/statuses";
import type { Shipment } from "@/types/shipment";
import { formatDuration } from "./date";

/** The ETA an operator should act on: revised when present, else original. */
export function currentEta(shipment: Pick<Shipment, "revisedEtaAt" | "originalEtaAt">): string {
  return shipment.revisedEtaAt ?? shipment.originalEtaAt;
}

export function formatDelay(delayMinutes: number): string {
  if (delayMinutes <= 0) return "On time";
  return `+${formatDuration(delayMinutes)}`;
}

export function formatLane(origin: string, destination: string): string {
  return `${origin} → ${destination}`;
}

export function statusLabel(status: ShipmentStatus): string {
  return SHIPMENT_STATUS_LABELS[status];
}

export function riskLabel(level: RiskLevel): string {
  return RISK_LABELS[level];
}

/** Public tracking path for an opaque token. */
export function trackingPath(token: string): string {
  return `/customers/tracking/${token}`;
}

export function shipmentPath(shipmentId: string): string {
  return `/shipments/${shipmentId}`;
}
