import { DEMO_CONFIG } from "@/config/demo";
import { createRng } from "@/data/seed/prng";
import { MINUTE_MS, isoAt } from "@/data/seed/shipment-events";
import type { DemoDataset, VehicleTrip } from "@/data/store/types";
import type { DemoScenarioTrigger } from "@/types/realtime";
import { deliverShipment, type WorldChanges } from "./demo-simulator";

/**
 * Presenter-triggered demo events (brain/19 §4). Each mutates the simulated
 * world only; ETA, exceptions and notifications follow through the normal
 * services pipeline, exactly as they would for organic events.
 */

export interface ScenarioOutcome {
  applied: boolean;
  message: string;
  vehicleId?: string;
  shipmentId?: string;
  trackingNumber?: string;
  /** Highlight this shipment's notifications (toast even when INFO). */
  spotlight?: boolean;
}

function leadShipment(dataset: DemoDataset, vehicleId: string) {
  const vehicle = dataset.vehicles.get(vehicleId);
  const shipments = (vehicle?.shipmentIds ?? []).map((id) => dataset.shipments.get(id)).filter(Boolean);
  return shipments.find((shipment) => shipment?.demoScenario) ?? shipments[0];
}

function movingTrips(dataset: DemoDataset, predicate: (trip: VehicleTrip) => boolean = () => true): VehicleTrip[] {
  return [...dataset.trips.values()].filter((trip) => {
    const vehicle = dataset.vehicles.get(trip.vehicleId);
    return (
      trip.phase === "EN_ROUTE" &&
      !trip.offline &&
      !trip.fixtureHold &&
      !trip.stationarySince &&
      vehicle?.status === "MOVING" &&
      (vehicle?.shipmentIds.length ?? 0) > 0 &&
      predicate(trip)
    );
  });
}

export function applyScenario(
  dataset: DemoDataset,
  scenario: DemoScenarioTrigger,
  changes: WorldChanges,
): ScenarioOutcome {
  const rng = createRng(dataset.sim.rngState ^ 0x5bd1e995);
  dataset.sim.rngState = rng.getState();
  const nowMs = dataset.sim.simNowMs;

  switch (scenario) {
    case "TRAFFIC_INCREASE": {
      // First trigger: the headline shipment OML123456 at Agra (brain/18 §4B).
      const headlineId = dataset.shipmentIdByTracking.get(DEMO_CONFIG.headlineTrackingNumber);
      const headline = headlineId ? dataset.shipments.get(headlineId) : undefined;
      const headlineTrip = headline?.vehicleId ? dataset.trips.get(headline.vehicleId) : undefined;
      if (headline && headlineTrip && headlineTrip.fixtureHold && headline.status !== "DELIVERED") {
        headlineTrip.fixtureHold = false;
        headlineTrip.trafficDelayMinutes += 120;
        changes.trafficIncidents.push({ vehicleId: headlineTrip.vehicleId, minutes: 120 });
        return {
          applied: true,
          message: `Heavy traffic injected on NH19 near Agra for ${headline.trackingNumber} (+120 min).`,
          vehicleId: headlineTrip.vehicleId,
          shipmentId: headline.id,
          trackingNumber: headline.trackingNumber,
          spotlight: true,
        };
      }
      const candidates = movingTrips(dataset, (trip) => trip.trafficDelayMinutes < 30);
      if (candidates.length === 0) return { applied: false, message: "No moving vehicle available for a traffic event." };
      const trip = rng.pick(candidates);
      const minutes = Math.round(rng.float(80, 150));
      trip.trafficDelayMinutes += minutes;
      changes.trafficIncidents.push({ vehicleId: trip.vehicleId, minutes });
      const lead = leadShipment(dataset, trip.vehicleId);
      return {
        applied: true,
        message: `Heavy traffic injected for ${dataset.vehicles.get(trip.vehicleId)?.vehicleNumber} (+${minutes} min).`,
        vehicleId: trip.vehicleId,
        shipmentId: lead?.id,
        trackingNumber: lead?.trackingNumber,
        spotlight: true,
      };
    }

    case "CREATE_ROUTE_DEVIATION": {
      const candidates = movingTrips(
        dataset,
        (trip) => trip.deviationKm === 0 && trip.totalKm - trip.travelledKm > 120,
      );
      if (candidates.length === 0) return { applied: false, message: "No suitable vehicle for a route deviation." };
      const trip = rng.pick(candidates);
      trip.deviationKm = Math.round(rng.float(2.4, 3.8) * 10) / 10;
      trip.deviationSide = rng.chance(0.5) ? 1 : -1;
      trip.deviationTicksRemaining = 40;
      const lead = leadShipment(dataset, trip.vehicleId);
      changes.movedVehicleIds.add(trip.vehicleId);
      return {
        applied: true,
        message: `${dataset.vehicles.get(trip.vehicleId)?.vehicleNumber} pushed ${trip.deviationKm} km off its planned corridor.`,
        vehicleId: trip.vehicleId,
        shipmentId: lead?.id,
        trackingNumber: lead?.trackingNumber,
        spotlight: true,
      };
    }

    case "HUB_DWELL_INCREASE": {
      const atHub = [...dataset.trips.values()].filter(
        (trip) => trip.phase === "AT_HUB" && !trip.offline && (dataset.vehicles.get(trip.vehicleId)?.shipmentIds.length ?? 0) > 0,
      );
      const scenarioTrip = atHub.find((trip) => leadShipment(dataset, trip.vehicleId)?.demoScenario === "C_HUB_DWELL");
      const trip = scenarioTrip ?? (atHub.length ? rng.pick(atHub) : undefined);
      if (!trip || !trip.hubArrivedAt) return { applied: false, message: "No vehicle is currently at a hub." };
      trip.hubArrivedAt = isoAt(Date.parse(trip.hubArrivedAt) - 60 * MINUTE_MS);
      if (trip.dwellUntil) trip.dwellUntil = isoAt(Math.max(Date.parse(trip.dwellUntil), nowMs) + 45 * MINUTE_MS);
      const hub = trip.atHubId ? dataset.hubs.get(trip.atHubId) : undefined;
      const lead = leadShipment(dataset, trip.vehicleId);
      return {
        applied: true,
        message: `Dwell at ${hub?.name ?? "hub"} increased by 60 min for ${dataset.vehicles.get(trip.vehicleId)?.vehicleNumber}.`,
        vehicleId: trip.vehicleId,
        shipmentId: lead?.id,
        trackingNumber: lead?.trackingNumber,
        spotlight: true,
      };
    }

    case "NO_MOVEMENT": {
      const candidates = movingTrips(dataset);
      if (candidates.length === 0) return { applied: false, message: "No moving vehicle available." };
      const trip = rng.pick(candidates);
      trip.stationarySince = isoAt(nowMs - 34 * MINUTE_MS);
      trip.stationaryUntil = isoAt(nowMs + 90 * MINUTE_MS);
      const vehicle = dataset.vehicles.get(trip.vehicleId);
      if (vehicle) {
        vehicle.status = "STOPPED";
        vehicle.speedKph = 0;
      }
      changes.stoppages.push(trip.vehicleId);
      changes.movedVehicleIds.add(trip.vehicleId);
      const lead = leadShipment(dataset, trip.vehicleId);
      return {
        applied: true,
        message: `${vehicle?.vehicleNumber} has stopped outside a hub.`,
        vehicleId: trip.vehicleId,
        shipmentId: lead?.id,
        trackingNumber: lead?.trackingNumber,
        spotlight: true,
      };
    }

    case "COMPLETE_DELIVERY": {
      const outForDelivery = [...dataset.shipments.values()].filter((shipment) => shipment.status === "OUT_FOR_DELIVERY");
      if (outForDelivery.length === 0) return { applied: false, message: "No shipment is out for delivery right now." };
      const shipment = outForDelivery.find((item) => item.demoScenario) ?? rng.pick(outForDelivery);
      const vehicle = shipment.vehicleId ? dataset.vehicles.get(shipment.vehicleId) : undefined;
      deliverShipment(dataset, vehicle, shipment, nowMs, changes);
      return {
        applied: true,
        message: `${shipment.trackingNumber} delivered in ${shipment.destination}.`,
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        vehicleId: vehicle?.id,
        spotlight: true,
      };
    }
  }
}
