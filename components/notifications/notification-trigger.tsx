"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificationFeed, useNotificationReadState } from "@/hooks/use-notifications";
import { NotificationCenter } from "./notification-center";

/** Topbar bell with unread count; opens the notification center. */
export function NotificationTrigger() {
  const [open, setOpen] = useState(false);
  const feed = useNotificationFeed();
  const { isRead } = useNotificationReadState();
  const unread = (feed.data?.data ?? []).filter((notification) => !isRead(notification)).length;
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon-sm" variant="ghost" className="relative" aria-label={label}>
          <Bell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[9.5px] font-semibold text-white tabular">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(400px,calc(100vw-24px))] p-0">
        <NotificationCenter onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
