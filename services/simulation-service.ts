import { DEMO_CONFIG } from "@/config/demo";
import { getRepositories } from "@/data/repositories";
import { advanceWorld, emptyChanges, type WorldChanges } from "@/data/simulator/demo-simulator";
import { applyScenario, type ScenarioOutcome } from "@/data/simulator/scenarios";
import { getDemoStore, resetDemoStore } from "@/data/store/demo-store";
import { recomputeHubStats } from "@/data/store/hub-stats";
import { getAppConfig } from "@/lib/config/app";
import { RISK_RANK } from "@/lib/constants/statuses";
import {
  atRiskNotice,
  deliveredNotice,
  deviationNotice,
  hubDwellNotice,
  hubReachedNotice,
  noMovementNotice,
  outForDeliveryNotice,
  revisedEtaNotice,
  trackingLinkNotice,
} from "@/lib/intelligence/copy";
import { eventBus } from "@/lib/realtime/event-bus";
import { logger } from "@/lib/server/logger";
import type { SimulationControlInput } from "@/lib/validation/operations";
import type { NotificationMessage } from "@/types/notification";
import type {
  DemoScenarioTrigger,
  RealtimeEvent,
  ScenarioTriggerResult,
  SimulationState,
} from "@/types/realtime";
import { alertService } from "./alert-service";
import { etaService } from "./eta-service";
import { fleetService } from "./fleet-service";
import { notificationService } from "./notification-service";

/**
 * Simulation service — orchestrates one simulation tick:
 *
 *   DemoSimulator.advanceWorld()      (data layer: vehicles move, hubs, deliveries)
 *     → etaService.refreshActive()    (ETA + risk)
 *     → alertService.evaluate()       (exceptions: create / escalate / auto-resolve)
 *     → notificationService.trigger() (in-app notifications → Sonner)
 *     → eventBus                      (SSE → browser; TanStack Query refresh)
 *
 * The loop only runs while the simulation is enabled + running AND at least
 * one browser is subscribed, so an idle server does no work.
 */

interface LoopState {
  timer?: ReturnType<typeof setInterval>;
  ticking: boolean;
  /** Wall-clock time a polling client last asked for state (transport fallback). */
  lastPollAt?: number;
}

/** Polling clients keep the loop alive for this long after their last request. */
const POLL_KEEPALIVE_MS = 20_000;

const loopKey = Symbol.for("om.controlTower.simulationLoop");
type GlobalWithLoop = typeof globalThis & { [loopKey]?: LoopState };

function loop(): LoopState {
  const scope = globalThis as GlobalWithLoop;
  scope[loopKey] ??= { ticking: false };
  return scope[loopKey];
}

function minutesPerTick(speed: number): number {
  return DEMO_CONFIG.simulatedMinutesPerTickAt1x * speed;
}

function getState(): SimulationState {
  const store = getDemoStore();
  const config = getAppConfig();
  const sim = store.sim;
  return {
    enabled: config.simulationEnabled,
    demoMode: config.demoMode,
    running: config.simulationEnabled && sim.running,
    speed: sim.speed,
    tick: sim.tick,
    simulatedNow: new Date(sim.simNowMs).toISOString(),
    lastTickAt: sim.lastTickAt ? new Date(sim.lastTickAt).toISOString() : undefined,
    seededAt: new Date(store.seededAtMs).toISOString(),
    tickIntervalMs: DEMO_CONFIG.tickIntervalMs,
    simulatedMinutesPerTick: minutesPerTick(sim.speed),
    subscribers: eventBus.subscriberCount(),
    activeScenarios: [...sim.activeScenarios],
  };
}

function ensureLoop(): void {
  const state = loop();
  const sim = getDemoStore().sim;
  const pollingClient = state.lastPollAt !== undefined && Date.now() - state.lastPollAt < POLL_KEEPALIVE_MS;
  const shouldRun =
    getAppConfig().simulationEnabled && sim.running && (eventBus.subscriberCount() > 0 || pollingClient);
  if (shouldRun && !state.timer) {
    state.timer = setInterval(() => void safeTick(), DEMO_CONFIG.tickIntervalMs);
    logger.info("SIMULATION_LOOP_STARTED", { speed: sim.speed });
  } else if (!shouldRun && state.timer) {
    clearInterval(state.timer);
    state.timer = undefined;
    logger.info("SIMULATION_LOOP_STOPPED", {});
  }
}

async function safeTick(): Promise<void> {
  const state = loop();
  ensureLoop();
  if (state.ticking || !state.timer) return;
  state.ticking = true;
  try {
    await tick();
  } catch (error) {
    logger.error("SIMULATION_TICK_FAILED", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    state.ticking = false;
  }
}

async function tick(): Promise<void> {
  const store = getDemoStore();
  const sim = store.sim;
  if (!sim.running) return;
  const dt = minutesPerTick(sim.speed);
  sim.simNowMs += dt * 60_000;
  sim.tick += 1;
  sim.lastTickAt = Date.now();

  const changes = advanceWorld(store, dt);
  await processChanges(changes, { tick: sim.tick });
}

/* -------------------------------------------------------------------------- */
/* Change pipeline                                                            */
/* -------------------------------------------------------------------------- */

async function processChanges(
  changes: WorldChanges,
  context: { tick: number; spotlight?: ScenarioOutcome },
): Promise<void> {
  const store = getDemoStore();
  const repos = getRepositories();
  const nowIso = repos.clock.now().toISOString();
  // Only the shipment a presenter triggered bypasses notification budgets.
  const spotlightShipments = new Set<string>();
  const spotlightVehicles = new Set<string>();
  if (context.spotlight?.shipmentId) spotlightShipments.add(context.spotlight.shipmentId);
  if (context.spotlight?.vehicleId) spotlightVehicles.add(context.spotlight.vehicleId);

  // Separate budgets keep routine milestones from crowding out alerts.
  const budgets = { milestone: 1, alert: DEMO_CONFIG.maxAutoNotificationsPerTick };
  const notify = async (message: NotificationMessage, spotlight: boolean, kind: keyof typeof budgets = "alert") => {
    if (!spotlight && budgets[kind] <= 0) return;
    if (!spotlight) budgets[kind] -= 1;
    await notificationService.trigger(message);
  };
  const isSpotlight = (shipmentId: string) => spotlightShipments.has(shipmentId);
  /** Curated scenario shipments get celebratory milestone updates (still budgeted). */
  const isScenario = (shipmentId: string) => Boolean(store.shipments.get(shipmentId)?.demoScenario);

  /* 1. Milestones */
  let statusEvents = 0;
  for (const change of changes.statusChanges) {
    if (statusEvents < 10) {
      eventBus.publish({ type: "SHIPMENT_STATUS_CHANGED", occurredAt: nowIso, data: change });
      statusEvents += 1;
    }
    const shipment = store.shipments.get(change.shipmentId);
    if (!shipment) continue;
    const featured = isSpotlight(change.shipmentId);
    const severity = featured || isScenario(change.shipmentId) ? "SUCCESS" : "INFO";
    if (change.to === "HUB_REACHED" && change.hubId) {
      const hub = store.hubs.get(change.hubId);
      await notify(
        {
          shipmentId: shipment.id,
          template: "SHIPMENT_UPDATE",
          severity,
          ...hubReachedNotice(shipment.trackingNumber, hub?.name ?? "hub"),
          dedupeKey: `${shipment.id}:SHIPMENT_UPDATE:IN_APP:hub:${change.hubId}`,
        },
        featured,
        "milestone",
      );
    } else if (change.to === "OUT_FOR_DELIVERY") {
      await notify(
        {
          shipmentId: shipment.id,
          template: "SHIPMENT_UPDATE",
          severity,
          ...outForDeliveryNotice(shipment.trackingNumber, shipment.destination),
          dedupeKey: `${shipment.id}:SHIPMENT_UPDATE:IN_APP:ofd`,
        },
        featured,
        "milestone",
      );
    } else if (change.to === "DELIVERED") {
      await notify(
        {
          shipmentId: shipment.id,
          template: "SHIPMENT_UPDATE",
          severity,
          ...deliveredNotice(shipment.trackingNumber, shipment.destination),
          dedupeKey: `${shipment.id}:SHIPMENT_UPDATE:IN_APP:delivered`,
        },
        featured,
        "milestone",
      );
    } else if (change.to === "PICKED_UP") {
      await notify(
        {
          shipmentId: shipment.id,
          template: "TRACKING_LINK",
          severity: "INFO",
          ...trackingLinkNotice(shipment.trackingNumber),
          dedupeKey: `${shipment.id}:TRACKING_LINK:IN_APP:pickup`,
        },
        false,
        "milestone",
      );
    }
  }

  /* 2. ETA + risk */
  const etaChanges = await etaService.refreshActive();
  // Featured shipments first so their notifications are never crowded out.
  etaChanges.sort((a, b) => Number(isSpotlight(b.shipmentId)) - Number(isSpotlight(a.shipmentId)));
  let etaEvents = 0;
  for (const change of etaChanges) {
    const featured = isSpotlight(change.shipmentId);
    const shipment = store.shipments.get(change.shipmentId);
    if (!shipment) continue;
    const escalated = RISK_RANK[change.riskTo] >= RISK_RANK.HIGH && RISK_RANK[change.riskTo] > RISK_RANK[change.riskFrom];

    if (escalated) {
      await notify(
        {
          shipmentId: shipment.id,
          template: "DELAY_NOTICE",
          severity: change.riskTo === "CRITICAL" ? "CRITICAL" : "WARNING",
          ...atRiskNotice(shipment.trackingNumber, change.explanation),
          dedupeKey: `${shipment.id}:DELAY_NOTICE:IN_APP:${change.riskTo}`,
        },
        featured,
      );
      shipment.lastNotifiedRisk = change.riskTo;
    }
    if (change.material && change.communicatedEtaAt) {
      if (etaEvents < 20 || featured) {
        eventBus.publish({
          type: "ETA_UPDATED",
          occurredAt: nowIso,
          data: {
            shipmentId: shipment.id,
            trackingNumber: shipment.trackingNumber,
            previousEtaAt: change.communicatedEtaAt,
            predictedEtaAt: change.predictedAt,
            riskLevel: change.riskTo,
          },
        });
        etaEvents += 1;
      }
      const later = Date.parse(change.predictedAt) > Date.parse(change.communicatedEtaAt);
      await notify(
        {
          shipmentId: shipment.id,
          template: "REVISED_ETA",
          // Routine revisions land in the notification center; the triggered
          // shipment's revision is surfaced as a toast.
          severity: featured && later ? "WARNING" : "INFO",
          ...revisedEtaNotice(shipment.trackingNumber, change.communicatedEtaAt, change.predictedAt, later ? change.explanation : undefined),
          dedupeKey: `${shipment.id}:REVISED_ETA:IN_APP:${change.predictedAt.slice(0, 16)}`,
        },
        featured,
      );
    }
  }

  /* 3. Exceptions */
  const evaluation = await alertService.evaluate({ spotlightVehicleIds: spotlightVehicles });
  for (const exception of evaluation.created) {
    const featured = exception.vehicleId ? spotlightVehicles.has(exception.vehicleId) : false;
    const shipment = store.shipments.get(exception.shipmentId);
    const vehicle = exception.vehicleId ? store.vehicles.get(exception.vehicleId) : undefined;
    if (!shipment) continue;
    let copy: { title: string; message: string } | undefined;
    if (exception.type === "ROUTE_DEVIATION" && vehicle) copy = deviationNotice(vehicle.vehicleNumber, shipment.trackingNumber);
    if (exception.type === "NO_MOVEMENT" && vehicle) {
      const trip = store.trips.get(vehicle.id);
      const minutes = trip?.stationarySince ? (store.sim.simNowMs - Date.parse(trip.stationarySince)) / 60_000 : 30;
      copy = noMovementNotice(vehicle.vehicleNumber, minutes);
    }
    if (exception.type === "HUB_DWELL") {
      const hub = exception.hubId ? store.hubs.get(exception.hubId) : undefined;
      const trip = vehicle ? store.trips.get(vehicle.id) : undefined;
      const minutes = trip?.hubArrivedAt ? (store.sim.simNowMs - Date.parse(trip.hubArrivedAt)) / 60_000 : 45;
      copy = hubDwellNotice(shipment.trackingNumber, hub?.name ?? "hub", minutes);
    }
    if (copy && (featured || exception.severity === "HIGH" || exception.severity === "CRITICAL")) {
      await notify(
        {
          shipmentId: shipment.id,
          template: "SHIPMENT_UPDATE",
          severity: "WARNING",
          ...copy,
          dedupeKey: `${shipment.id}:SHIPMENT_UPDATE:IN_APP:${exception.id}`,
        },
        featured,
      );
    }
  }
  if (!context.spotlight) await alertService.simulateOpsActivity(context.tick);

  /* 4. Hubs */
  for (const hubId of recomputeHubStats(store, store.sim.simNowMs)) {
    const hub = store.hubs.get(hubId);
    if (hub) {
      eventBus.publish({
        type: "HUB_DWELL_UPDATED",
        occurredAt: nowIso,
        data: { hubId, averageDwellMinutes: hub.averageDwellMinutes, status: hub.status },
      });
    }
  }

  /* 5. Positions + tick */
  eventBus.publish({ type: "VEHICLE_POSITION_UPDATED", occurredAt: nowIso, data: { positions: await fleetService.positions() } });
  eventBus.publish({ type: "SIMULATION_TICK", occurredAt: nowIso, data: { state: getState() } });
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

function publishState(reason: "CONNECTED" | "CONTROL" | "RESET"): void {
  const state = getState();
  eventBus.publish({ type: "SIMULATION_STATE", occurredAt: state.simulatedNow, data: { state, reason } });
}

async function control(input: SimulationControlInput): Promise<SimulationState> {
  const store = getDemoStore();
  switch (input.action) {
    case "start":
      store.sim.running = true;
      break;
    case "pause":
      store.sim.running = false;
      break;
    case "setSpeed":
      store.sim.speed = input.speed;
      break;
    case "reset":
      resetDemoStore();
      logger.info("SIMULATION_RESET", {});
      ensureLoop();
      publishState("RESET");
      return getState();
  }
  ensureLoop();
  publishState("CONTROL");
  return getState();
}

async function triggerScenario(scenario: DemoScenarioTrigger): Promise<ScenarioTriggerResult> {
  const store = getDemoStore();
  const changes = emptyChanges();
  const outcome = applyScenario(store, scenario, changes);
  if (outcome.applied) {
    store.sim.activeScenarios.add(scenario);
    await processChanges(changes, { tick: store.sim.tick, spotlight: outcome });
    // An escalation of an already-open dwell exception creates no new record,
    // so announce the injected dwell explicitly.
    if (scenario === "HUB_DWELL_INCREASE" && outcome.shipmentId && outcome.vehicleId) {
      const trip = store.trips.get(outcome.vehicleId);
      const hub = trip?.atHubId ? store.hubs.get(trip.atHubId) : undefined;
      const minutes = trip?.hubArrivedAt ? (store.sim.simNowMs - Date.parse(trip.hubArrivedAt)) / 60_000 : 60;
      await notificationService.trigger({
        shipmentId: outcome.shipmentId,
        template: "SHIPMENT_UPDATE",
        severity: "WARNING",
        ...hubDwellNotice(outcome.trackingNumber ?? "", hub?.name ?? "hub", minutes),
      });
    }
    logger.info("SCENARIO_TRIGGERED", { scenario, shipmentId: outcome.shipmentId });
  }
  return {
    scenario,
    applied: outcome.applied,
    message: outcome.message,
    shipmentId: outcome.shipmentId,
    trackingNumber: outcome.trackingNumber,
    vehicleId: outcome.vehicleId,
  };
}

/** Called by the polling transport so the loop keeps running without SSE. */
function markPollingClient(): SimulationState {
  loop().lastPollAt = Date.now();
  ensureLoop();
  return getState();
}

/** Subscribes a realtime client (SSE). Starts the loop if needed. */
function subscribe(listener: (event: RealtimeEvent) => void): () => void {
  const unsubscribe = eventBus.subscribe(listener);
  ensureLoop();
  const state = getState();
  listener({ id: "rt_hello", type: "SIMULATION_STATE", occurredAt: state.simulatedNow, data: { state, reason: "CONNECTED" } });
  return () => {
    unsubscribe();
    ensureLoop();
  };
}

/** `step` advances exactly one tick (tests / manual stepping). */
export const simulationService = { getState, markPollingClient, control, triggerScenario, subscribe, step: tick };
