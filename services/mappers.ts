import type { HubRecord, ShipmentRecord, VehicleRecord, VehicleTrip } from "@/data/store/types";
import { PLACE_LIST } from "@/data/seed/geography";
import { progressPct } from "@/data/store/trip-math";
import { RISK_RANK, type RiskLevel } from "@/lib/constants/statuses";
import type { Thresholds } from "@/lib/constants/thresholds";
import { gpsFreshness } from "@/lib/intelligence/rules";
import { describeLocation } from "@/lib/map/geo";
import type { Exception, ExceptionListItem } from "@/types/exception";
import type { Vehicle } from "@/types/fleet";
import type { Hub } from "@/types/hub";
import type { Shipment } from "@/types/shipment";

/**
 * Record → public contract mappers. Internal/simulation-only fields never
 * leave the service layer.
 */

const INTERNAL_SHIPMENT_FIELDS = ["scheduledPickupAt", "lastNotifiedEtaAt", "lastNotifiedRisk", "previousEtaAt"] as const;

export function toShipment(record: ShipmentRecord): Shipment {
  const shipment: Partial<ShipmentRecord> = { ...record };
  for (const field of INTERNAL_SHIPMENT_FIELDS) delete shipment[field];
  return shipment as Shipment;
}

export function highestRisk(levels: Iterable<RiskLevel>): RiskLevel {
  let best: RiskLevel = "LOW";
  for (const level of levels) if (RISK_RANK[level] > RISK_RANK[best]) best = level;
  return best;
}

export function toVehicle(params: {
  record: VehicleRecord;
  trip?: VehicleTrip;
  shipments: Map<string, ShipmentRecord> | ((id: string) => ShipmentRecord | undefined);
  now: Date;
  thresholds: Thresholds;
  routeStops?: { hubId: string }[];
}): Vehicle {
  const { record, trip, now, thresholds } = params;
  const lookup =
    typeof params.shipments === "function" ? params.shipments : (id: string) => (params.shipments as Map<string, ShipmentRecord>).get(id);
  const risks = record.shipmentIds.map((id) => lookup(id)?.riskLevel).filter(Boolean) as RiskLevel[];
  const freshness = record.status === "OFFLINE" ? "OFFLINE" : gpsFreshness(record.lastGpsAt, now, thresholds);
  const onTrip = trip && trip.phase !== "IDLE";
  return {
    id: record.id,
    vehicleNumber: record.vehicleNumber,
    vehicleType: record.vehicleType,
    status: record.status,
    currentLocation: {
      lat: record.lat,
      lng: record.lng,
      headingDeg: record.headingDeg,
      speedKph: record.speedKph,
      recordedAt: record.lastGpsAt,
    },
    currentShipmentIds: [...record.shipmentIds],
    lastGpsAt: record.lastGpsAt,
    homeHubId: record.homeHubId,
    routeId: onTrip ? trip.routeId : undefined,
    riskLevel: highestRisk(risks),
    progressPct: onTrip ? progressPct(trip) : undefined,
    gpsFreshness: freshness,
    locationLabel: describeLocation([record.lng, record.lat], PLACE_LIST),
    atHubId: onTrip && trip.phase === "AT_HUB" ? trip.atHubId : undefined,
    nextHubId: onTrip && params.routeStops ? params.routeStops[trip.nextStopIndex]?.hubId : undefined,
  };
}

export function toHub(record: HubRecord, extras: { highDwellExceptions: number; vehiclesOnSite: number }): Hub {
  return {
    id: record.id,
    name: record.name,
    city: record.city,
    latitude: record.latitude,
    longitude: record.longitude,
    status: record.status,
    arrivals: record.arrivals,
    departures: record.departures,
    activeShipments: record.activeShipments,
    averageDwellMinutes: record.averageDwellMinutes,
    code: record.code,
    state: record.state,
    highDwellExceptions: extras.highDwellExceptions,
    vehiclesOnSite: extras.vehiclesOnSite,
  };
}

export function toExceptionListItem(
  exception: Exception,
  lookups: {
    shipment?: ShipmentRecord;
    vehicle?: VehicleRecord;
    hub?: HubRecord;
  },
): ExceptionListItem {
  const { shipment, vehicle, hub } = lookups;
  return {
    ...exception,
    trackingNumber: shipment?.trackingNumber ?? "—",
    customerName: shipment?.customerName ?? "—",
    vehicleNumber: vehicle?.vehicleNumber ?? shipment?.vehicleNumber,
    currentLocationLabel: shipment?.locationLabel,
    revisedEtaAt: shipment?.status === "DELIVERED" ? shipment.deliveredAt : (shipment?.revisedEtaAt ?? shipment?.originalEtaAt),
    hubName: hub?.name,
  };
}
