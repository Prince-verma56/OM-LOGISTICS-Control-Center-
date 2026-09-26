import type { HubStatus, HubVisitStatus } from "@/lib/constants/statuses";
import type { ExceptionListItem } from "./exception";
import type { Shipment } from "./shipment";

export type { HubStatus };

export interface Hub {
  id: string;
  name: string;
  city: string;

  latitude: number;
  longitude: number;

  status: HubStatus;

  arrivals: number;
  departures: number;
  activeShipments: number;
  averageDwellMinutes: number;

  /* ---- Enrichments ---- */
  code: string;
  state: string;
  /** Open HUB_DWELL exceptions at this hub. */
  highDwellExceptions: number;
  /** Vehicles currently parked at the hub. */
  vehiclesOnSite: number;
}

export interface HubVisit {
  hubId: string;
  hubName: string;
  city: string;
  arrivedAt?: string;
  departedAt?: string;
  dwellMinutes?: number;
  status: HubVisitStatus;
}

export interface HubDetail {
  hub: Hub;
  waitingShipments: Shipment[];
  exceptions: ExceptionListItem[];
  inboundVehicles: number;
}
