import { ArrowRight, Info } from "lucide-react";
import { RelativeTime } from "@/components/shared/relative-time";
import { RiskBadge } from "@/components/shipments/shipment-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDuration, formatTime, formatShortDate, minutesBetween } from "@/lib/formatters/date";
import { cn } from "@/lib/utils";
import type { EtaPrediction } from "@/types/eta";
import type { Shipment } from "@/types/shipment";

const ADVERSE = new Set(["traffic", "hub_dwell", "no_movement", "route_deviation"]);

/**
 * Predictive ETA (brain/08 §5, brain/00 §8): prediction time, predicted ETA,
 * confidence/risk and data freshness — presented as a prediction, not a fact.
 */
export function ShipmentEtaCard({ shipment, eta }: { shipment: Shipment; eta: EtaPrediction }) {
  const delivered = shipment.status === "DELIVERED";
  const previous = eta.previousEtaAt ?? shipment.originalEtaAt;
  const shift = minutesBetween(previous, eta.predictedEtaAt);
  const maxImpact = Math.max(1, ...eta.factors.map((factor) => Math.abs(factor.impactMinutes)));
  const confidencePct = Math.round(eta.confidence * 100);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{delivered ? "Delivery outcome" : "Predictive ETA"}</CardTitle>
        <CardDescription>
          {delivered ? "Actual delivery vs plan" : "Deterministic rules model · refreshed every simulation tick"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          {Math.abs(shift) >= 1 && (
            <>
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground">{eta.previousEtaAt ? "Previous ETA" : "Original ETA"}</span>
                <span className="text-base font-medium text-muted-foreground line-through decoration-muted-foreground/50 tabular">
                  {formatTime(previous)}
                </span>
                <span className="text-[11px] text-muted-foreground">{formatShortDate(previous)}</span>
              </div>
              <ArrowRight className="mb-5 size-4 text-muted-foreground" aria-hidden />
            </>
          )}
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground">
              {delivered ? "Delivered" : Math.abs(shift) >= 1 ? "Revised ETA" : "Predicted ETA · on plan"}
            </span>
            <span className="text-[28px] leading-none font-semibold tracking-tight tabular">{formatTime(eta.predictedEtaAt)}</span>
            <span className="text-[11px] text-muted-foreground">{formatShortDate(eta.predictedEtaAt)}</span>
          </div>
          {Math.abs(shift) >= 1 && (
            <span
              className={cn(
                "mb-5 ml-auto rounded-md px-1.5 py-0.5 text-xs font-semibold tabular",
                shift > 0 ? "bg-status-critical/12 text-status-critical" : "bg-status-good/12 text-success-text",
              )}
            >
              {shift > 0 ? "+" : "−"}
              {formatDuration(shift)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Promised delivery</span>
            <span className="font-medium">{formatDateTime(shipment.promisedDeliveryAt)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">{eta.bufferMinutes >= 0 ? "Buffer to promise" : "Breach vs promise"}</span>
            <span className={cn("font-medium tabular", eta.bufferMinutes < 0 && "text-status-critical")}>
              {eta.bufferMinutes >= 0 ? formatDuration(eta.bufferMinutes) : `${formatDuration(eta.bufferMinutes)} late`}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Risk</span>
            <RiskBadge level={eta.riskLevel} className="self-start" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/15" aria-hidden>
                <div className="h-full rounded-full bg-primary" style={{ width: `${confidencePct}%` }} />
              </div>
              <span className="font-medium tabular">{confidencePct}%</span>
            </div>
          </div>
        </div>

        <p className="rounded-md bg-muted/60 px-2.5 py-2 text-xs leading-relaxed">{eta.explanation}</p>

        {eta.factors.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">ETA factors</span>
            <ul className="flex flex-col gap-1.5">
              {eta.factors.map((factor) => (
                <li key={factor.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 text-xs">
                  <span className={cn(ADVERSE.has(factor.key) && "font-medium")}>{factor.label}</span>
                  <span className="text-muted-foreground tabular">
                    {factor.impactMinutes >= 0 ? "+" : "−"}
                    {formatDuration(factor.impactMinutes)}
                  </span>
                  <div className="col-span-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className={cn("h-full rounded-full", ADVERSE.has(factor.key) ? "bg-status-serious" : "bg-primary/50")}
                      style={{ width: `${(Math.abs(factor.impactMinutes) / maxImpact) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-[11px] text-muted-foreground">
          <span>
            Predicted <RelativeTime value={eta.generatedAt} />
          </span>
          <span>
            Data freshness <RelativeTime value={eta.dataFreshnessAt} />
          </span>
          <span className="flex items-center gap-1">
            <Info className="size-3" aria-hidden />
            Prediction — not a confirmed time
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
