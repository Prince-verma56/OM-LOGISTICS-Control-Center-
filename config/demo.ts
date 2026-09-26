import type { SimulationSpeed } from "@/types/realtime";

/**
 * Demo / prototype configuration. Client-safe: contains no secrets.
 * Everything here describes how the *simulated* environment behaves.
 */
export const DEMO_CONFIG = {
  /** PRNG seed — the same seed always produces the same baseline dataset. */
  seed: 20_260_926,

  /** Wall-clock interval between simulation ticks. */
  tickIntervalMs: 2_000,
  /** Simulated minutes that elapse per tick at 1x (5x → 15 min, 20x → 60 min). */
  simulatedMinutesPerTickAt1x: 3,
  speeds: [1, 5, 20] as const satisfies readonly SimulationSpeed[],
  defaultSpeed: 5 as SimulationSpeed,

  /** Cap on automatically generated notifications per tick (keeps the center readable). */
  maxAutoNotificationsPerTick: 3,
  /** Cap on toasts shown from a single realtime batch. */
  maxToastsPerBatch: 3,
  /** GPS breadcrumbs kept per vehicle. */
  maxGpsPointsPerVehicle: 140,
  /** Notifications kept in memory. */
  maxNotifications: 600,

  /** Presentation timezone for all operator-facing timestamps. */
  timeZone: "Asia/Kolkata",
  timeZoneLabel: "IST",

  operator: {
    id: "usr_ops_001",
    name: "Demo Operator",
    role: "OPS_MANAGER",
    email: "operator@demo.invalid",
    initials: "DO",
  },

  /** Assignable operations users for the exception workflow (fictional). */
  assignees: [
    { id: "usr_ops_001", name: "Demo Operator" },
    { id: "usr_ops_002", name: "North Ops Desk" },
    { id: "usr_ops_003", name: "West Ops Desk" },
    { id: "usr_ops_004", name: "South Ops Desk" },
    { id: "usr_ops_005", name: "East Ops Desk" },
    { id: "usr_hub_001", name: "Hub Supervisor" },
    { id: "usr_tp_001", name: "Transport Partner Desk" },
  ],

  /** Tracking number of the headline traffic-delay scenario (brain/18 §4B). */
  headlineTrackingNumber: "OML123456",
} as const;

export type DemoAssignee = (typeof DEMO_CONFIG.assignees)[number];

/** Display labels for the curated demo scenarios (brain/18 §4). */
export const DEMO_SCENARIO_LABELS: Record<string, string> = {
  A_ON_TIME: "Scenario A · On time",
  B_TRAFFIC_DELAY: "Scenario B · Traffic delay",
  C_HUB_DWELL: "Scenario C · Hub dwell",
  D_ROUTE_DEVIATION: "Scenario D · Route deviation",
  E_NO_MOVEMENT: "Scenario E · No movement",
  F_DELIVERED: "Scenario F · Delivered",
};

export function assigneeName(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return DEMO_CONFIG.assignees.find((assignee) => assignee.id === id)?.name ?? id;
}
