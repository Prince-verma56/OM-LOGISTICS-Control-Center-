"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { shipmentPath } from "@/lib/formatters/shipment";
import type { DemoNotification } from "@/types/notification";

/** Routine INFO updates stay in the notification center; everything else toasts. */
export function shouldToast(notification: DemoNotification): boolean {
  return notification.severity !== "INFO";
}

/**
 * Renders an in-app notification as a Sonner toast. Professional application
 * notifications — title + context line + a "View" action to the shipment.
 */
export function useToastNotifications() {
  const router = useRouter();

  return useCallback(
    (notification: DemoNotification) => {
      const { shipmentId } = notification;
      const options = {
        id: notification.id,
        description: notification.message,
        duration: notification.severity === "CRITICAL" ? 9_000 : 6_500,
        action: shipmentId
          ? { label: "View", onClick: () => router.push(shipmentPath(shipmentId)) }
          : undefined,
      };
      switch (notification.severity) {
        case "CRITICAL":
          toast.error(notification.title, options);
          break;
        case "WARNING":
          toast.warning(notification.title, options);
          break;
        case "SUCCESS":
          toast.success(notification.title, options);
          break;
        default:
          toast.info(notification.title, options);
      }
    },
    [router],
  );
}
