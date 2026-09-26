"use client";

import { ListFilter, RotateCcw, Search } from "lucide-react";
import { useRef, useState } from "react";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useFilterOptions } from "@/hooks/use-dashboard";
import type { ShipmentQueryParams } from "@/hooks/use-shipments";
import { useSimNow } from "@/hooks/use-sim-clock";
import { useUrlFilters } from "@/hooks/use-url-filters";
import {
  RISK_LABELS,
  RISK_LEVELS,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  type RiskLevel,
  type ShipmentStatus,
} from "@/lib/constants/statuses";
import { cn } from "@/lib/utils";

export const SHIPMENT_FILTER_KEYS = [
  "q",
  "from",
  "to",
  "status",
  "risk",
  "hub",
  "vehicle",
  "customer",
  "route",
  "page",
  "sort",
  "order",
  "scope",
] as const;

export type ShipmentFilterValues = Record<(typeof SHIPMENT_FILTER_KEYS)[number], string | undefined>;

export function useShipmentFilters() {
  return useUrlFilters(SHIPMENT_FILTER_KEYS);
}

const isStatus = (value?: string): value is ShipmentStatus => SHIPMENT_STATUSES.includes(value as ShipmentStatus);
const isRisk = (value?: string): value is RiskLevel => RISK_LEVELS.includes(value as RiskLevel);

/** URL filter values → API query (unknown values are dropped, never sent). */
export function toShipmentQuery(values: ShipmentFilterValues, defaults: Partial<ShipmentQueryParams> = {}): ShipmentQueryParams {
  const sort = ["risk", "eta", "delay", "lastUpdated", "trackingNumber"].includes(values.sort ?? "")
    ? (values.sort as ShipmentQueryParams["sort"])
    : defaults.sort;
  const scope = ["active", "delivered", "all"].includes(values.scope ?? "")
    ? (values.scope as ShipmentQueryParams["scope"])
    : defaults.scope;
  return {
    ...defaults,
    page: Math.max(1, Number(values.page) || 1),
    search: values.q,
    from: values.from,
    to: values.to,
    status: isStatus(values.status) ? values.status : undefined,
    riskLevel: isRisk(values.risk) ? values.risk : undefined,
    hubId: values.hub,
    vehicleId: values.vehicle,
    customerId: values.customer,
    routeId: values.route,
    sort,
    order: values.order === "asc" ? "asc" : values.order === "desc" ? "desc" : defaults.order,
    scope,
  };
}

function SearchField({ initial, onCommit, className }: { initial?: string; onCommit: (value?: string) => void; className?: string }) {
  const [text, setText] = useState(initial ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <InputGroup className={cn("h-8", className)}>
      <InputGroupAddon>
        <Search className="size-3.5" aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        value={text}
        aria-label="Search shipments"
        placeholder="Tracking no., customer, vehicle, city…"
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onCommit(next.trim() || undefined), 300);
        }}
      />
    </InputGroup>
  );
}

function FilterFields({
  values,
  setFilters,
  vertical = false,
}: {
  values: ShipmentFilterValues;
  setFilters: (patch: Partial<ShipmentFilterValues>) => void;
  vertical?: boolean;
}) {
  const options = useFilterOptions();
  const simNow = useSimNow();
  const width = (desktop: string) => (vertical ? "w-full" : desktop);

  return (
    <>
      <DateRangeFilter
        from={values.from}
        to={values.to}
        referenceDate={simNow}
        onChange={(range) => setFilters({ from: range.from, to: range.to })}
        className={width("w-40")}
      />
      <Select value={values.status ?? "all"} onValueChange={(value) => setFilters({ status: value === "all" ? undefined : value })}>
        <SelectTrigger size="sm" className={width("w-36")} aria-label="Status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {SHIPMENT_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {SHIPMENT_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={values.risk ?? "all"} onValueChange={(value) => setFilters({ risk: value === "all" ? undefined : value })}>
        <SelectTrigger size="sm" className={width("w-32")} aria-label="Risk">
          <SelectValue placeholder="Risk" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All risk levels</SelectItem>
          {[...RISK_LEVELS].reverse().map((level) => (
            <SelectItem key={level} value={level}>
              {RISK_LABELS[level]}
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
        className={width("w-36")}
      />
      <FilterCombobox
        label="Vehicle"
        options={options.data?.vehicles ?? []}
        loading={options.isPending}
        value={values.vehicle}
        onChange={(value) => setFilters({ vehicle: value })}
        className={width("w-36")}
      />
      <FilterCombobox
        label="Customer"
        options={options.data?.customers ?? []}
        loading={options.isPending}
        value={values.customer}
        onChange={(value) => setFilters({ customer: value })}
        className={width("w-40")}
      />
      <FilterCombobox
        label="Route"
        options={options.data?.routes ?? []}
        loading={options.isPending}
        value={values.route}
        onChange={(value) => setFilters({ route: value })}
        className={width("w-40")}
      />
    </>
  );
}

/**
 * Filter bar for the shipment views. Filters live in the URL; the date range
 * applies to the booking date.
 */
export function DashboardFilters({ className }: { className?: string }) {
  const { values, setFilters, clearFilters, activeCount } = useShipmentFilters();
  const [resetToken, setResetToken] = useState(0);
  const reset = () => {
    clearFilters();
    setResetToken((token) => token + 1);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="search" aria-label="Shipment filters">
      <SearchField
        key={resetToken}
        initial={values.q}
        onCommit={(value) => setFilters({ q: value })}
        className="w-full sm:w-64"
      />
      <div className="hidden flex-wrap items-center gap-2 xl:flex">
        <FilterFields values={values} setFilters={setFilters} />
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 xl:hidden">
            <ListFilter data-icon="inline-start" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px] sm:max-w-[320px]">
          <SheetHeader>
            <SheetTitle>Filter shipments</SheetTitle>
            <SheetDescription>Filters apply instantly and are kept in the page URL.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2.5 px-4">
            <FilterFields values={values} setFilters={setFilters} vertical />
            <Button variant="ghost" size="sm" onClick={reset} disabled={activeCount === 0}>
              <RotateCcw data-icon="inline-start" />
              Reset filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={reset}>
          <RotateCcw data-icon="inline-start" />
          Reset
          <span className="sr-only"> {activeCount} filters</span>
        </Button>
      )}
    </div>
  );
}
