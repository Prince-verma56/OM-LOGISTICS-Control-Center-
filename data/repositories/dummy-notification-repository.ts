import { DEMO_CONFIG } from "@/config/demo";
import { getDemoStore } from "@/data/store/demo-store";
import type { DemoNotification } from "@/types/notification";
import type { NotificationRepository } from "./types";

/** In-app notification records backed by the in-memory demo store (newest first). */
export class DummyNotificationRepository implements NotificationRepository {
  async list(limit = 50) {
    return getDemoStore().notifications.slice(0, limit);
  }

  async listForShipment(shipmentId: string) {
    return getDemoStore().notifications.filter((notification) => notification.shipmentId === shipmentId);
  }

  async add(notification: DemoNotification, dedupeKey?: string) {
    const store = getDemoStore();
    store.notifications.unshift(notification);
    if (store.notifications.length > DEMO_CONFIG.maxNotifications) {
      store.notifications.length = DEMO_CONFIG.maxNotifications;
    }
    if (dedupeKey) store.notificationKeys.add(dedupeKey);
  }

  async hasKey(dedupeKey: string) {
    return getDemoStore().notificationKeys.has(dedupeKey);
  }

  async nextId() {
    const counters = getDemoStore().counters;
    counters.notification += 1;
    return `ntf_${counters.notification.toString(36).padStart(6, "0")}`;
  }
}
