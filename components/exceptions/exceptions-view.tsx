"use client";

import { ChevronLeft, ChevronRight, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ExceptionStatusBadge, SeverityBadge } from "@/components/shared/domain-badges";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { LoadingState } from "@/components/shared/loading-state";
import { PageTransition } from "@/components/shared/page-transition";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusDot } from "@/components/shared/status-dot";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assigneeName, DEMO_CONFIG } from "@/config/demo";
import { useFilterOptions } from "@/hooks/use-dashboard";
import { useExceptions } from "@/hooks/use-exceptions";
import { useSimNow } from "@/hooks/use-sim-clock";
import { useUrlFilters } from "@/hooks/use-url-filters";
import {
  EXCEPTION_SEVERITIES,
  EXCEPTION_SEVERITY_LABELS,
  EXCEPTION_SEVERITY_TONES,
  EXCEPTION_TYPES,
  EXCEPTION_TYPE_LABELS,
  OPEN_EXCEPTION_STATUSES,
  type ExceptionSeverity,
  type ExceptionType,
} from "@/lib/constants/statuses";
import { formatNumber } from "@/lib/formatters/number";
import { shipmentPath } from "@/lib/formatters/shipment";
import { cn } from "@/lib/utils";
import { ExceptionActionSheet } from "./exception-action-sheet";

const KEYS = ["view", "severity", "type", "owner", "hub", "from", "to", "page"] as const;
const PAGE_SIZE = 20;

/** Exception center (brain/08 §7): severity, type, status, assignee, hub and date filters. */
export function ExceptionsView() {
  const { values, setFilters, clearFilters, activeCount } = useUrlFilters(KEYS);
  const options = useFilterOptions();
  const simNow = useSimNow();
  const [actionExceptionId, setActionExceptionId] = useState<string>();
  const view = values.view === "closed" || values.view === "all" ? values.view : "open";
  const severity = EXCEPTION_SEVERITIES.includes(values.severity as ExceptionSeverity) ? values.severity : undefined;
  const type = EXCEPTION_TYPES.includes(values.type as ExceptionType) ? values.type : undefined;
  const page = Math.max(1, Number(values.page) || 1);

  const exceptions = useExceptions({
    view,
    severity,
    type,
    assignedTo: values.owner,
    hubId: values.hub,
    from: values.from,
    to: values.to,
    page,
    pageSize: PAGE_SIZE,
  });
  const openSummary = useExceptions({ view: "open", page: 1, pageSize: 100 });
  const severityCounts = (openSummary.data?.data ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.severity] = (acc[item.severity] ?? 0) + 1;
    return acc;
  }, {});
  const pagination = exceptions.data?.pagination;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Operations"
        title="Exception center"
        description="Detected by the rule engine from GPS, hub, traffic and ETA signals. Assign, progress and resolve — every action is audited."
        actions={
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {[...EXCEPTION_SEVERITIES].reverse().map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilters({ severity: severity === item ? undefined : item, view: undefined })}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  severity === item && "bg-muted",
                )}
                aria-pressed={severity === item}
              >
                <StatusDot tone={EXCEPTION_SEVERITY_TONES[item]} />
                {EXCEPTION_SEVERITY_LABELS[item]}
                <span className="font-semibold tabular">{severityCounts[item] ?? 0}</span>
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(value) => setFilters({ view: value === "open" ? undefined : value })}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={severity ?? "all"} onValueChange={(value) => setFilters({ severity: value === "all" ? undefined : value })}>
          <SelectTrigger size="sm" className="w-36" aria-label="Severity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {[...EXCEPTION_SEVERITIES].reverse().map((item) => (
              <SelectItem key={item} value={item}>
                {EXCEPTION_SEVERITY_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type ?? "all"} onValueChange={(value) => setFilters({ type: value === "all" ? undefined : value })}>
          <SelectTrigger size="sm" className="w-40" aria-label="Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EXCEPTION_TYPES.map((item) => (
              <SelectItem key={item} value={item}>
                {EXCEPTION_TYPE_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={values.owner ?? "all"} onValueChange={(value) => setFilters({ owner: value === "all" ? undefined : value })}>
          <SelectTrigger size="sm" className="w-44" aria-label="Owner">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any owner</SelectItem>
            {DEMO_CONFIG.assignees.map((assignee) => (
              <SelectItem key={assignee.id} value={assignee.id}>
                {assignee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FilterCombobox
          label="Hub"
          options={options.data?.hubs ?? []}
          loading={options.isPending}
          value={values.hub}
          onChange={(value) => setFilters({ hub: value })}
          className="w-40"
        />
        <DateRangeFilter
          label="Detected date"
          from={values.from}
          to={values.to}
          referenceDate={simNow}
          onChange={(range) => setFilters({ from: range.from, to: range.to })}
          className="w-44"
        />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={clearFilters}>
            <RotateCcw data-icon="inline-start" />
            Reset
          </Button>
        )}
      </div>

      <section className="rounded-xl border bg-card" aria-label="Exceptions">
        {exceptions.isPending ? (
          <LoadingState variant="rows" rows={10} className="p-4" label="Loading exceptions" />
        ) : exceptions.isError ? (
          <ErrorState error={exceptions.error} onRetry={() => void exceptions.refetch()} />
        ) : exceptions.data.data.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No exceptions matching your filters." description="Widen the filters or switch to All." />
        ) : (
          <div className={cn("transition-opacity", exceptions.isPlaceholderData && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Severity", "Exception", "Type", "Shipment", "Location", "Detected", "Owner", "Status", ""].map((heading) => (
                    <TableHead key={heading} className="h-9 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-4">
                      {heading}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.data.data.map((exception) => {
                  const open = OPEN_EXCEPTION_STATUSES.includes(exception.status);
                  return (
                    <TableRow key={exception.id} className="text-[13px]">
                      <TableCell className="pl-4">
                        <SeverityBadge severity={exception.severity} />
                      </TableCell>
                      <TableCell className="max-w-[340px]">
                        <span className="flex flex-col gap-0.5 whitespace-normal">
                          <span className="font-medium">{exception.title}</span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">{exception.description}</span>
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{EXCEPTION_TYPE_LABELS[exception.type]}</TableCell>
                      <TableCell>
                        <Link href={shipmentPath(exception.shipmentId)} className="font-mono font-medium text-primary hover:underline">
                          {exception.trackingNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-44 truncate text-muted-foreground">
                        {exception.hubName ?? exception.currentLocationLabel ?? "—"}
                      </TableCell>
                      <TableCell>
                        <RelativeTime value={exception.detectedAt} className="text-xs" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{assigneeName(exception.assignedTo) ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                      <TableCell>
                        <ExceptionStatusBadge status={exception.status} />
                      </TableCell>
                      <TableCell className="pr-3">
                        <Button size="xs" variant={open ? "default" : "outline"} onClick={() => setActionExceptionId(exception.id)}>
                          {open ? "Act" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
            <span className="tabular">{formatNumber(pagination.total)} exceptions</span>
            <div className="flex items-center gap-2">
              <span className="tabular">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button size="icon-xs" variant="outline" aria-label="Previous page" disabled={page <= 1} onClick={() => setFilters({ page: String(page - 1) })}>
                <ChevronLeft />
              </Button>
              <Button
                size="icon-xs"
                variant="outline"
                aria-label="Next page"
                disabled={page >= pagination.totalPages}
                onClick={() => setFilters({ page: String(page + 1) })}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </section>

      <ExceptionActionSheet
        exceptionId={actionExceptionId}
        open={Boolean(actionExceptionId)}
        onOpenChange={(open) => !open && setActionExceptionId(undefined)}
      />
    </PageTransition>
  );
}
