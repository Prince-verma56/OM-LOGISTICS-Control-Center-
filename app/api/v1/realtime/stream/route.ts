import { withApi } from "@/lib/server/api-handler";
import { simulationService } from "@/services/simulation-service";
import type { RealtimeEvent } from "@/types/realtime";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

/**
 * GET /api/v1/realtime/stream — Server-Sent Events.
 * Emits SIMULATION_STATE, SIMULATION_TICK, VEHICLE_POSITION_UPDATED,
 * SHIPMENT_STATUS_CHANGED, ETA_UPDATED, EXCEPTION_CREATED, EXCEPTION_UPDATED,
 * HUB_DWELL_UPDATED and NOTIFICATION_UPDATED. The browser also falls back to
 * polling if the stream is unavailable (ADR-006).
 */
export const GET = withApi(
  async ({ request }) => {
    const encoder = new TextEncoder();
    let closed = false;
    let cleanup = () => {};

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (chunk: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            cleanup();
          }
        };
        write("retry: 3000\n\n");
        const unsubscribe = simulationService.subscribe((event: RealtimeEvent) => {
          write(`id: ${event.id}\nevent: message\ndata: ${JSON.stringify(event)}\n\n`);
        });
        const heartbeat = setInterval(() => write(": keep-alive\n\n"), HEARTBEAT_MS);
        cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // already closed
          }
        };
        request.signal.addEventListener("abort", () => cleanup(), { once: true });
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  },
  { demoOnly: true },
);
