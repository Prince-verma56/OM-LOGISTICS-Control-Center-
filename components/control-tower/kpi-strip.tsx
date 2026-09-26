"use client";

import { ArrowDownRight, ArrowUpRight, Info, Minus, Package, Timer, TriangleAlert, Truck, Siren } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback } from "react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Sparkline } from "@/components/shared/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { formatNumber, formatPercent, formatSigned } from "@/lib/formatters/number";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types/kpi";

type KpiKey = keyof DashboardSummary["deltas"];

interface KpiDefinition {
  key: KpiKey;
  label: string;
  href: string;
  icon: typeof Package;
  /** Which direction of change is good. */
  better: "up" | "down" | "neutral";
  definition: string;
  percent?: boolean;
  footnote?: (summary: DashboardSummary) => string;
  emphasis?: (summary: DashboardSummary) => boolean;
}

const KPIS: KpiDefinition[] = [
  {
    key: "activeShipments",
    label: "Active shipments",
    href: "/shipments",
    icon: Package,
    better: "neutral",
    definition: "Shipments booked and not yet delivered — every status except Delivered.",
    footnote: (summary) => `${formatNumber(summary.breakdown.deliveredLast30Days)} delivered · 30 days`,
  },
  {
    key: "vehiclesInTransit",
    label: "Vehicles in transit",
    href: "/fleet",
    icon: Truck,
    better: "neutral",
    definition: "Vehicles on an active trip carrying shipments (moving, stopped or with stale GPS).",
    footnote: (summary) => `of ${summary.breakdown.totalVehicles} in fleet`,
  },
  {
    key: "atRiskShipments",
    label: "At-risk shipments",
    href: "/shipments?sort=risk",
    icon: TriangleAlert,
    better: "down",
    definition: "Active shipments whose predicted ETA breaches the promised delivery time (risk High or Critical).",
    footnote: (summary) => `${summary.breakdown.criticalShipments} critical`,
    emphasis: (summary) => summary.breakdown.criticalShipments > 0,
  },
  {
    key: "onTimeDeliveryPct",
    label: "On-time delivery",
    href: "/analytics",
    icon: Timer,
    better: "up",
    percent: true,
    definition: "Share of shipments delivered in the last 30 days on or before the promised time.",
    footnote: () => "Rolling 30 days",
  },
  {
    key: "openExceptions",
    label: "Open exceptions",
    href: "/exceptions",
    icon: Siren,
    better: "down",
    definition: "Exceptions in Open or In progress status across the network.",
    footnote: (summary) => `${summary.breakdown.criticalExceptions} critical`,
    emphasis: (summary) => summary.breakdown.criticalExceptions > 0,
  },
];

function Delta({ value, better, percent }: { value: number; better: KpiDefinition["better"]; percent?: boolean }) {
  const rounded = percent ? Math.round(value * 10) / 10 : Math.round(value);
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  const good = better === "neutral" || rounded === 0 ? undefined : (rounded > 0) === (better === "up");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular",
        good === true && "text-success-text",
        good === false && "text-status-critical",
        good === undefined && "text-muted-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {formatSigned(rounded, percent ? 1 : 0)}
      {percent ? " pts" : ""}
    </span>
  );
}

export function KpiStrip() {
  const { data, isPending, isError, error, refetch, history } = useDashboardSummary();
  const formatInteger = useCallback((value: number) => formatNumber(Math.round(value)), []);
  const formatPct = useCallback((value: number) => formatPercent(value), []);

  if (isPending) return <LoadingState variant="cards" rows={5} label="Loading KPIs" />;
  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card">
        <ErrorState error={error} onRetry={() => void refetch()} compact title="KPIs unavailable" />
      </div>
    );
  }

  return (
    <section aria-label="Key performance indicators" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {KPIS.map((kpi, index) => {
        const value = data[kpi.key];
        const emphasized = kpi.emphasis?.(data);
        return (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "group relative flex min-h-[112px] flex-col justify-between gap-1.5 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40",
              kpi.key === "openExceptions" && "col-span-2 md:col-span-1",
            )}
          >
            <Link href={kpi.href} className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`${kpi.label}: open details`} />
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-md bg-muted",
                  emphasized && "bg-status-critical/12",
                )}
              >
                <kpi.icon className={cn("size-3.5 text-muted-foreground", emphasized && "text-status-critical")} aria-hidden />
              </span>
              <span className="truncate text-xs font-medium text-muted-foreground">{kpi.label}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="relative z-10 ml-auto rounded text-muted-foreground/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={`What is ${kpi.label}?`}
                  >
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-60">{kpi.definition}</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-end justify-between gap-2">
              <AnimatedNumber
                value={value}
                format={kpi.percent ? formatPct : formatInteger}
                className="text-[26px] leading-none font-semibold tracking-tight"
              />
              <Sparkline
                values={history.map((entry) => entry[kpi.key])}
                className="hidden shrink-0 sm:block"
                width={64}
                height={24}
                strokeClassName={emphasized ? "stroke-status-critical" : "stroke-primary"}
              />
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Delta value={data.deltas[kpi.key]} better={kpi.better} percent={kpi.percent} />
              <span className="truncate text-[11px] text-muted-foreground">since sim start</span>
            </div>
            {kpi.footnote && <p className="truncate text-[11px] text-muted-foreground">{kpi.footnote(data)}</p>}
          </motion.div>
        );
      })}
    </section>
  );
}
