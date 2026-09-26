import { getRepositories } from "@/data/repositories";
import { getAppConfig } from "@/lib/config/app";
import { NOTIFICATION_TEMPLATE_LABELS } from "@/lib/constants/statuses";
import { eventBus } from "@/lib/realtime/event-bus";
import { logger } from "@/lib/server/logger";
import type { CollectionResponse } from "@/types/api";
import type {
  DemoNotification,
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
  NotificationSeverity,
  NotificationTemplate,
} from "@/types/notification";
import { DemoInAppNotificationProvider } from "./providers/demo-in-app-notification-provider";

/**
 * Notification pipeline (Phase 1):
 *
 *   Demo event → notificationService.trigger() → DemoInAppNotificationProvider
 *              → notification record → realtime NOTIFICATION_UPDATED
 *              → Sonner toast + Notification Center (browser)
 *
 * No WhatsApp / SMS / email provider is contacted, and none is required.
 */

let provider: NotificationProvider | undefined;

function getNotificationProvider(): NotificationProvider {
  if (provider) return provider;
  const mode = getAppConfig().notificationProviderMode;
  if (mode !== "in_app_demo") {
    logger.warn("NOTIFICATION_PROVIDER_FALLBACK", {
      mode,
      message: "Only the in-app demo provider exists in Phase 1; external providers are documented only.",
    });
  }
  provider = new DemoInAppNotificationProvider(() => getRepositories().notifications.nextId());
  return provider;
}

async function trigger(message: NotificationMessage): Promise<NotificationResult | undefined> {
  const repos = getRepositories();
  if (message.dedupeKey && (await repos.notifications.hasKey(message.dedupeKey))) return undefined;

  const shipment = message.shipmentId ? await repos.shipments.getById(message.shipmentId) : undefined;
  const now = repos.clock.now();
  const notification = await getNotificationProvider().send(message, {
    createdAt: now.toISOString(),
    trackingNumber: shipment?.trackingNumber,
  });
  await repos.notifications.add(notification, message.dedupeKey);

  eventBus.publish({ type: "NOTIFICATION_UPDATED", occurredAt: notification.createdAt, data: { notification } });
  logger.debug("NOTIFICATION_TRIGGERED", { id: notification.id, template: notification.template });
  return { notification, deduplicated: false };
}

async function list(limit = 50): Promise<CollectionResponse<DemoNotification>> {
  return { data: await getRepositories().notifications.list(limit) };
}

async function listForShipment(shipmentId: string): Promise<CollectionResponse<DemoNotification>> {
  return { data: await getRepositories().notifications.listForShipment(shipmentId) };
}

/** POST /api/v1/notifications/test — DEMO_MODE only. */
async function sendTest(input: {
  shipmentId?: string;
  template: NotificationTemplate;
  severity: NotificationSeverity;
  title?: string;
  message?: string;
}): Promise<DemoNotification> {
  const repos = getRepositories();
  const shipment = input.shipmentId ? await repos.shipments.getById(input.shipmentId) : undefined;
  const subject = shipment ? `Shipment ${shipment.trackingNumber}` : "Control tower";
  const result = await trigger({
    shipmentId: shipment?.id,
    template: input.template,
    severity: input.severity,
    title: input.title ?? `Test · ${NOTIFICATION_TEMPLATE_LABELS[input.template]}`,
    message:
      input.message ??
      `${subject}: test ${NOTIFICATION_TEMPLATE_LABELS[input.template].toLowerCase()} notification from the demo provider.`,
  });
  if (!result) throw new Error("Test notification was deduplicated unexpectedly.");
  return result.notification;
}

export const notificationService = { trigger, list, listForShipment, sendTest };
