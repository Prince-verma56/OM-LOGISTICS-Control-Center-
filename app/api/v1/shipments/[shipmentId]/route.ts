import { parseParams, withApi } from "@/lib/server/api-handler";
import { shipmentIdParamSchema } from "@/lib/validation/shipments";
import { shipmentService } from "@/services/shipment-service";

/** GET /api/v1/shipments/:shipmentId — shipment, timeline, vehicle, route, eta, exceptions, notifications. */
export const GET = withApi<{ shipmentId: string }>(async ({ params }) => {
  const { shipmentId } = parseParams(params, shipmentIdParamSchema);
  return shipmentService.getDetail(shipmentId);
});
