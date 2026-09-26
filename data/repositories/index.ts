import { getDemoStore } from "@/data/store/demo-store";
import { getAppConfig } from "@/lib/config/app";
import { DummyExceptionRepository } from "./dummy-exception-repository";
import { DummyFleetRepository } from "./dummy-fleet-repository";
import { DummyAnalyticsRepository, DummyHubRepository } from "./dummy-hub-repository";
import { DummyNotificationRepository } from "./dummy-notification-repository";
import { DummyRouteRepository, DummyShipmentRepository } from "./dummy-shipment-repository";
import type { Repositories } from "./types";

export type * from "./types";

let repositories: Repositories | undefined;
let warned = false;

/**
 * Repository registry — the single seam where data sources are chosen.
 *
 * DEMO_MODE=true  → dummy repositories over the seeded, simulated store.
 * DEMO_MODE=false → future PostgreSQL (Prisma) repositories fed by TMS / WMS /
 *                   GPS / traffic adapters. Not implemented in Phase 1, so the
 *                   demo repositories are used and the UI keeps showing
 *                   DEMO DATA (the `source` flag drives that badge).
 */
export function getRepositories(): Repositories {
  if (repositories) return repositories;
  const config = getAppConfig();
  if (!config.demoMode && !warned) {
    warned = true;
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "REPOSITORY_FALLBACK",
        message: "DEMO_MODE=false but real repositories are not implemented yet; using demo repositories.",
      }),
    );
  }
  repositories = {
    source: "DEMO",
    clock: { now: () => new Date(getDemoStore().sim.simNowMs) },
    shipments: new DummyShipmentRepository(),
    routes: new DummyRouteRepository(),
    fleet: new DummyFleetRepository(),
    hubs: new DummyHubRepository(),
    exceptions: new DummyExceptionRepository(),
    notifications: new DummyNotificationRepository(),
    analytics: new DummyAnalyticsRepository(),
  };
  return repositories;
}
