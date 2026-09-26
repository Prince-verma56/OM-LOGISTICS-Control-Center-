import type { Counters, HubRecord, ShipmentRecord } from "@/data/store/types";
import type { NotificationSeverity, NotificationStatus, NotificationTemplate } from "@/lib/constants/statuses";
import {
  atRiskNotice,
  deliveredNotice,
  hubReachedNotice,
  outForDeliveryNotice,
  revisedEtaNotice,
  trackingLinkNotice,
} from "@/lib/intelligence/copy";
import type { HubVisit } from "@/types/hub";
import type { DemoNotification } from "@/types/notification";
import type { Rng } from "./prng";
import { MINUTE_MS, isoAt } from "./shipment-events";

export const SEED_NOTIFICATION_TOTAL = 300;

export function makeNotification(
  counters: Counters,
  params: {
    shipment?: Pick<ShipmentRecord, "id" | "trackingNumber">;
    template: NotificationTemplate;
    severity: NotificationSeverity;
    title: string;
    message: string;
    createdAt: string;
    status?: NotificationStatus;
  },
): DemoNotification {
  counters.notification += 1;
  return {
    id: `ntf_${counters.notification.toString(36).padStart(6, "0")}`,
    shipmentId: params.shipment?.id,
    trackingNumber: params.shipment?.trackingNumber,
    template: params.template,
    channel: "IN_APP",
    provider: "DEMO",
    status: params.status ?? "DELIVERED",
    title: params.title,
    message: params.message,
    createdAt: params.createdAt,
    severity: params.severity,
  };
}

export function notificationKey(shipmentId: string | undefined, template: NotificationTemplate, eventKey: string): string {
  return `${shipmentId ?? "global"}:${template}:IN_APP:${eventKey}`;
}

/** Historical in-app notification records (brain/18: ~300). Newest first. */
export function buildNotifications(params: {
  rng: Rng;
  nowMs: number;
  counters: Counters;
  shipments: Map<string, ShipmentRecord>;
  hubVisits: Map<string, HubVisit[]>;
  hubs: Map<string, HubRecord>;
}): { notifications: DemoNotification[]; keys: Set<string> } {
  const { rng, nowMs, counters } = params;
  const candidates: Array<{ key: string; build: () => DemoNotification; at: number }> = [];

  const push = (
    shipment: ShipmentRecord,
    template: NotificationTemplate,
    severity: NotificationSeverity,
    copy: { title: string; message: string },
    atMs: number,
    eventKey: string,
  ) => {
    if (atMs > nowMs) return;
    const status: NotificationStatus =
      nowMs - atMs < 3 * MINUTE_MS ? "TRIGGERED" : rng.chance(0.02) ? "FAILED" : "DELIVERED";
    candidates.push({
      key: notificationKey(shipment.id, template, eventKey),
      at: atMs,
      build: () =>
        makeNotification(counters, {
          shipment,
          template,
          severity,
          ...copy,
          createdAt: isoAt(atMs),
          status,
        }),
    });
  };

  for (const shipment of params.shipments.values()) {
    if (shipment.pickedUpAt && rng.chance(0.45)) {
      push(shipment, "TRACKING_LINK", "INFO", trackingLinkNotice(shipment.trackingNumber), Date.parse(shipment.pickedUpAt) + 2 * MINUTE_MS, "pickup");
    }
    const visits = params.hubVisits.get(shipment.id) ?? [];
    const lastArrival = [...visits].reverse().find((visit) => visit.arrivedAt);
    if (lastArrival?.arrivedAt && rng.chance(0.55)) {
      push(
        shipment,
        "SHIPMENT_UPDATE",
        "INFO",
        hubReachedNotice(shipment.trackingNumber, lastArrival.hubName),
        Date.parse(lastArrival.arrivedAt) + MINUTE_MS,
        `hub:${lastArrival.hubId}`,
      );
    }
    if (shipment.status === "OUT_FOR_DELIVERY" && rng.chance(0.7)) {
      push(shipment, "SHIPMENT_UPDATE", "INFO", outForDeliveryNotice(shipment.trackingNumber, shipment.destination), nowMs - rng.float(5, 40) * MINUTE_MS, "ofd");
    }
    if (shipment.status === "DELIVERED" && shipment.deliveredAt) {
      push(shipment, "SHIPMENT_UPDATE", "SUCCESS", deliveredNotice(shipment.trackingNumber, shipment.destination), Date.parse(shipment.deliveredAt) + MINUTE_MS, "delivered");
      if (shipment.delayMinutes > 30 && shipment.revisedEtaAt) {
        push(
          shipment,
          "REVISED_ETA",
          "WARNING",
          revisedEtaNotice(shipment.trackingNumber, shipment.originalEtaAt, shipment.revisedEtaAt),
          Date.parse(shipment.deliveredAt) - rng.float(120, 360) * MINUTE_MS,
          "eta:seed",
        );
      }
    }
    if ((shipment.riskLevel === "HIGH" || shipment.riskLevel === "CRITICAL") && shipment.status !== "DELIVERED") {
      const at = nowMs - rng.float(5, 120) * MINUTE_MS;
      if (rng.chance(0.85)) {
        push(
          shipment,
          "DELAY_NOTICE",
          shipment.riskLevel === "CRITICAL" ? "CRITICAL" : "WARNING",
          atRiskNotice(shipment.trackingNumber, shipment.delayReason ?? "Running behind plan."),
          at,
          `risk:${shipment.riskLevel}`,
        );
      }
      if (shipment.revisedEtaAt && rng.chance(0.75)) {
        push(
          shipment,
          "REVISED_ETA",
          "WARNING",
          revisedEtaNotice(shipment.trackingNumber, shipment.originalEtaAt, shipment.revisedEtaAt),
          at + MINUTE_MS,
          "eta:seed",
        );
      }
    }
  }

  const selected = candidates.sort((a, b) => b.at - a.at).slice(0, SEED_NOTIFICATION_TOTAL);
  // Build oldest → newest so ids increase with time, then present newest first.
  const notifications = [...selected].reverse().map((candidate) => candidate.build()).reverse();
  return { notifications, keys: new Set(selected.map((candidate) => candidate.key)) };
}
