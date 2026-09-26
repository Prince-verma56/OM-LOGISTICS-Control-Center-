import { getDemoStore } from "@/data/store/demo-store";
import type { FleetRepository } from "./types";

/** Fleet repository (vehicles, trips, GPS) backed by the in-memory demo store. */
export class DummyFleetRepository implements FleetRepository {
  async list() {
    return [...getDemoStore().vehicles.values()];
  }

  async getById(id: string) {
    return getDemoStore().vehicles.get(id);
  }

  async getTrip(vehicleId: string) {
    return getDemoStore().trips.get(vehicleId);
  }

  async listTrips() {
    return [...getDemoStore().trips.values()];
  }

  async listGps(vehicleId: string, limit?: number) {
    const points = getDemoStore().gps.get(vehicleId) ?? [];
    return limit ? points.slice(-limit) : [...points];
  }
}
