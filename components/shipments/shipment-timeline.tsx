import { Check, Circle, TriangleAlert } from "lucide-react";
import { formatDateTime } from "@/lib/formatters/date";
import { cn } from "@/lib/utils";
import type { ShipmentMilestone } from "@/types/shipment";

/**
 * Six-milestone journey (brain/08 §6): completed = success, current =
 * emphasised, delayed = warning, upcoming = neutral.
 */
export function ShipmentTimeline({
  milestones,
  className,
}: {
  milestones: Array<Pick<ShipmentMilestone, "status" | "label" | "state" | "occurredAt" | "locationLabel"> & { expectedAt?: string }>;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-col", className)} aria-label="Shipment journey">
      {milestones.map((milestone, index) => {
        const last = index === milestones.length - 1;
        const completed = milestone.state === "COMPLETED";
        const current = milestone.state === "CURRENT";
        const delayed = milestone.state === "DELAYED";
        return (
          <li key={milestone.status} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current || delayed ? "step" : undefined}>
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-0.5 rounded-full",
                  completed ? "bg-status-good/60" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                completed && "border-status-good bg-status-good text-white",
                current && "border-primary bg-primary/15 text-primary ring-4 ring-primary/15",
                delayed && "border-status-warning bg-status-warning/15 text-status-warning ring-4 ring-status-warning/15",
                milestone.state === "UPCOMING" && "border-border bg-card text-muted-foreground",
              )}
            >
              {completed ? (
                <Check className="size-3.5 stroke-[3]" aria-hidden />
              ) : delayed ? (
                <TriangleAlert className="size-3.5" aria-hidden />
              ) : (
                <Circle className={cn("size-2", current ? "fill-current" : "fill-transparent")} aria-hidden />
              )}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
              <span
                className={cn(
                  "text-[13px] leading-tight",
                  milestone.state === "UPCOMING" ? "text-muted-foreground" : "font-medium",
                  (current || delayed) && "font-semibold",
                )}
              >
                {milestone.label}
                {delayed && <span className="ml-1.5 text-[11px] font-medium text-status-warning">Delayed</span>}
                {current && <span className="ml-1.5 text-[11px] font-medium text-primary">Current</span>}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                {milestone.occurredAt
                  ? `${formatDateTime(milestone.occurredAt)}${milestone.locationLabel ? ` · ${milestone.locationLabel}` : ""}`
                  : milestone.expectedAt
                    ? `Expected ${formatDateTime(milestone.expectedAt)}`
                    : "Pending"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
