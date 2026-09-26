import type { RealtimeEvent, RealtimeEventInput } from "@/types/realtime";

/**
 * In-process application event bus. Domain services publish; the SSE route
 * fans events out to connected browsers. Production can swap this for Redis
 * pub/sub or a managed event stream without changing publishers or the UI
 * (ADR-006).
 */

type Listener = (event: RealtimeEvent) => void;

interface BusState {
  listeners: Set<Listener>;
  sequence: number;
}

const key = Symbol.for("om.controlTower.eventBus");
type GlobalWithBus = typeof globalThis & { [key]?: BusState };

function state(): BusState {
  const scope = globalThis as GlobalWithBus;
  scope[key] ??= { listeners: new Set(), sequence: 0 };
  return scope[key];
}

export const eventBus = {
  publish(input: RealtimeEventInput): RealtimeEvent {
    const bus = state();
    bus.sequence += 1;
    const event = { ...input, id: `rt_${bus.sequence.toString(36)}` } as RealtimeEvent;
    for (const listener of bus.listeners) {
      try {
        listener(event);
      } catch {
        // A failing subscriber must never break publishers.
      }
    }
    return event;
  },
  subscribe(listener: Listener): () => void {
    const bus = state();
    bus.listeners.add(listener);
    return () => bus.listeners.delete(listener);
  },
  subscriberCount(): number {
    return state().listeners.size;
  },
};
