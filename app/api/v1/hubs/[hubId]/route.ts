import { parseParams, withApi } from "@/lib/server/api-handler";
import { hubIdParamSchema } from "@/lib/validation/operations";
import { hubService } from "@/services/hub-service";

/** GET /api/v1/hubs/:hubId — hub detail with waiting shipments and open exceptions. */
export const GET = withApi<{ hubId: string }>(async ({ params }) => {
  const { hubId } = parseParams(params, hubIdParamSchema);
  return hubService.getDetail(hubId);
});
