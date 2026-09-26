import { parseQuery, withApi } from "@/lib/server/api-handler";
import { fleetListQuerySchema } from "@/lib/validation/operations";
import { fleetService } from "@/services/fleet-service";

/** GET /api/v1/fleet — vehicles with location, movement, shipment count, status, freshness. */
export const GET = withApi(async ({ request }) => fleetService.list(parseQuery(request, fleetListQuerySchema)));
