import type { VehiclePositionUpdate } from "./fleet";
import type { Exception } from "./exception";
import type { DemoNotification } from "./notification";

export const SIMULATION_SPEEDS = [1, 5, 20] as const;
export type SimulationSpeed = (typeof SIMULATION_SPEEDS)[number];

export const DEMO_SCENARIO_TRIGGERS = [
  "TRAFFIC_INCREASE",
  "CREATE_ROUTE_DEVIATION",
  "HUB_DWELL_INCREASE",
  "NO_MOVEMENT",
  "COMPLETE_DELIVERY",
] as const;
export type DemoScenarioTrigger = (typeof DEMO_SCENARIO_TRIGGERS)[number];

export interface SimulationState {
  enabled: boolean;
  demoMode: boolean;
  running: boolean;
  speed: SimulationSpeed;
  tick: number;
  /** Simulated clock (ISO). All operational timestamps use this clock. */
  simulatedNow: string;
  /** Wall-clock time of the last tick (ISO). */
  lastTickAt?: string;
  /** Wall-clock time the dataset was (re)seeded. */
  seededAt: string;
  tickIntervalMs: number;
  simulatedMinutesPerTick: number;
  subscribers: number;
  activeScenarios: DemoScenarioTrigger[];
}

export interface ScenarioTriggerResult {
  scenario: DemoScenarioTrigger;
  applied: boolean;
  message: string;
  shipmentId?: string;
  trackingNumber?: string;
  vehicleId?: string;
}

export const REALTIME_EVENT_TYPES = [
  "SIMULATION_STATE",
  "SIMULATION_TICK",
  "VEHICLE_POSITION_UPDATED",
  "SHIPMENT_STATUS_CHANGED",
  "ETA_UPDATED",
  "EXCEPTION_CREATED",
  "EXCEPTION_UPDATED",
  "HUB_DWELL_UPDATED",
  "NOTIFICATION_UPDATED",
] as const;
export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[number];

interface EventPayloads {
  SIMULATION_STATE: { state: SimulationState; reason: "CONNECTED" | "CONTROL" | "RESET" };
  SIMULATION_TICK: { state: SimulationState };
  VEHICLE_POSITION_UPDATED: { positions: VehiclePositionUpdate[] };
  SHIPMENT_STATUS_CHANGED: { shipmentId: string; trackingNumber: string; from: string; to: string };
  ETA_UPDATED: {
    shipmentId: string;
    trackingNumber: string;
    previousEtaAt?: string;
    predictedEtaAt: string;
    riskLevel: string;
  };
  EXCEPTION_CREATED: { exception: Exception };
  EXCEPTION_UPDATED: { exception: Exception };
  HUB_DWELL_UPDATED: { hubId: string; averageDwellMinutes: number; status: string };
  NOTIFICATION_UPDATED: { notification: DemoNotification };
}

export type RealtimeEvent = {
  [K in RealtimeEventType]: {
    id: string;
    type: K;
    /** Simulated time the event occurred at. */
    occurredAt: string;
    data: EventPayloads[K];
  };
}[RealtimeEventType];

export type RealtimeEventOf<K extends RealtimeEventType> = Extract<RealtimeEvent, { type: K }>;

/** Distributive helper so callers can build events without an `id`. */
export type RealtimeEventInput = RealtimeEvent extends infer E
  ? E extends RealtimeEvent
    ? Omit<E, "id">
    : never
  : never;
