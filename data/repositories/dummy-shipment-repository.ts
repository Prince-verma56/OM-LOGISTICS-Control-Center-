import { getDemoStore } from "@/data/store/demo-store";
import type { EtaPrediction } from "@/types/eta";
import type { ShipmentEvent } from "@/types/shipment";
import type { RouteRepository, ShipmentRepository } from "./types";

/** Shipment + route repositories backed by the in-memory demo store. */
export class DummyShipmentRepository implements ShipmentRepository {
  async list() {
    return [...getDemoStore().shipments.values()];
  }

  async getById(id: string) {
    return getDemoStore().shipments.get(id);
  }

  async getByTrackingNumber(trackingNumber: string) {
    const store = getDemoStore();
    const id = store.shipmentIdByTracking.get(trackingNumber.trim().toUpperCase());
    return id ? store.shipments.get(id) : undefined;
  }

  async getByPublicToken(token: string) {
    const store = getDemoStore();
    const id = store.shipmentIdByToken.get(token);
    return id ? store.shipments.get(id) : undefined;
  }

  async update(id: string, patch: Parameters<ShipmentRepository["update"]>[1]) {
    const shipment = getDemoStore().shipments.get(id);
    if (!shipment) return undefined;
    Object.assign(shipment, patch);
    return shipment;
  }

  async listEvents(shipmentId: string) {
    return [...(getDemoStore().events.get(shipmentId) ?? [])];
  }

  async appendEvent(event: ShipmentEvent) {
    const events = getDemoStore().events;
    const list = events.get(event.shipmentId) ?? [];
    list.push(event);
    events.set(event.shipmentId, list);
  }

  async listHubVisits(shipmentId: string) {
    return [...(getDemoStore().hubVisits.get(shipmentId) ?? [])];
  }

  async getEta(shipmentId: string) {
    return getDemoStore().eta.get(shipmentId);
  }

  async saveEta(prediction: EtaPrediction) {
    getDemoStore().eta.set(prediction.shipmentId, prediction);
  }

  async listCustomers() {
    return [...getDemoStore().customers.values()];
  }
}

export class DummyRouteRepository implements RouteRepository {
  async list() {
    return [...getDemoStore().routes.values()];
  }

  async getById(id: string) {
    return getDemoStore().routes.get(id);
  }

  async getLine(id: string) {
    return getDemoStore().routeLines.get(id);
  }
}
