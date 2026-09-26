import { parseParams, withApi } from "@/lib/server/api-handler";
import { trackingTokenSchema } from "@/lib/validation/common";
import { shipmentService } from "@/services/shipment-service";
import { z } from "zod";

const paramsSchema = z.object({ trackingToken: trackingTokenSchema });

/**
 * GET /api/v1/public/tracking/:trackingToken — customer-facing, data-minimised.
 * Never returns customer IDs, contact data, driver data, internal notes,
 * risk metadata or precise GPS (brain/07 §11, brain/21).
 */
export const GET = withApi<{ trackingToken: string }>(
  async ({ params }) => {
    const { trackingToken } = parseParams(params, paramsSchema);
    return shipmentService.getPublicTracking(trackingToken);
  },
  { rateLimit: { bucket: "public-tracking", limit: 60, windowMs: 60_000 } },
);
