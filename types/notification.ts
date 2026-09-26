import type {
  NotificationSeverity,
  NotificationStatus,
  NotificationTemplate,
} from "@/lib/constants/statuses";

export type { NotificationSeverity, NotificationStatus, NotificationTemplate };

/**
 * Phase 1 notification channel: in-app only (Sonner toast + notification center).
 *
 * FUTURE — documented only, not implemented and not required:
 *   "WHATSAPP" | "SMS" | "EMAIL" providers will implement `NotificationProvider`
 *   below and be selected via NOTIFICATION_PROVIDER_MODE. See README.md.
 */
export type NotificationChannel = "IN_APP";
export type NotificationProviderId = "DEMO";

export interface DemoNotification {
  id: string;

  shipmentId?: string;

  template: NotificationTemplate;

  channel: "IN_APP";
  provider: "DEMO";

  status: NotificationStatus;

  title: string;
  message: string;

  createdAt: string;

  /* ---- Enrichments for the notification center ---- */
  severity: NotificationSeverity;
  trackingNumber?: string;
}

/** Input accepted by `notificationService.trigger()`. */
export interface NotificationMessage {
  shipmentId?: string;
  template: NotificationTemplate;
  severity: NotificationSeverity;
  title: string;
  message: string;
  /** Deduplication key — the same key is never recorded twice (brain/11 §7). */
  dedupeKey?: string;
}

export interface NotificationResult {
  notification: DemoNotification;
  deduplicated: boolean;
}

/**
 * Provider contract. `DemoInAppNotificationProvider` implements it today.
 * Future WhatsApp / SMS / Email providers implement the same interface; the UI
 * and notificationService callers do not change.
 */
export interface NotificationProvider {
  readonly id: NotificationProviderId;
  readonly channel: NotificationChannel;
  send(message: NotificationMessage, context: { createdAt: string; trackingNumber?: string }): Promise<DemoNotification>;
}
