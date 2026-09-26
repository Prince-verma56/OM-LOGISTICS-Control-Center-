"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DEMO_CONFIG } from "@/config/demo";
import { ApiError, apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { CollectionResponse } from "@/types/api";
import type { Vehicle, VehiclePositionUpdate } from "@/types/fleet";
import type { DemoNotification } from "@/types/notification";
import type {
  DemoScenarioTrigger,
  RealtimeEvent,
  ScenarioTriggerResult,
  SimulationSpeed,
  SimulationState,
} from "@/types/realtime";
import { clearNotificationReadState } from "./use-notifications";
import { usePublicConfig } from "./use-public-config";
import { shouldToast, useToastNotifications } from "./use-toast-notifications";

/**
 * Live simulation client.
 *
 * Subscribes to the application event stream (SSE, falling back to polling —
 * ADR-006), keeps TanStack Query caches fresh, patches vehicle positions for
 * smooth map movement, and turns notification events into Sonner toasts.
 * It never mutates demo data itself: controls call the simulation API.
 */

export type ConnectionState = "connecting" | "live" | "reconnecting" | "polling" | "offline";

export interface LiveSimulationValue {
  state?: SimulationState;
  connection: ConnectionState;
  /** Wall-clock ms of the last realtime message. */
  lastEventAt?: number;
  pendingAction?: string;
  start(): Promise<void>;
  pause(): Promise<void>;
  reset(): Promise<void>;
  setSpeed(speed: SimulationSpeed): Promise<void>;
  trigger(scenario: DemoScenarioTrigger): Promise<ScenarioTriggerResult | undefined>;
}

export const LiveSimulationContext = createContext<LiveSimulationValue | null>(null);

export function useLiveSimulation(): LiveSimulationValue {
  const value = useContext(LiveSimulationContext);
  if (!value) throw new Error("useLiveSimulation must be used inside <LiveSimulationProvider>.");
  return value;
}

/** Optional variant for components that also render outside the console. */
export function useOptionalLiveSimulation(): LiveSimulationValue | null {
  return useContext(LiveSimulationContext);
}

const LIVE_QUERY_PREFIXES = [
  queryKeys.dashboard.all,
  queryKeys.shipments.all,
  queryKeys.exceptions.all,
  queryKeys.hubs.all,
  ["fleet", "list"],
] as const;

function refreshLiveQueries(queryClient: QueryClient) {
  for (const queryKey of LIVE_QUERY_PREFIXES) void queryClient.invalidateQueries({ queryKey: [...queryKey] });
}

function patchPositions(queryClient: QueryClient, positions: VehiclePositionUpdate[]) {
  const byId = new Map(positions.map((position) => [position.id, position]));
  queryClient.setQueryData<CollectionResponse<Vehicle>>(queryKeys.fleet.live(), (current) => {
    if (!current) return current;
    return {
      ...current,
      data: current.data.map((vehicle) => {
        const update = byId.get(vehicle.id);
        if (!update) return vehicle;
        return {
          ...vehicle,
          status: update.status,
          riskLevel: update.riskLevel,
          progressPct: update.progressPct,
          lastGpsAt: update.recordedAt,
          currentLocation: {
            lat: update.lat,
            lng: update.lng,
            headingDeg: update.headingDeg,
            speedKph: update.speedKph,
            recordedAt: update.recordedAt,
          },
        };
      }),
    };
  });
}

function prependNotification(queryClient: QueryClient, notification: DemoNotification) {
  queryClient.setQueryData<CollectionResponse<DemoNotification>>(queryKeys.notifications.list(), (current) => {
    if (!current) return current;
    if (current.data.some((item) => item.id === notification.id)) return current;
    return { ...current, data: [notification, ...current.data].slice(0, 100) };
  });
}

export function useLiveSimulationController(): LiveSimulationValue {
  const queryClient = useQueryClient();
  const showToast = useToastNotifications();
  const { realtimeTransport, simulationEnabled } = usePublicConfig();
  const [state, setState] = useState<SimulationState>();
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [lastEventAt, setLastEventAt] = useState<number>();
  const [pendingAction, setPendingAction] = useState<string>();
  const toastsThisBatch = useRef(0);

  useEffect(() => {
    let closed = false;
    let source: EventSource | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let errors = 0;

    const handle = (event: RealtimeEvent) => {
      setLastEventAt(Date.now());
      switch (event.type) {
        case "SIMULATION_STATE":
          setState(event.data.state);
          if (event.data.reason === "RESET") {
            toastsThisBatch.current = 0;
            clearNotificationReadState();
            queryClient.setQueryData(["dashboard", "history"], []);
            void queryClient.invalidateQueries();
          }
          break;
        case "SIMULATION_TICK":
          setState(event.data.state);
          toastsThisBatch.current = 0;
          refreshLiveQueries(queryClient);
          break;
        case "VEHICLE_POSITION_UPDATED":
          patchPositions(queryClient, event.data.positions);
          break;
        case "NOTIFICATION_UPDATED": {
          const notification = event.data.notification;
          prependNotification(queryClient, notification);
          if (shouldToast(notification) && toastsThisBatch.current < DEMO_CONFIG.maxToastsPerBatch) {
            toastsThisBatch.current += 1;
            showToast(notification);
          }
          break;
        }
        default:
          break;
      }
    };

    const poll = async () => {
      try {
        const next = await apiClient.get<SimulationState>("/api/v1/simulation", { poll: 1 });
        if (closed) return;
        setState(next);
        setLastEventAt(Date.now());
        refreshLiveQueries(queryClient);
        void queryClient.invalidateQueries({ queryKey: queryKeys.fleet.live() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      } catch {
        if (!closed) setConnection("offline");
      }
    };

    const startPolling = () => {
      setConnection("polling");
      void poll();
      pollTimer = setInterval(() => void poll(), 5_000);
    };

    // Initial state, independent of the stream.
    apiClient
      .get<SimulationState>("/api/v1/simulation")
      .then((initial) => {
        if (!closed) setState((current) => current ?? initial);
      })
      .catch(() => undefined);

    if (realtimeTransport === "sse" && typeof EventSource !== "undefined") {
      source = new EventSource("/api/v1/realtime/stream");
      source.onopen = () => {
        errors = 0;
        setConnection("live");
      };
      source.onmessage = (message) => {
        try {
          handle(JSON.parse(message.data) as RealtimeEvent);
        } catch {
          // Ignore malformed frames.
        }
      };
      source.onerror = () => {
        errors += 1;
        if (errors >= 4 && source) {
          source.close();
          source = undefined;
          startPolling();
          return;
        }
        setConnection("reconnecting");
      };
    } else {
      startPolling();
    }

    return () => {
      closed = true;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [queryClient, realtimeTransport, showToast]);

  const control = useCallback(
    async (label: string, body: Record<string, unknown>) => {
      setPendingAction(label);
      try {
        const next = await apiClient.post<SimulationState>("/api/v1/simulation", body);
        setState(next);
        if (body.action === "reset") {
          toast.success("Demo data reset", { description: "Seed restored — the simulation clock restarted at the current time." });
          await queryClient.invalidateQueries();
        }
      } catch (error) {
        toast.error("Simulation control failed", {
          description: error instanceof ApiError ? error.message : "Please retry.",
        });
      } finally {
        setPendingAction(undefined);
      }
    },
    [queryClient],
  );

  const trigger = useCallback(
    async (scenario: DemoScenarioTrigger) => {
      setPendingAction(scenario);
      try {
        const result = await apiClient.post<ScenarioTriggerResult>("/api/v1/simulation/scenarios", { scenario });
        if (!result.applied) toast.info("Scenario not applied", { description: result.message });
        refreshLiveQueries(queryClient);
        return result;
      } catch (error) {
        toast.error("Scenario failed", { description: error instanceof ApiError ? error.message : "Please retry." });
        return undefined;
      } finally {
        setPendingAction(undefined);
      }
    },
    [queryClient],
  );

  return useMemo<LiveSimulationValue>(
    () => ({
      state: state && { ...state, enabled: state.enabled && simulationEnabled },
      connection,
      lastEventAt,
      pendingAction,
      start: () => control("start", { action: "start" }),
      pause: () => control("pause", { action: "pause" }),
      reset: () => control("reset", { action: "reset" }),
      setSpeed: (speed) => control("speed", { action: "setSpeed", speed }),
      trigger,
    }),
    [state, simulationEnabled, connection, lastEventAt, pendingAction, control, trigger],
  );
}
