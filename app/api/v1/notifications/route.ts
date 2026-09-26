import { parseQuery, withApi } from "@/lib/server/api-handler";
import { notificationListQuerySchema } from "@/lib/validation/operations";
import { notificationService } from "@/services/notification-service";

/** GET /api/v1/notifications — notification center feed (newest first). */
export const GET = withApi(async ({ request }) => {
  const query = parseQuery(request, notificationListQuerySchema);
  return query.shipmentId
    ? notificationService.listForShipment(query.shipmentId)
    : notificationService.list(query.limit);
});
