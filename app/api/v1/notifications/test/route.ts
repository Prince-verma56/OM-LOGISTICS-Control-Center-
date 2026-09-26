import { parseBody, withApi } from "@/lib/server/api-handler";
import { testNotificationSchema } from "@/lib/validation/operations";
import { notificationService } from "@/services/notification-service";

/**
 * POST /api/v1/notifications/test — DEMO_MODE only.
 * Records an in-app notification through the demo provider (no external send).
 */
export const POST = withApi(
  async ({ request }) => {
    const input = await parseBody(request, testNotificationSchema);
    return { notification: await notificationService.sendTest(input) };
  },
  { demoOnly: true, rateLimit: { bucket: "notification-test", limit: 20, windowMs: 60_000 } },
);
