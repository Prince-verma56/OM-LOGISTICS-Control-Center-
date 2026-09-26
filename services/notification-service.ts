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
import { DemoEmailNotificationProvider } from "./providers/demo-email-provider";
import { DemoInAppNotificationProvider } from "./providers/demo-in-app-notification-provider";
import { DemoSmsNotificationProvider } from "./providers/demo-sms-provider";
import { DemoWhatsAppNotificationProvider } from "./providers/demo-whatsapp-provider";

/**
 * Notification pipeline (Phase 1):
 *
 *   Demo event → notificationService.trigger() → DemoInAppNotificationProvider
 *              → notification record → realtime NOTIFICATION_UPDATED
 *              → Sonner toast + Notification Center (browser)
 *
 * No WhatsApp / SMS / email provider is contacted, and none is required.
 */

let providers: NotificationProvider[] | undefined;

function getNotificationProviders(): NotificationProvider[] {
  if (providers) return providers;
  const mode = getAppConfig().notificationProviderMode;
  if (mode !== "in_app_demo") {
    logger.warn("NOTIFICATION_PROVIDER_FALLBACK", {
      mode,
      message: "External providers are not implemented in Phase 1; using demo providers for all channels.",
    });
  }
  const nextId = () => getRepositories().notifications.nextId();
  providers = [
    new DemoInAppNotificationProvider(nextId),
    new DemoWhatsAppNotificationProvider(nextId),
    new DemoSmsNotificationProvider(nextId),
    new DemoEmailNotificationProvider(nextId),
  ];
  return providers;
}

async function trigger(message: NotificationMessage): Promise<NotificationResult | undefined> {
  const repos = getRepositories();
  // Use IN_APP as the primary dedupe check since it always fires
  const primaryDedupeKey = message.dedupeKey ? `${message.dedupeKey}:IN_APP` : undefined;
  
  if (primaryDedupeKey && (await repos.notifications.hasKey(primaryDedupeKey))) {
    return undefined;
  }

  const shipment = message.shipmentId ? await repos.shipments.getById(message.shipmentId) : undefined;
  const now = repos.clock.now();
  
  let primaryNotification: DemoNotification | undefined;

  for (const provider of getNotificationProviders()) {
    const notification = await provider.send(message, {
      createdAt: now.toISOString(),
      trackingNumber: shipment?.trackingNumber,
    });
    // Append channel to dedupe key so we can store one for each channel
    const channelDedupe = message.dedupeKey ? `${message.dedupeKey}:${provider.channel}` : undefined;
    await repos.notifications.add(notification, channelDedupe);
    eventBus.publish({ type: "NOTIFICATION_UPDATED", occurredAt: notification.createdAt, data: { notification } });
    
    if (provider.channel === "IN_APP") {
      primaryNotification = notification;
    }
  }

  if (primaryNotification) {
    logger.debug("NOTIFICATION_TRIGGERED", { id: primaryNotification.id, template: primaryNotification.template });
    return { notification: primaryNotification, deduplicated: false };
  }
  return undefined;
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
