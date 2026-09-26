import { DEMO_SCENARIO_LABELS } from "@/config/demo";

/**
 * Curated demo scenarios required by brain/18_DUMMY_DATA_SPEC.md §4.
 * Values are illustrative demo data — clearly simulated.
 */

export type DemoScenarioKey =
  | "A_ON_TIME"
  | "B_TRAFFIC_DELAY"
  | "C_HUB_DWELL"
  | "D_ROUTE_DEVIATION"
  | "E_NO_MOVEMENT"
  | "F_DELIVERED";

export interface ActiveScenarioFixture {
  key: Exclude<DemoScenarioKey, "F_DELIVERED">;
  label: string;
  description: string;
  vehicleId: string;
  vehicleNumber: string;
  routeId: string;
  trackingNumber: string;
  customerId: string;
  /** Where the vehicle sits on the route. */
  placement:
    | { kind: "AFTER_HUB"; hubId: string; offsetKm: number }
    | { kind: "AT_HUB"; hubId: string; dwellMinutes: number }
    | { kind: "FRACTION"; fraction: number };
  /** Minutes between original ETA and promised delivery. */
  bufferMinutes: number;
  lostMinutes: number;
  companionShipments: number;
  fixtureHold?: boolean;
  deviationKm?: number;
  stationaryMinutes?: number;
}

export const ACTIVE_SCENARIOS: readonly ActiveScenarioFixture[] = [
  {
    key: "B_TRAFFIC_DELAY",
    label: "Traffic delay",
    description:
      "Kolkata → Delhi consignment currently at Agra. Trigger 'Traffic increase' to inject heavy traffic on NH19: ETA moves ~2 h later and risk escalates.",
    vehicleId: "veh_001",
    vehicleNumber: "DL01AB1234",
    routeId: "rte_ccudel",
    trackingNumber: "OML123456",
    customerId: "cus_001",
    placement: { kind: "AFTER_HUB", hubId: "hub_agr", offsetKm: 2.5 },
    bufferMinutes: 90,
    lostMinutes: 0,
    companionShipments: 3,
    fixtureHold: true,
  },
  {
    key: "A_ON_TIME",
    label: "On-time shipment",
    description: "Bengaluru → Chennai consignment moving to plan with no exceptions.",
    vehicleId: "veh_002",
    vehicleNumber: "KA01MJ5521",
    routeId: "rte_blrmaa",
    trackingNumber: "OML100001",
    customerId: "cus_002",
    placement: { kind: "FRACTION", fraction: 0.32 },
    bufferMinutes: 180,
    lostMinutes: -10,
    companionShipments: 4,
  },
  {
    key: "C_HUB_DWELL",
    label: "Hub dwell",
    description: "Delhi → Kolkata vehicle held at Kanpur Hub beyond the dwell threshold. Resolves when operations closes the exception.",
    vehicleId: "veh_003",
    vehicleNumber: "UP78FT4410",
    routeId: "rte_delccu",
    trackingNumber: "OML100003",
    customerId: "cus_006",
    placement: { kind: "AT_HUB", hubId: "hub_knu", dwellMinutes: 96 },
    bufferMinutes: 120,
    lostMinutes: 20,
    companionShipments: 5,
  },
  {
    key: "D_ROUTE_DEVIATION",
    label: "Route deviation",
    description: "Mumbai → Bengaluru vehicle running outside the planned NH48 corridor near Kolhapur.",
    vehicleId: "veh_004",
    vehicleNumber: "MH12QX4821",
    routeId: "rte_bomblr",
    trackingNumber: "OML100004",
    customerId: "cus_005",
    placement: { kind: "FRACTION", fraction: 0.47 },
    bufferMinutes: 120,
    lostMinutes: 25,
    companionShipments: 3,
    deviationKm: 3.4,
  },
  {
    key: "E_NO_MOVEMENT",
    label: "No movement",
    description: "Delhi → Lucknow vehicle stationary on the expressway. Resumes when operations resolves the exception.",
    vehicleId: "veh_005",
    vehicleNumber: "UP32KD7719",
    routeId: "rte_dellko",
    trackingNumber: "OML100005",
    customerId: "cus_014",
    placement: { kind: "FRACTION", fraction: 0.66 },
    bufferMinutes: 120,
    lostMinutes: 30,
    companionShipments: 4,
    stationaryMinutes: 48,
  },
];

export const DELIVERED_SCENARIO = {
  key: "F_DELIVERED" as const,
  label: "Delivered",
  description: "Mumbai → Bengaluru consignment that completed every milestone on time.",
  trackingNumber: "OML100006",
  routeId: "rte_bomblr",
  customerId: "cus_016",
  deliveredHoursAgo: 26,
};

export const SCENARIO_LABELS: Record<DemoScenarioKey, string> = DEMO_SCENARIO_LABELS as Record<DemoScenarioKey, string>;

export const RESERVED_TRACKING_NUMBERS = new Set([
  ...ACTIVE_SCENARIOS.map((scenario) => scenario.trackingNumber),
  DELIVERED_SCENARIO.trackingNumber,
]);
export const RESERVED_VEHICLE_IDS = new Set(ACTIVE_SCENARIOS.map((scenario) => scenario.vehicleId));
