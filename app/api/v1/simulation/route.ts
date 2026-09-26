import { parseBody, withApi } from "@/lib/server/api-handler";
import { simulationControlSchema } from "@/lib/validation/operations";
import { simulationService } from "@/services/simulation-service";

/**
 * GET /api/v1/simulation — current simulation state (DEMO_MODE only).
 * `?poll=1` marks a polling client so the loop runs without an SSE stream.
 */
export const GET = withApi(
  async ({ request }) =>
    request.nextUrl.searchParams.get("poll") === "1" ? simulationService.markPollingClient() : simulationService.getState(),
  { demoOnly: true },
);

/**
 * POST /api/v1/simulation — controls: { action: "start" | "pause" | "reset" }
 * or { action: "setSpeed", speed: 1 | 5 | 20 }. DEMO_MODE only.
 */
export const POST = withApi(
  async ({ request }) => simulationService.control(await parseBody(request, simulationControlSchema)),
  { demoOnly: true, rateLimit: { bucket: "simulation-control", limit: 60, windowMs: 60_000 } },
);
