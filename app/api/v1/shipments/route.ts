import { parseQuery, withApi } from "@/lib/server/api-handler";
import { shipmentListQuerySchema } from "@/lib/validation/shipments";
import { shipmentService } from "@/services/shipment-service";

/**
 * GET /api/v1/shipments
 * Query: page, pageSize, scope, status, riskLevel, hubId, vehicleId,
 *        customerId, routeId, search, from, to, sort, order
 */
export const GET = withApi(async ({ request }) => shipmentService.list(parseQuery(request, shipmentListQuerySchema)));
