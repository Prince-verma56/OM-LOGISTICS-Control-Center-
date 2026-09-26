"use client";

import { usePathname } from "next/navigation";
import { LiveStatusIndicator } from "@/components/control-tower/live-status-indicator";
import { SimulationControls } from "@/components/control-tower/simulation-controls";
import { NotificationTrigger } from "@/components/notifications/notification-trigger";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { OperatorMenu } from "./operator-menu";
import { ThemeToggle } from "./theme-toggle";

const TITLES: Array<[prefix: string, title: string]> = [
  ["/control-tower", "Control Tower"],
  ["/shipments/", "Shipment detail"],
  ["/shipments", "Shipments"],
  ["/fleet", "Fleet"],
  ["/hubs", "Hubs"],
  ["/exceptions", "Exception center"],
  ["/analytics", "Analytics"],
];

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Control Tower";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
      <span className="hidden text-sm font-semibold whitespace-nowrap 2xl:inline">{title}</span>
      <LiveStatusIndicator className="min-w-0 2xl:ml-3" />
      <div className="ml-auto flex items-center gap-1.5">
        <SimulationControls />
        <NotificationTrigger />
        <ThemeToggle />
        <OperatorMenu />
      </div>
    </header>
  );
}
