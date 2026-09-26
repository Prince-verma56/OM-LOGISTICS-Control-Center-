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
  const vehicles = (await buildVehicles()).filter((vehicle) => {
    if (query.status && vehicle.status !== query.status) return false;
    if (query.routeId && vehicle.routeId !== query.routeId) return false;
    if (
      needle &&
      ![vehicle.vehicleNumber, vehicle.vehicleType, vehicle.locationLabel].some((value) => value.toLowerCase().includes(needle))
    ) {
      return false;
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
