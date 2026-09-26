"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crosshair,
  ExternalLink,
  FileText,
  MoreHorizontal,
  PackageSearch,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { RiskBadge, ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShipments, type ShipmentQueryParams } from "@/hooks/use-shipments";
import { formatDateTime, formatShortDate, formatTime } from "@/lib/formatters/date";
import { formatNumber } from "@/lib/formatters/number";
import { currentEta, formatDelay, shipmentPath, trackingPath } from "@/lib/formatters/shipment";
import { cn } from "@/lib/utils";
import type { Shipment } from "@/types/shipment";

type SortField = NonNullable<ShipmentQueryParams["sort"]>;

// TanStack Table v9: register only the features used (server-side sort + pagination).
const features = tableFeatures({});
const column = createColumnHelper<typeof features, Shipment>();
const EMPTY_ROWS: Shipment[] = [];

const PAGE_SIZES = [10, 25, 50];

async function copyTrackingLink(shipment: Shipment) {
  const url = `${window.location.origin}${trackingPath(shipment.publicTrackingToken)}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Tracking link copied", { description: shipment.trackingNumber });
  } catch {
    toast.info("Tracking link", { description: url });
  }
}

function SortHeader({
  label,
  field,
  query,
  onSort,
  align = "left",
}: {
  label: string;
  field: SortField;
  query: ShipmentQueryParams;
  onSort: (field: SortField, order: "asc" | "desc") => void;
  align?: "left" | "right";
}) {
  const active = query.sort === field;
  const Icon = !active ? ArrowUpDown : query.order === "asc" ? ArrowUp : ArrowDown;
  const nextOrder = active ? (query.order === "asc" ? "desc" : "asc") : field === "eta" || field === "trackingNumber" ? "asc" : "desc";
  return (
    <button
      type="button"
      onClick={() => onSort(field, nextOrder)}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active && "text-foreground",
        align === "right" && "flex-row-reverse",
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <Icon className={cn("size-3", !active && "opacity-50")} aria-hidden />
    </button>
  );
}

export function ShipmentTable({
  query,
  onQueryChange,
  selectedShipmentId,
  onSelect,
  onLocate,
  title = "Shipments",
  className,
}: {
  query: ShipmentQueryParams;
  onQueryChange: (patch: { page?: number; pageSize?: number; sort?: SortField; order?: "asc" | "desc" }) => void;
  selectedShipmentId?: string;
  onSelect?: (shipment: Shipment) => void;
  onLocate?: (shipment: Shipment) => void;
  title?: string;
  className?: string;
}) {
  const result = useShipments(query);
  const rows = result.data?.data;
  const pagination = result.data?.pagination;
  const onSort = (sort: SortField, order: "asc" | "desc") => onQueryChange({ sort, order, page: 1 });

  const columns = column.columns([
      column.display({
        id: "trackingNumber",
        header: () => <SortHeader label="Tracking no." field="trackingNumber" query={query} onSort={onSort} />,
        cell: ({ row }) => (
          <Link
            href={shipmentPath(row.original.id)}
            onClick={(event) => event.stopPropagation()}
            className="font-mono text-[12.5px] font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {row.original.trackingNumber}
          </Link>
        ),
      }),
      column.display({
        id: "customer",
        header: "Customer",
        cell: ({ row }) => <span className="block max-w-44 truncate">{row.original.customerName}</span>,
      }),
      column.display({ id: "origin", header: "Origin", cell: ({ row }) => row.original.origin }),
      column.display({ id: "destination", header: "Destination", cell: ({ row }) => row.original.destination }),
      column.display({ id: "status", header: "Status", cell: ({ row }) => <ShipmentStatusBadge status={row.original.status} /> }),
      column.display({
        id: "vehicle",
        header: "Vehicle",
        cell: ({ row }) =>
          row.original.vehicleNumber ? (
            <span className="font-mono text-[12px]">{row.original.vehicleNumber}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          ),
      }),
      column.display({
        id: "eta",
        header: () => <SortHeader label="ETA" field="eta" query={query} onSort={onSort} />,
        cell: ({ row }) => {
          const shipment = row.original;
          const eta = shipment.status === "DELIVERED" ? shipment.deliveredAt : currentEta(shipment);
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex flex-col leading-tight tabular">
                  <span className="font-medium">{formatTime(eta)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatShortDate(eta)}
                    {shipment.status === "DELIVERED" ? " · delivered" : shipment.delayMinutes > 0 ? " · revised" : ""}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <p>Original ETA: {formatDateTime(shipment.originalEtaAt)}</p>
                <p>Promised: {formatDateTime(shipment.promisedDeliveryAt)}</p>
              </TooltipContent>
            </Tooltip>
          );
        },
      }),
      column.display({
        id: "delay",
        header: () => <SortHeader label="Delay" field="delay" query={query} onSort={onSort} />,
        cell: ({ row }) => (
          <span
            className={cn(
              "whitespace-nowrap tabular",
              row.original.delayMinutes <= 0 && "text-muted-foreground",
              row.original.delayMinutes >= 60 && "font-medium text-status-critical",
            )}
          >
            {formatDelay(row.original.delayMinutes)}
          </span>
        ),
      }),
      column.display({
        id: "risk",
        header: () => <SortHeader label="Risk" field="risk" query={query} onSort={onSort} />,
        cell: ({ row }) => <RiskBadge level={row.original.riskLevel} />,
      }),
      column.display({
        id: "lastUpdated",
        header: () => <SortHeader label="Updated" field="lastUpdated" query={query} onSort={onSort} />,
        cell: ({ row }) => <RelativeTime value={row.original.lastUpdatedAt} className="text-xs text-muted-foreground" />,
      }),
      column.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Actions for ${row.original.trackingNumber}`}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenuItem asChild>
                <Link href={shipmentPath(row.original.id)}>
                  <FileText />
                  Open details
                </Link>
              </DropdownMenuItem>
              {onLocate && row.original.vehicleId && row.original.status !== "DELIVERED" && (
                <DropdownMenuItem onSelect={() => onLocate(row.original)}>
                  <Crosshair />
                  Locate on map
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void copyTrackingLink(row.original)}>
                <Copy />
                Copy tracking link
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={trackingPath(row.original.publicTrackingToken)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Customer view
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ]);

  const table = useTable({
    features,
    columns,
    data: rows ?? EMPTY_ROWS,
    getRowId: (row) => row.id,
  });

  const pageSize = query.pageSize ?? 25;
  const start = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const end = pagination ? Math.min(pagination.total, pagination.page * pagination.pageSize) : 0;

  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border bg-card", className)} aria-label={title}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {pagination && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular">
              {formatNumber(pagination.total)}
            </span>
          )}
        </div>
        {onSelect && <p className="hidden text-[11px] text-muted-foreground md:block">Select a row to locate it on the map</p>}
      </div>

      {result.isPending ? (
        <LoadingState variant="rows" rows={8} className="p-4" label="Loading shipments" />
      ) : result.isError ? (
        <ErrorState error={result.error} onRetry={() => void result.refetch()} title="Shipments unavailable" />
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No shipments found"
          description="No shipments match these filters. Try widening the date range or clearing a filter."
        />
      ) : (
        <div className={cn("transition-opacity", result.isPlaceholderData && "opacity-60")}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead key={header.id} className="h-9 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-4 last:pr-3">
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => {
                const shipment = row.original;
                const selected = shipment.id === selectedShipmentId;
                return (
                  <TableRow
                    key={row.id}
                    data-state={selected ? "selected" : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    onClick={onSelect ? () => onSelect(shipment) : undefined}
                    onKeyDown={
                      onSelect
                        ? (event) => {
                            if (event.key === "Enter") onSelect(shipment);
                          }
                        : undefined
                    }
                    className={cn(
                      "text-[13px] focus-visible:bg-muted/60 focus-visible:outline-none",
                      onSelect && "cursor-pointer",
                      shipment.riskLevel === "CRITICAL" && shipment.status !== "DELIVERED" && "bg-status-critical/[0.04] shadow-[inset_2px_0_0_var(--status-critical)]",
                      shipment.riskLevel === "HIGH" && shipment.status !== "DELIVERED" && "shadow-[inset_2px_0_0_var(--status-serious)]",
                    )}
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 first:pl-4 last:pr-3">
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
          <span className="tabular">
            Showing {formatNumber(start)}–{formatNumber(end)} of {formatNumber(pagination.total)}
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows</span>
            <Select value={String(pageSize)} onValueChange={(value) => onQueryChange({ pageSize: Number(value), page: 1 })}>
              <SelectTrigger size="sm" className="h-7 w-[68px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="tabular">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              size="icon-xs"
              variant="outline"
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onQueryChange({ page: pagination.page - 1 })}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon-xs"
              variant="outline"
              aria-label="Next page"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onQueryChange({ page: pagination.page + 1 })}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
