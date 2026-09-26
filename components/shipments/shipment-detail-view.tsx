"use client";

import {
  ArrowLeft,
  BellOff,
  Copy,
  Crosshair,
  ExternalLink,
  FlaskConical,
  PackageSearch,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ExceptionActionSheet } from "@/components/exceptions/exception-action-sheet";
import { ExceptionStatusBadge, SeverityBadge } from "@/components/shared/domain-badges";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageTransition } from "@/components/shared/page-transition";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusDot, ToneBadge } from "@/components/shared/status-dot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEMO_SCENARIO_LABELS } from "@/config/demo";
import { useShipmentDetail } from "@/hooks/use-shipments";
import { ApiError } from "@/lib/api/client";
import {
  NOTIFICATION_SEVERITY_TONES,
  NOTIFICATION_TEMPLATE_LABELS,
  OPEN_EXCEPTION_STATUSES,
  type HubVisitStatus,
} from "@/lib/constants/statuses";
import { formatDateTime } from "@/lib/formatters/date";
import { formatDelay } from "@/lib/formatters/shipment";
import { cn } from "@/lib/utils";
import { ShipmentEtaCard } from "./shipment-eta-card";
import { ShipmentRouteCard } from "./shipment-route-card";
import { RiskBadge, ShipmentStatusBadge } from "./shipment-status-badge";
import { ShipmentSummary } from "./shipment-summary";
import { ShipmentTimeline } from "./shipment-timeline";

const VISIT_TONE: Record<HubVisitStatus, "good" | "info" | "warning" | "neutral"> = {
  DEPARTED: "good",
  PROCESSING: "info",
  ARRIVED: "info",
  WAITING: "warning",
  UPCOMING: "neutral",
};

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.info(label, { description: text });
  }
}

export function ShipmentDetailView({ shipmentId }: { shipmentId: string }) {
  const detail = useShipmentDetail(shipmentId);
  const [actionExceptionId, setActionExceptionId] = useState<string>();

  if (detail.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <LoadingState variant="list" rows={2} label="Loading shipment" />
        <div className="grid gap-4 xl:grid-cols-3">
          <LoadingState variant="panel" className="h-72 xl:col-span-2" />
          <LoadingState variant="panel" className="h-72" />
        </div>
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return notFound ? (
      <EmptyState
        icon={PackageSearch}
        title="Shipment not found"
        description="This shipment ID does not exist in the demo dataset (a demo reset may have changed it)."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/shipments">Back to shipments</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
    );
  }

  const { shipment, timeline, vehicle, route, eta, exceptions, notifications, hubHistory, recentEvents, trackingUrl } = detail.data;
  const openExceptions = exceptions.filter((exception) => OPEN_EXCEPTION_STATUSES.includes(exception.status));

  return (
    <PageTransition className={cn(detail.isPlaceholderData && "opacity-70")}>
      <div className="flex flex-col gap-3">
        <Link href="/shipments" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden />
          Shipments
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-semibold tracking-tight">{shipment.trackingNumber}</h1>
              <ShipmentStatusBadge status={shipment.status} />
              <RiskBadge level={shipment.riskLevel} />
              {shipment.demoScenario && (
                <span className="inline-flex h-5 items-center gap-1 rounded-full border border-status-warning/35 bg-status-warning/10 px-2 text-[11px] font-medium">
                  <FlaskConical className="size-3 text-status-warning" aria-hidden />
                  {DEMO_SCENARIO_LABELS[shipment.demoScenario] ?? "Demo scenario"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {shipment.customerName} · {shipment.origin} → {shipment.destination} ·{" "}
              <span className={cn(shipment.delayMinutes >= 60 && "font-medium text-status-critical")}>
                {formatDelay(shipment.delayMinutes)}
              </span>
              {shipment.delayReason && <span> · {shipment.delayReason}</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void copy(`${window.location.origin}${trackingUrl}`, "Tracking link")}>
              <Copy data-icon="inline-start" />
              Copy tracking link
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink data-icon="inline-start" />
                Customer view
              </a>
            </Button>
            {vehicle && shipment.status !== "DELIVERED" && (
              <Button size="sm" asChild>
                <Link href={`/control-tower?focus=${vehicle.id}`}>
                  <Crosshair data-icon="inline-start" />
                  Locate on map
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <ShipmentSummary shipment={shipment} vehicle={vehicle} route={route} />
          <ShipmentRouteCard shipmentId={shipment.id} risk={shipment.riskLevel} />

          <Card size="sm">
            <CardHeader>
              <CardTitle>Hub history</CardTitle>
              <CardDescription>Arrivals, departures and dwell at each hub on the lane</CardDescription>
            </CardHeader>
            <CardContent>
              {hubHistory.length === 0 ? (
                <EmptyState icon={Warehouse} title="No hub events yet" compact />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase">Hub</TableHead>
                      <TableHead className="text-[11px] uppercase">Arrived</TableHead>
                      <TableHead className="text-[11px] uppercase">Departed</TableHead>
                      <TableHead className="text-[11px] uppercase">Dwell</TableHead>
                      <TableHead className="text-[11px] uppercase">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hubHistory.map((visit) => (
                      <TableRow key={visit.hubId} className="text-[13px]">
                        <TableCell className="font-medium">{visit.hubName}</TableCell>
                        <TableCell className="text-muted-foreground">{visit.arrivedAt ? formatDateTime(visit.arrivedAt) : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{visit.departedAt ? formatDateTime(visit.departedAt) : "—"}</TableCell>
                        <TableCell className={cn(visit.dwellMinutes !== undefined && visit.dwellMinutes > 45 && "font-medium text-status-critical")}>
                          {visit.dwellMinutes !== undefined ? `${visit.dwellMinutes} min` : "—"}
                        </TableCell>
                        <TableCell>
                          <ToneBadge tone={VISIT_TONE[visit.status]} label={visit.status.charAt(0) + visit.status.slice(1).toLowerCase()} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Event log</CardTitle>
              <CardDescription>Normalized operational events · nominal source shown (all simulated in demo mode)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {recentEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 py-2 text-[13px]">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground tabular">{formatDateTime(event.occurredAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{event.title}</span>
                      {event.description && <span className="block text-xs text-muted-foreground">{event.description}</span>}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{event.source}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <ShipmentEtaCard shipment={shipment} eta={eta} />

          <Card size="sm">
            <CardHeader>
              <CardTitle>Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <ShipmentTimeline milestones={timeline} />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Exceptions</CardTitle>
              <CardDescription>{openExceptions.length} open · {exceptions.length} total</CardDescription>
            </CardHeader>
            <CardContent>
              {exceptions.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No exceptions" description="Nothing has been flagged for this shipment." compact />
              ) : (
                <ul className="flex flex-col divide-y">
                  {exceptions.map((exception) => (
                    <li key={exception.id} className="flex items-start gap-2.5 py-2.5">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[13px] leading-snug font-medium">{exception.title}</span>
                        <span className="text-xs text-muted-foreground">{exception.description}</span>
                        <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <SeverityBadge severity={exception.severity} className="h-[18px] px-1.5 text-[10px]" />
                          <ExceptionStatusBadge status={exception.status} className="h-[18px] px-1.5 text-[10px]" />
                          <RelativeTime value={exception.detectedAt} />
                        </span>
                      </div>
                      <Button size="xs" variant="outline" onClick={() => setActionExceptionId(exception.id)}>
                        {OPEN_EXCEPTION_STATUSES.includes(exception.status) ? "Act" : "View"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Notification history</CardTitle>
              <CardDescription>In-app channel · demo provider</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <EmptyState icon={BellOff} title="No notifications yet" compact />
              ) : (
                <ul className="flex flex-col gap-3">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="flex gap-2.5 text-xs">
                      <StatusDot tone={NOTIFICATION_SEVERITY_TONES[notification.severity]} className="mt-1" />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[13px] font-medium">{notification.title}</span>
                        <span className="text-muted-foreground">{notification.message}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {NOTIFICATION_TEMPLATE_LABELS[notification.template]} · {notification.channel} ·{" "}
                          {notification.status.toLowerCase()} · {formatDateTime(notification.createdAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ExceptionActionSheet
        exceptionId={actionExceptionId}
        open={Boolean(actionExceptionId)}
        onOpenChange={(open) => {
          if (!open) setActionExceptionId(undefined);
        }}
      />
    </PageTransition>
  );
}
