import type { VehicleRecord } from "@/data/store/types";
import { HUB_DEFINITIONS, PLACES } from "./geography";
import type { Rng } from "./prng";

export const VEHICLE_TYPES = [
  "32 ft Multi-Axle (MXL)",
  "32 ft Single-Axle (SXL)",
  "24 ft Container",
  "22 ft Container",
  "20 ft Open Body",
  "19 ft LCV",
  "24 ft Reefer",
] as const;

const TYPE_WEIGHTS = [26, 22, 16, 12, 8, 10, 6];
const SERIES_LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";

export function vehicleNumber(rng: Rng, rtoPrefix: string): string {
  const series = `${rng.pick([...SERIES_LETTERS])}${rng.pick([...SERIES_LETTERS])}`;
  const digits = String(rng.int(1000, 9999));
  return `${rtoPrefix}${series}${digits}`;
}

/**
 * 100 vehicles homed across hubs in proportion to hub size. Positions are
 * placeholders here — `buildOperations` places each vehicle on its trip.
 */
export function buildVehicles(rng: Rng, count = 100): VehicleRecord[] {
  const weights = HUB_DEFINITIONS.map((hub) => hub.weight);
  const used = new Set<string>();
  const vehicles: VehicleRecord[] = [];

  for (let index = 0; index < count; index += 1) {
    const hub = rng.weighted(HUB_DEFINITIONS, weights);
    const place = PLACES[hub.place];
    let number = vehicleNumber(rng, rng.pick(hub.rto));
    while (used.has(number)) number = vehicleNumber(rng, rng.pick(hub.rto));
    used.add(number);

    vehicles.push({
      id: `veh_${String(index + 1).padStart(3, "0")}`,
      vehicleNumber: number,
      vehicleType: rng.weighted(VEHICLE_TYPES, TYPE_WEIGHTS),
      homeHubId: hub.id,
      status: "IDLE",
      lat: place.lat,
      lng: place.lng,
      headingDeg: 0,
      speedKph: 0,
      lastGpsAt: new Date(0).toISOString(),
      shipmentIds: [],
    });
  }
  return vehicles;
}
