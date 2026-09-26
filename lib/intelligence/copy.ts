import type { ExceptionType } from "@/lib/constants/statuses";
import type { Thresholds } from "@/lib/constants/thresholds";
import { formatTime } from "@/lib/formatters/date";

/**
 * Operator-facing and customer-facing message copy. Kept in one place so the
 * seed generator, the simulator and services all produce consistent wording.
 */

export interface ExceptionCopyContext {
  trackingNumber: string;
  vehicleNumber?: string;
  hubName?: string;
  locationLabel?: string;
  corridor?: string;
  originHubName?: string;
  dwellMinutes?: number;
  stationaryMinutes?: number;
  deviationMeters?: number;
  trafficMinutes?: number;
  bufferMinutes?: number;
  gpsAgeMinutes?: number;
  overdueMinutes?: number;
  affectedCount?: number;
}

const at = (label?: string) => (label ? ` ${label.startsWith("Near") ? label.charAt(0).toLowerCase() + label.slice(1) : `at ${label}`}` : "");

export function exceptionCopy(
  type: ExceptionType,
  context: ExceptionCopyContext,
  thresholds: Thresholds,
): { title: string; description: string } {
  const vehicle = context.vehicleNumber ?? "Vehicle";
  const affected =
    context.affectedCount && context.affectedCount > 1 ? ` ${context.affectedCount} shipments on this vehicle affected.` : "";

  switch (type) {
    case "DELAY_RISK": {
      const buffer = context.bufferMinutes ?? 0;
      return {
        title: `Delay risk — ${context.trackingNumber}`,
        description:
          buffer < 0
            ? `Revised ETA is ${Math.abs(buffer)} min after promised delivery.${affected}`
            : `Buffer to promised delivery down to ${buffer} min.${affected}`,
      };
    }
    case "HUB_DWELL":
      return {
        title: `Hub dwell ${Math.round(context.dwellMinutes ?? 0)} min at ${context.hubName ?? "hub"}`,
        description: `${vehicle} has been at ${context.hubName ?? "the hub"} for ${Math.round(
          context.dwellMinutes ?? 0,
        )} min (threshold ${thresholds.hubDwellWarningMinutes} min).${affected}`,
      };
    case "NO_MOVEMENT":
      return {
        title: `No movement — ${vehicle}`,
        description: `Vehicle stationary${at(context.locationLabel)} for ${Math.round(
          context.stationaryMinutes ?? 0,
        )} min outside a hub (threshold ${thresholds.noMovementMinutes} min).${affected}`,
      };
    case "ROUTE_DEVIATION":
      return {
        title: `Route deviation — ${vehicle}`,
        description: `${vehicle} is ${((context.deviationMeters ?? 0) / 1000).toFixed(1)} km off the planned ${
          context.corridor ?? ""
        } corridor${at(context.locationLabel)} (tolerance ${(thresholds.routeDeviationMeters / 1000).toFixed(1)} km).`,
      };
    case "TRAFFIC":
      return {
        title: `Heavy traffic on ${context.corridor ?? "corridor"}`,
        description: `Congestion${at(context.locationLabel)} expected to add ${Math.round(
          context.trafficMinutes ?? 0,
        )} min for ${vehicle}. ETA revised.${affected}`,
      };
    case "STALE_GPS":
      return {
        title: `GPS stale — ${vehicle}`,
        description: `No GPS update for ${Math.round(context.gpsAgeMinutes ?? 0)} min. Showing last known position${at(
          context.locationLabel,
        )}.`,
      };
    case "MISSED_MILESTONE":
      return {
        title: `Pickup overdue — ${context.trackingNumber}`,
        description: `Scheduled pickup at ${context.originHubName ?? "origin hub"} passed ${Math.round(
          context.overdueMinutes ?? 0,
        )} min ago without a pickup scan.`,
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Customer / in-app notification copy                                        */
/* -------------------------------------------------------------------------- */

export function atRiskNotice(trackingNumber: string, reason: string) {
  return {
    title: `Shipment ${trackingNumber} is now at risk.`,
    message: reason,
  };
}

export function revisedEtaNotice(trackingNumber: string, previousEtaAt: string, revisedEtaAt: string, reason?: string) {
  return {
    title: `ETA updated from ${formatTime(previousEtaAt)} to ${formatTime(revisedEtaAt)}.`,
    message: `Shipment ${trackingNumber}${reason ? ` · ${reason}` : " · revised estimate shared with the customer."}`,
  };
}

export function hubReachedNotice(trackingNumber: string, hubName: string) {
  return {
    title: `Shipment reached ${hubName}.`,
    message: `${trackingNumber} arrived at ${hubName}.`,
  };
}

export function outForDeliveryNotice(trackingNumber: string, destination: string) {
  return {
    title: `Shipment ${trackingNumber} is out for delivery.`,
    message: `Last-mile delivery in progress in ${destination}.`,
  };
}

export function deliveredNotice(trackingNumber: string, destination: string) {
  return {
    title: `Shipment ${trackingNumber} delivered.`,
    message: `Delivered in ${destination}.`,
  };
}

export function trackingLinkNotice(trackingNumber: string) {
  return {
    title: `Tracking link shared — ${trackingNumber}`,
    message: "Customer tracking link generated at pickup.",
  };
}

export function deviationNotice(vehicleNumber: string, trackingNumber: string) {
  return {
    title: `Vehicle ${vehicleNumber} deviated from planned route.`,
    message: `Shipment ${trackingNumber} · vehicle is outside the planned corridor.`,
  };
}

export function noMovementNotice(vehicleNumber: string, minutes: number) {
  return {
    title: `Vehicle ${vehicleNumber} has stopped.`,
    message: `No movement for ${Math.round(minutes)} min outside a hub.`,
  };
}

export function hubDwellNotice(trackingNumber: string, hubName: string, minutes: number) {
  return {
    title: `Hub dwell alert — ${hubName}.`,
    message: `Shipment ${trackingNumber} waiting ${Math.round(minutes)} min at ${hubName}.`,
  };
}
