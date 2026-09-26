import { parseBody, parseParams, withApi } from "@/lib/server/api-handler";
import { exceptionActionSchema, exceptionIdParamSchema } from "@/lib/validation/exceptions";
import { alertService } from "@/services/alert-service";

/** GET /api/v1/exceptions/:exceptionId — exception with audit trail and allowed transitions. */
export const GET = withApi<{ exceptionId: string }>(
  async ({ params }) => {
    const { exceptionId } = parseParams(params, exceptionIdParamSchema);
    return alertService.getDetail(exceptionId);
  },
  { roles: ["OPS_AGENT", "OPS_MANAGER", "ADMIN"] }
);

/**
 * PATCH /api/v1/exceptions/:exceptionId — assign / change status / add note.
 * Body: { status, assignedTo?, note? }. Invalid transitions return 409.
 */
export const PATCH = withApi<{ exceptionId: string }>(
  async ({ params, request }) => {
    const { exceptionId } = parseParams(params, exceptionIdParamSchema);
    const input = await parseBody(request, exceptionActionSchema);
    return alertService.applyAction(exceptionId, input);
  },
  { roles: ["OPS_AGENT", "OPS_MANAGER", "ADMIN"] }
);
