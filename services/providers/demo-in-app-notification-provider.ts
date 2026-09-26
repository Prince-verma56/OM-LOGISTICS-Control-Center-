import type { DemoNotification, NotificationMessage, NotificationProvider } from "@/types/notification";

/**
 * Phase 1 notification provider: records an in-app notification and marks it
 * delivered immediately. It never contacts an external service.
 *
 * FUTURE providers (documented only — not implemented, no credentials needed):
 *   - WhatsAppNotificationProvider  (WHATSAPP_API_KEY)
 *   - SmsNotificationProvider       (SMS_API_KEY)
 *   - EmailNotificationProvider     (EMAIL_API_KEY)
 * Each implements `NotificationProvider` and is selected by
 * NOTIFICATION_PROVIDER_MODE in `getNotificationProvider()`.
 */
export class DemoInAppNotificationProvider implements NotificationProvider {
  readonly id = "DEMO" as const;
  readonly channel = "IN_APP" as const;

  constructor(private readonly nextId: () => Promise<string>) {}

  async send(
    message: NotificationMessage,
    context: { createdAt: string; trackingNumber?: string },
  ): Promise<DemoNotification> {
    return {
      id: await this.nextId(),
      shipmentId: message.shipmentId,
      trackingNumber: context.trackingNumber,
      template: message.template,
      channel: this.channel,
      provider: this.id,
      status: "DELIVERED",
      title: message.title,
      message: message.message,
      createdAt: context.createdAt,
      severity: message.severity,
    };
  }
}
