import { withApi } from "@/lib/server/api-handler";
import { kpiService } from "@/services/kpi-service";

/** GET /api/v1/dashboard/summary — live KPI strip values. */
export const GET = withApi(async () => kpiService.getDashboardSummary());
