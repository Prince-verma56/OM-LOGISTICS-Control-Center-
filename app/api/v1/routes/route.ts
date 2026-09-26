import { withApi } from "@/lib/server/api-handler";
import { shipmentService } from "@/services/shipment-service";

/** GET /api/v1/routes — planned lane network (geometry + hub stops) for the map. */
export const GET = withApi(async () => {
  const response = Response.json({ data: await shipmentService.listRoutes() });
  // Planned network changes rarely; allow short private caching.
  response.headers.set("Cache-Control", "private, max-age=300");
  return response;
});
