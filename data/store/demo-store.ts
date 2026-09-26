import { DEMO_CONFIG } from "@/config/demo";
import { generateDemoDataset } from "@/data/seed";
import { getAppConfig } from "@/lib/config/app";
import type { DemoDataset } from "./types";

/**
 * In-memory demo store (process singleton).
 *
 * Lives on `globalThis` so it survives Next.js dev hot-reloads and is shared by
 * every route handler in the Node.js process. Refreshing the browser never
 * re-seeds or duplicates events (brain/19 §6). A reset regenerates the seed.
 *
 * NOTE: On multi-instance / serverless deployments each instance would hold its
 * own copy. Production replaces this store with PostgreSQL-backed repositories
 * (see prisma/schema.prisma) — the UI does not change.
 */

interface StoreHolder {
  dataset?: DemoDataset;
  version: number;
}

const globalKey = Symbol.for("om.controlTower.demoStore");
type GlobalWithStore = typeof globalThis & { [globalKey]?: StoreHolder };

function holder(): StoreHolder {
  const scope = globalThis as GlobalWithStore;
  scope[globalKey] ??= { version: 0 };
  return scope[globalKey];
}

function seedNow(): DemoDataset {
  const config = getAppConfig();
  return generateDemoDataset({
    seed: DEMO_CONFIG.seed,
    anchorMs: Date.now(),
    trackingSecret: config.trackingTokenSecret,
    thresholds: config.thresholds,
    simulation: { running: config.simulationEnabled, speed: config.simulationSpeed },
  });
}

export function getDemoStore(): DemoDataset {
  const state = holder();
  if (!state.dataset) {
    state.dataset = seedNow();
    state.version += 1;
  }
  return state.dataset;
}

/** Re-seeds the dataset. Simulation running/speed preferences are preserved. */
export function resetDemoStore(): DemoDataset {
  const state = holder();
  const previous = state.dataset?.sim;
  const next = seedNow();
  if (previous) {
    next.sim.running = previous.running;
    next.sim.speed = previous.speed;
  }
  state.dataset = next;
  state.version += 1;
  return next;
}

export function demoStoreVersion(): number {
  return holder().version;
}
