"use client";

import { BellOff, CircleCheck, Clock3, Link2, MapPinned, OctagonAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { TONE_ICON, ToneBadge } from "@/components/shared/status-dot";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotificationFeed, useNotificationReadState } from "@/hooks/use-notifications";
import {
  NOTIFICATION_SEVERITY_TONES,
  NOTIFICATION_TEMPLATE_LABELS,
  type NotificationTemplate,
} from "@/lib/constants/statuses";
import { shipmentPath } from "@/lib/formatters/shipment";
import { cn } from "@/lib/utils";
import type { DemoNotification } from "@/types/notification";

const TEMPLATE_ICONS: Record<NotificationTemplate, typeof MapPinned> = {
  SHIPMENT_UPDATE: MapPinned,
  DELAY_NOTICE: TriangleAlert,
  REVISED_ETA: Clock3,
  TRACKING_LINK: Link2,
};

type Filter = "all" | "alerts" | "updates";

const isAlert = (notification: DemoNotification) =>
  notification.severity === "WARNING" || notification.severity === "CRITICAL";

function iconFor(notification: DemoNotification) {
  if (notification.severity === "CRITICAL") return OctagonAlert;
  if (notification.severity === "SUCCESS") return CircleCheck;
  return TEMPLATE_ICONS[notification.template];
}

/**
 * In-app notification center: icon, title, message, severity, timestamp,
 * related shipment and read/unread state. Channel = IN_APP, provider = DEMO.
 */
export function NotificationCenter({ onNavigate }: { onNavigate?: () => void }) {
  const feed = useNotificationFeed();
  const { isRead, markRead, markAllRead } = useNotificationReadState();
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(() => {
    const data = feed.data?.data ?? [];
    if (filter === "alerts") return data.filter(isAlert);
    if (filter === "updates") return data.filter((notification) => !isAlert(notification));
    return data;
  }, [feed.data, filter]);
  const unread = (feed.data?.data ?? []).filter((notification) => !isRead(notification)).length;

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div>
          <p className="text-sm font-semibold">Notifications</p>
          <p className="text-[11px] text-muted-foreground">In-app · Demo provider · {unread} unread</p>
        </div>
        <Button
          size="xs"
          variant="ghost"
          disabled={unread === 0}
          onClick={() => markAllRead(feed.data?.data[0]?.createdAt)}
        >
          Mark all read
        </Button>
      </div>
      <div className="px-3 pb-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ScrollArea className="h-[420px] border-t">
        {feed.isPending ? (
          <LoadingState variant="list" rows={6} className="p-3" label="Loading notifications" />
        ) : feed.isError ? (
          <ErrorState error={feed.error} onRetry={() => void feed.refetch()} compact />
        ) : items.length === 0 ? (
          <EmptyState icon={BellOff} title="No notifications" description="Simulated events will appear here as they happen." compact />
        ) : (
          <ul className="divide-y">
            {items.map((notification) => {
              const read = isRead(notification);
              const tone = NOTIFICATION_SEVERITY_TONES[notification.severity];
              const Icon = iconFor(notification);
              const content = (
                <div className="flex gap-3 px-3 py-2.5">
                  <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted")}>
                    <Icon className={cn("size-3.5", TONE_ICON[tone])} aria-hidden />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <p className={cn("line-clamp-2 flex-1 text-[13px] leading-snug", !read && "font-semibold")}>
                        {notification.title}
                      </p>
                      {!read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ToneBadge tone={tone} label={notification.severity.toLowerCase()} className="h-4 px-1.5 text-[10px] capitalize" />
                      <span>{NOTIFICATION_TEMPLATE_LABELS[notification.template]}</span>
                      {notification.trackingNumber && (
                        <span className="font-mono text-[11px] text-foreground/80">{notification.trackingNumber}</span>
                      )}
                      <span aria-hidden>·</span>
                      <RelativeTime value={notification.createdAt} />
                    </div>
                  </div>
                </div>
              );
              return (
                <li key={notification.id} className={cn(!read && "bg-primary/[0.035]")}>
                  {notification.shipmentId ? (
                    <Link
                      href={shipmentPath(notification.shipmentId)}
                      className="block transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                      onClick={() => {
                        markRead(notification.id);
                        onNavigate?.();
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full text-left transition-colors hover:bg-muted/60"
                      onClick={() => markRead(notification.id)}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      <p className="border-t px-3 py-2 text-[10.5px] text-muted-foreground">
        Future channels — WhatsApp · SMS · Email — are documented interfaces only; nothing is sent externally.
      </p>
    </div>
  );
}
