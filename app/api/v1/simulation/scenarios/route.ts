import { parseBody, withApi } from "@/lib/server/api-handler";
import { scenarioTriggerSchema } from "@/lib/validation/operations";
import { simulationService } from "@/services/simulation-service";

/**
 * POST /api/v1/simulation/scenarios — trigger a demo event (DEMO_MODE only).
 * Body: { scenario: "TRAFFIC_INCREASE" | "CREATE_ROUTE_DEVIATION" |
 *         "HUB_DWELL_INCREASE" | "NO_MOVEMENT" | "COMPLETE_DELIVERY" }
 */
export const POST = withApi(
  async ({ request }) => {
    const { scenario } = await parseBody(request, scenarioTriggerSchema);
    return simulationService.triggerScenario(scenario);
  },
  { demoOnly: true, rateLimit: { bucket: "simulation-scenarios", limit: 30, windowMs: 60_000 } },
);
