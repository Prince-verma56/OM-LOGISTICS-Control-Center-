import type { Counters, HubRecord } from "@/data/store/types";
import type { DataSource, ShipmentEventType } from "@/lib/constants/statuses";
import type { HubVisit } from "@/types/hub";
import type { ShipmentEvent } from "@/types/shipment";

/**
 * Builders for normalized shipment events and hub visits, shared by the seed
 * generator and the simulator (brain/02 §8: every event has a source,
 * a source timestamp and a received timestamp).
 */

const SOURCE_BY_TYPE: Record<ShipmentEventType, DataSource> = {
  ORDER_BOOKED: "TMS",
  PICKED_UP: "TMS",
  DEPARTED_ORIGIN: "GPS_PROVIDER",
  HUB_REACHED: "WMS",
  HUB_DEPARTED: "WMS",
  OUT_FOR_DELIVERY: "TMS",
  DELIVERED: "TMS",
  ETA_REVISED: "DEMO",
  EXCEPTION_RAISED: "DEMO",
};

export function makeEvent(
  counters: Counters,
  params: {
    shipmentId: string;
    type: ShipmentEventType;
    occurredAt: string;
    title: string;
    description?: string;
    locationLabel?: string;
    hubId?: string;
    source?: DataSource;
  },
): ShipmentEvent {
  counters.event += 1;
  return {
    id: `evt_${counters.event.toString(36).padStart(6, "0")}`,
    shipmentId: params.shipmentId,
    type: params.type,
    title: params.title,
    description: params.description,
    locationLabel: params.locationLabel,
    hubId: params.hubId,
    occurredAt: params.occurredAt,
    receivedAt: new Date(Date.parse(params.occurredAt) + 25_000).toISOString(),
    // In demo mode every source is simulated; the nominal source shows where
    // the event would originate once real integrations are connected.
    source: params.source ?? SOURCE_BY_TYPE[params.type],
  };
}

export function hubVisit(hub: HubRecord, partial: Omit<HubVisit, "hubId" | "hubName" | "city">): HubVisit {
  return { hubId: hub.id, hubName: hub.name, city: hub.city, ...partial };
}

export function isoAt(ms: number): string {
  return new Date(Math.round(ms)).toISOString();
}

export const MINUTE_MS = 60_000;
