"use client";

import {
  ChartLine,
  ExternalLink,
  FlaskConical,
  Package,
  Radar,
  TriangleAlert,
  Truck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { DEMO_CONFIG } from "@/config/demo";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { useShipments } from "@/hooks/use-shipments";
import { trackingPath } from "@/lib/formatters/shipment";
import { BrandMark } from "./brand-mark";

const NAV = [
  { href: "/control-tower", label: "Control Tower", icon: Radar },
  { href: "/shipments", label: "Shipments", icon: Package },
  { href: "/fleet", label: "Fleet", icon: Truck },
  { href: "/hubs", label: "Hubs", icon: Warehouse },
  { href: "/exceptions", label: "Exceptions", icon: TriangleAlert, badge: "exceptions" as const },
  { href: "/analytics", label: "Analytics", icon: ChartLine },
];

export function AppSidebar() {
  const pathname = usePathname();
  const summary = useDashboardSummary();
  const headline = useShipments({ search: DEMO_CONFIG.headlineTrackingNumber, scope: "all", pageSize: 1 });
  const headlineToken = headline.data?.data[0]?.publicTrackingToken;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="OM Logistics Control Tower">
              <Link href="/control-tower">
                <BrandMark />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold">OM Logistics</span>
                  <span className="truncate text-[11px] text-sidebar-foreground/65">Intelligent Control Tower</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const count = item.badge === "exceptions" ? summary.data?.openExceptions : undefined;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href} aria-current={active ? "page" : undefined}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {count !== undefined && count > 0 && <SidebarMenuBadge className="tabular">{count}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Customer layer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {headlineToken ? (
                  <SidebarMenuButton asChild tooltip="Customer tracking preview">
                    <a href={trackingPath(headlineToken)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink />
                      <span>Tracking preview</span>
                      <span className="ml-auto font-mono text-[10px] text-sidebar-foreground/60">
                        {DEMO_CONFIG.headlineTrackingNumber}
                      </span>
                    </a>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton disabled tooltip="Customer tracking preview">
                    <ExternalLink />
                    <span>Tracking preview</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-start gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-2.5 text-[11px] leading-snug text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-status-warning" aria-hidden />
          <p>
            Demo environment — seeded data and a live simulation. No TMS, WMS, GPS, traffic or messaging systems are
            connected.
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
