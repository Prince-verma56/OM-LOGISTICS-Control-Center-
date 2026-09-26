import { parseQuery, withApi } from "@/lib/server/api-handler";
import { exceptionListQuerySchema } from "@/lib/validation/exceptions";
import { alertService } from "@/services/alert-service";

/**
 * GET /api/v1/exceptions
 * Query: view (open|closed|all), status, severity, type, hubId, assignedTo,
 *        shipmentId, from, to, page, pageSize
 */
export const GET = withApi(
  async ({ request }) => alertService.list(parseQuery(request, exceptionListQuerySchema)),
  { roles: ["OPS_AGENT", "OPS_MANAGER", "ADMIN"] }
);
