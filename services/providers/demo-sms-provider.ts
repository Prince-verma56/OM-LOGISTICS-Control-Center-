import type { DemoNotification, NotificationMessage, NotificationProvider } from "@/types/notification";

export class DemoSmsNotificationProvider implements NotificationProvider {
  readonly id = "DEMO" as const;
  readonly channel = "SMS" as const;

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
