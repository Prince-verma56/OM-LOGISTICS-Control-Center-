"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  unit?: string;
}

/**
 * Chart frame with a table-view twin (the accessible equivalent of every chart).
 * Refetches keep the previous render at reduced opacity — no skeleton flash.
 */
export function ChartCard({
  title,
  description,
  series,
  rows,
  rowLabel = "Date",
  formatRowLabel = (value: string) => value,
  children,
  dimmed = false,
  className,
}: {
  title: string;
  description?: string;
  series: ChartSeries[];
  rows: Array<Record<string, string | number>>;
  rowLabel?: string;
  formatRowLabel?: (value: string) => string;
  children: ReactNode;
  dimmed?: boolean;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const labelKey = Object.keys(rows[0] ?? {}).find((key) => !series.some((item) => item.key === key)) ?? "label";

  return (
    <section className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4", className)} aria-label={title}>
      <header className="flex items-start gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Tabs value={view} onValueChange={(value) => setView(value as "chart" | "table")} className="ml-auto">
          <TabsList className="h-7">
            <TabsTrigger value="chart" className="px-2 text-xs">Chart</TabsTrigger>
            <TabsTrigger value="table" className="px-2 text-xs">Table</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {series.length > 1 && view === "chart" && (
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Legend">
          {series.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div className={cn("transition-opacity", dimmed && "opacity-60")}>
        {view === "chart" ? (
          <div className="h-[230px] w-full">{children}</div>
        ) : (
          <div className="max-h-[230px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase">{rowLabel}</TableHead>
                  {series.map((item) => (
                    <TableHead key={item.key} className="text-right text-[11px] uppercase">
                      {item.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={String(row[labelKey])} className="text-xs">
                    <TableCell>{formatRowLabel(String(row[labelKey]))}</TableCell>
                    {series.map((item) => (
                      <TableCell key={item.key} className="text-right tabular">
                        {row[item.key]}
                        {item.unit ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}

/** Tooltip: values lead (strong), labels follow; series keyed with a short line. */
export function ChartTooltip({
  active,
  payload,
  label,
  series,
  formatLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown; name?: unknown; color?: string }>;
  label?: unknown;
  series: ChartSeries[];
  formatLabel?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="flex min-w-36 flex-col gap-1 rounded-lg border bg-popover px-2.5 py-2 text-xs shadow-md">
      <span className="text-[11px] text-muted-foreground">{formatLabel ? formatLabel(String(label)) : String(label)}</span>
      {payload.map((entry) => {
        const meta = series.find((item) => item.key === entry.dataKey);
        return (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: meta?.color ?? String(entry.color) }} aria-hidden />
            <span className="font-semibold tabular">
              {String(entry.value)}
              {meta?.unit ?? ""}
            </span>
            <span className="text-muted-foreground">{meta?.label ?? String(entry.name)}</span>
          </div>
        );
      })}
    </div>
  );
}

export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;
export const GRID_STROKE = "var(--chart-grid)";
export const AXIS_STROKE = "var(--chart-axis)";
