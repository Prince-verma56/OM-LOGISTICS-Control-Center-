import { getRepositories } from "@/data/repositories";
import type { ShipmentRecord } from "@/data/store/types";
import { getThresholds } from "@/lib/config/app";
import { RISK_RANK } from "@/lib/constants/statuses";
import type { CollectionResponse, FleetListQuery } from "@/types/api";
import type { Vehicle, VehiclePositionUpdate } from "@/types/fleet";
import { highestRisk, toVehicle } from "./mappers";

async function buildVehicles(): Promise<Vehicle[]> {
  const repos = getRepositories();
  const [records, trips, shipments, routes] = await Promise.all([
    repos.fleet.list(),
    repos.fleet.listTrips(),
    repos.shipments.list(),
    repos.routes.list(),
  ]);
  const tripByVehicle = new Map(trips.map((trip) => [trip.vehicleId, trip]));
  const shipmentById = new Map<string, ShipmentRecord>(shipments.map((shipment) => [shipment.id, shipment]));
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const now = repos.clock.now();
  const thresholds = getThresholds();

  return records.map((record) => {
    const trip = tripByVehicle.get(record.id);
    return toVehicle({
      record,
      trip,
      shipments: shipmentById,
      now,
      thresholds,
      routeStops: trip ? routeById.get(trip.routeId)?.stops : undefined,
    });
  });
}

async function list(query: FleetListQuery): Promise<CollectionResponse<Vehicle>> {
  const needle = query.search?.toLowerCase();
  const fromMs = query.from ? new Date(query.from).getTime() : undefined;
  const toMs = query.to ? new Date(query.to).getTime() : undefined;
  
  const repos = getRepositories();
  const allShipments = await repos.shipments.list();

  const vehicles = (await buildVehicles()).filter((vehicle) => {
    if (query.vehicleStatus && vehicle.status !== query.vehicleStatus) return false;
    if (query.routeId && vehicle.routeId !== query.routeId) return false;
    if (query.vehicleId && vehicle.id !== query.vehicleId) return false;

    const vehicleShipments = vehicle.currentShipmentIds
      .map((id) => allShipments.find((s) => s.id === id))
      .filter((s): s is ShipmentRecord => s !== undefined);

    const hasMatchingShipment = vehicleShipments.some((shipment) => {
      if (query.status && shipment.status !== query.status) return false;
      if (query.riskLevel && shipment.riskLevel !== query.riskLevel) return false;
      if (query.customerId && shipment.customerId !== query.customerId) return false;
      if (query.hubId && shipment.currentHubId !== query.hubId && shipment.nextHubId !== query.hubId) return false;
      if (fromMs && new Date(shipment.bookedAt).getTime() < fromMs) return false;
      if (toMs && new Date(shipment.bookedAt).getTime() > toMs) return false;
      return true;
    });

    const hasShipmentFilters = query.status || query.riskLevel || query.customerId || query.hubId || query.from || query.to;
    if (hasShipmentFilters && !hasMatchingShipment) return false;

    if (needle) {
      const matchVehicle = [vehicle.vehicleNumber, vehicle.vehicleType, vehicle.locationLabel].some(
        (value) => value?.toLowerCase().includes(needle),
      );
      const matchShipment = vehicleShipments.some((shipment) =>
        [shipment.trackingNumber, shipment.customerName, shipment.origin, shipment.destination].some(
          (value) => value?.toLowerCase().includes(needle),
        ),
      );
      if (!matchVehicle && !matchShipment) return false;
    }

    return true;
  });
  vehicles.sort(
    (a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] || a.vehicleNumber.localeCompare(b.vehicleNumber),
  );
  return { data: vehicles };
}

async function getById(id: string): Promise<Vehicle | undefined> {
  return (await buildVehicles()).find((vehicle) => vehicle.id === id);
}

/** Compact positions streamed on every simulation tick. */
async function positions(): Promise<VehiclePositionUpdate[]> {
  const repos = getRepositories();
  const [records, trips, shipments] = await Promise.all([
    repos.fleet.list(),
    repos.fleet.listTrips(),
    repos.shipments.list(),
  ]);
  const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));
  const tripByVehicle = new Map(trips.map((trip) => [trip.vehicleId, trip]));
  return records.map((record) => {
    const trip = tripByVehicle.get(record.id);
    const onTrip = trip && trip.phase !== "IDLE";
    return {
      id: record.id,
      lat: record.lat,
      lng: record.lng,
      headingDeg: record.headingDeg,
      speedKph: record.speedKph,
      status: record.status,
      riskLevel: highestRisk(record.shipmentIds.map((id) => shipmentById.get(id)?.riskLevel ?? "LOW")),
      progressPct: onTrip ? Math.round((trip.travelledKm / trip.totalKm) * 100) : undefined,
      recordedAt: record.lastGpsAt,
    };
  });
}

export const fleetService = { list, getById, positions };
