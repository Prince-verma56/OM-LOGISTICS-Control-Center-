"use client";

import { format, parseISO } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Info, Minus, RotateCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { DemoBadge } from "@/components/shared/demo-badge";
import { ErrorState } from "@/components/shared/error-state";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { LoadingState } from "@/components/shared/loading-state";
import { PageTransition } from "@/components/shared/page-transition";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAnalytics } from "@/hooks/use-analytics";
import { useFilterOptions } from "@/hooks/use-dashboard";
import { useSimNow } from "@/hooks/use-sim-clock";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { formatNumber, formatPercent, formatSigned } from "@/lib/formatters/number";
import { cn } from "@/lib/utils";
import type { KpiKey, KpiSnapshot } from "@/types/kpi";
import { AXIS_STROKE, AXIS_TICK, ChartCard, ChartTooltip, GRID_STROKE, type ChartSeries } from "./chart-card";

const KEYS = ["days", "hub", "customer", "route"] as const;
const RANGES = [7, 14, 30, 60] as const;

const KPI_TILES: Array<{ key: KpiKey; label: string; unit: string; better: "up" | "down"; percent?: boolean; definition: string }> = [
  { key: "etaAccuracy", label: "ETA accuracy", unit: "%", better: "up", percent: true, definition: "Deliveries within ±60 min of the last predicted ETA." },
  { key: "otif", label: "OTIF", unit: "%", better: "up", percent: true, definition: "On time, in full — delivered by the promised time." },
  { key: "avgDelayResponseMinutes", label: "Delay response", unit: " min", better: "down", definition: "Average minutes from exception detection to first operator action." },
  { key: "customerQueries", label: "Customer queries", unit: "/day", better: "down", definition: "Status queries raised to customer support per day." },
  { key: "avgHubDwellMinutes", label: "Hub dwell", unit: " min", better: "down", definition: "Average dwell time per hub visit." },
  { key: "routeExceptions", label: "Route exceptions", unit: "/day", better: "down", definition: "Route deviation and traffic exceptions per day." },
];

const dayLabel = (value: string) => {
  try {
    return format(parseISO(value), "d MMM");
  } catch {
    return value;
  }
};

function KpiTile({ tile, current, previous }: { tile: (typeof KPI_TILES)[number]; current: KpiSnapshot; previous: KpiSnapshot }) {
  const value = current[tile.key];
  const delta = value - previous[tile.key];
  const rounded = tile.percent ? Math.round(delta * 10) / 10 : Math.round(delta);
  const good = rounded === 0 ? undefined : (rounded > 0) === (tile.better === "up");
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-3.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {tile.label}
        <UiTooltip>
          <TooltipTrigger asChild>
            <button type="button" className="rounded text-muted-foreground/70 hover:text-foreground" aria-label={`What is ${tile.label}?`}>
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-60">{tile.definition}</TooltipContent>
        </UiTooltip>
      </span>
      <span className="text-2xl font-semibold tracking-tight">
        {tile.percent ? formatPercent(value) : formatNumber(value)}
        {!tile.percent && <span className="ml-0.5 text-sm font-normal text-muted-foreground">{tile.unit}</span>}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[11px] font-medium whitespace-nowrap tabular",
          good === true && "text-success-text",
          good === false && "text-status-critical",
          good === undefined && "text-muted-foreground",
        )}
      >
        <Icon className="size-3" aria-hidden />
        {formatSigned(rounded, tile.percent ? 1 : 0)}
        {tile.percent ? " pts" : ""}
        <span className="ml-1 font-normal text-muted-foreground">vs previous period</span>
      </span>
    </div>
  );
}

/** KPI analytics (brain/08 §10) — simulated history, clearly labelled. */
export function AnalyticsView() {
  const { values, setFilters, clearFilters, activeCount } = useUrlFilters(KEYS);
  const options = useFilterOptions();
  const simNow = useSimNow();
  const days = RANGES.includes(Number(values.days) as (typeof RANGES)[number]) ? Number(values.days) : 30;
  const to = simNow ? simNow.slice(0, 10) : undefined;
  const from = simNow ? new Date(Date.parse(simNow) - (days - 1) * 86_400_000).toISOString().slice(0, 10) : undefined;
  const analytics = useAnalytics({ from, to, hubId: values.hub, customerId: values.customer, routeId: values.route });
  const data = analytics.data;
  const rows = (data?.trend ?? []) as unknown as Array<Record<string, string | number>>;

  const reliability: ChartSeries[] = [
    { key: "etaAccuracy", label: "ETA accuracy", color: "var(--chart-1)", unit: "%" },
    { key: "otif", label: "OTIF", color: "var(--chart-2)", unit: "%" },
  ];
  const single = (key: KpiKey, label: string, unit: string): ChartSeries[] => [{ key, label, color: "var(--chart-1)", unit }];
  const typeRows = (data?.exceptionsByType ?? [])
    .map((item) => ({ type: item.label, count: item.count }))
    .sort((a, b) => b.count - a.count);

  const lineChart = (series: ChartSeries[], domain?: [number | string, number | string]) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} axisLine={false} domain={domain ?? ["auto", "auto"]} width={44} />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          content={(props) => <ChartTooltip {...props} series={series} formatLabel={dayLabel} />}
        />
        {series.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const barChart = (series: ChartSeries[]) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={(props) => <ChartTooltip {...props} series={series} formatLabel={dayLabel} />}
        />
        <Bar dataKey={series[0].key} fill={series[0].color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        description="Pilot KPIs from the presentation: ETA accuracy, OTIF, delay response, customer queries, hub dwell and route exceptions."
        actions={<DemoBadge />}
      />

      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Analytics filters">
        <Tabs value={String(days)} onValueChange={(value) => setFilters({ days: value === "30" ? undefined : value })}>
          <TabsList>
            {RANGES.map((range) => (
              <TabsTrigger key={range} value={String(range)}>
                {range} days
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <FilterCombobox label="Hub" options={options.data?.hubs ?? []} value={values.hub} onChange={(value) => setFilters({ hub: value })} className="w-40" />
        <FilterCombobox label="Customer" options={options.data?.customers ?? []} value={values.customer} onChange={(value) => setFilters({ customer: value })} className="w-44" />
        <FilterCombobox label="Route" options={options.data?.routes ?? []} value={values.route} onChange={(value) => setFilters({ route: value })} className="w-44" />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={clearFilters}>
            <RotateCcw data-icon="inline-start" />
            Reset
          </Button>
        )}
      </div>

      {analytics.isPending || !simNow ? (
        <>
          <LoadingState variant="cards" rows={6} label="Loading KPIs" />
          <LoadingState variant="panel" className="h-72" />
        </>
      ) : analytics.isError || !data ? (
        <div className="rounded-xl border bg-card">
          <ErrorState error={analytics.error} onRetry={() => void analytics.refetch()} />
        </div>
      ) : (
        <>
          <section aria-label="KPI summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {KPI_TILES.map((tile) => (
              <KpiTile key={tile.key} tile={tile} current={data.current} previous={data.previous} />
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Service reliability"
              description="ETA accuracy and OTIF, % of deliveries per day"
              series={reliability}
              rows={rows.map(({ date, etaAccuracy, otif }) => ({ date, etaAccuracy, otif }))}
              formatRowLabel={dayLabel}
              dimmed={analytics.isPlaceholderData}
            >
              {lineChart(reliability, [70, 100])}
            </ChartCard>
            <ChartCard
              title="Delay response time"
              description="Minutes from exception detection to first action"
              series={single("avgDelayResponseMinutes", "Response time", " min")}
              rows={rows.map(({ date, avgDelayResponseMinutes }) => ({ date, avgDelayResponseMinutes }))}
              formatRowLabel={dayLabel}
              dimmed={analytics.isPlaceholderData}
            >
              {lineChart(single("avgDelayResponseMinutes", "Response time", " min"), [0, "auto"])}
            </ChartCard>
            <ChartCard
              title="Average hub dwell"
              description="Minutes per hub visit"
              series={single("avgHubDwellMinutes", "Hub dwell", " min")}
              rows={rows.map(({ date, avgHubDwellMinutes }) => ({ date, avgHubDwellMinutes }))}
              formatRowLabel={dayLabel}
              dimmed={analytics.isPlaceholderData}
            >
              {lineChart(single("avgHubDwellMinutes", "Hub dwell", " min"), [0, "auto"])}
            </ChartCard>
            <ChartCard
              title="Route exceptions"
              description="Deviation and traffic exceptions per day"
              series={single("routeExceptions", "Route exceptions", "")}
              rows={rows.map(({ date, routeExceptions }) => ({ date, routeExceptions }))}
              formatRowLabel={dayLabel}
              dimmed={analytics.isPlaceholderData}
            >
              {barChart(single("routeExceptions", "Route exceptions", ""))}
            </ChartCard>
            <ChartCard
              title="Customer queries"
              description="Status queries to support per day — falls as proactive alerts go out"
              series={single("customerQueries", "Queries", "")}
              rows={rows.map(({ date, customerQueries }) => ({ date, customerQueries }))}
              formatRowLabel={dayLabel}
              dimmed={analytics.isPlaceholderData}
            >
              {barChart(single("customerQueries", "Queries", ""))}
            </ChartCard>
            <ChartCard
              title="Exceptions by type"
              description={`Detected in the selected period (live exception log)`}
              series={[{ key: "count", label: "Exceptions", color: "var(--chart-1)" }]}
              rows={typeRows}
              rowLabel="Type"
              dimmed={analytics.isPlaceholderData}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeRows} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} axisLine={false} width={112} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    content={(props) => <ChartTooltip {...props} series={[{ key: "count", label: "Exceptions", color: "var(--chart-1)" }]} />}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <p className="text-[11px] text-muted-foreground">
            KPI history is simulated for the prototype; exception counts come from the live demo exception log. Filters scope every tile and chart.
          </p>
        </>
      )}
    </PageTransition>
  );
}
