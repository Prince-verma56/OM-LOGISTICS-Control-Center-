import type { HubRecord } from "@/data/store/types";
import { HUB_DEFINITIONS, PLACES } from "./geography";
import type { Rng } from "./prng";

/** 20 hubs across Indian logistics corridors. */
export function buildHubs(rng: Rng): HubRecord[] {
  return HUB_DEFINITIONS.map((definition) => {
    const place = PLACES[definition.place];
    const baselineDwell = Math.round(rng.float(24, 48) + definition.weight * 1.2);
    return {
      id: definition.id,
      code: definition.code,
      name: definition.name,
      city: place.name === "Bhiwandi" ? "Mumbai" : place.name,
      state: place.state,
      latitude: place.lat,
      longitude: place.lng,
      status: "NORMAL",
      arrivals: Math.round(definition.weight * rng.float(9, 15)),
      departures: Math.round(definition.weight * rng.float(8, 14)),
      baselineInventory: Math.round(definition.weight * rng.float(0.8, 1.8)),
      baselineDwellMinutes: baselineDwell,
      averageDwellMinutes: baselineDwell,
      activeShipments: 0,
    };
  });
}
