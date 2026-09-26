import { withApi } from "@/lib/server/api-handler";
import { hubService } from "@/services/hub-service";

/** GET /api/v1/hubs — hub load, dwell and status. */
export const GET = withApi(async () => hubService.list());
