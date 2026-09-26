import { parseQuery, withApi } from "@/lib/server/api-handler";
import { kpiQuerySchema } from "@/lib/validation/operations";
import { kpiService } from "@/services/kpi-service";

/** GET /api/v1/analytics/kpis — Query: from, to, hubId, customerId, routeId. */
export const GET = withApi(async ({ request }) => kpiService.getAnalytics(parseQuery(request, kpiQuerySchema)));
