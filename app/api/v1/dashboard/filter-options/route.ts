import { withApi } from "@/lib/server/api-handler";
import { shipmentService } from "@/services/shipment-service";

/** GET /api/v1/dashboard/filter-options — customers, hubs, vehicles, routes, assignees. */
export const GET = withApi(async () => shipmentService.getFilterOptions());
