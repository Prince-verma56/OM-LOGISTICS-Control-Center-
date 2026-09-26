"use client";

import { Clock3 } from "lucide-react";
import { DemoBadge } from "@/components/shared/demo-badge";
import { StatusDot } from "@/components/shared/status-dot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLiveSimulation, type ConnectionState } from "@/hooks/use-live-simulation";
import { formatClock, formatShortDate, timeZoneLabel } from "@/lib/formatters/date";
import type { Tone } from "@/lib/constants/statuses";
import { cn } from "@/lib/utils";

const CONNECTION_COPY: Record<ConnectionState, { label: string; tone: Tone }> = {
  connecting: { label: "Connecting", tone: "neutral" },
  live: { label: "Stream live", tone: "good" },
  reconnecting: { label: "Reconnecting", tone: "warning" },
  polling: { label: "Polling fallback", tone: "warning" },
  offline: { label: "Offline", tone: "critical" },
};

/**
 * DEMO DATA · LIVE SIMULATION · LAST UPDATED — always visible in the topbar
 * (brain/19 §5). "Last updated" is the simulation clock at the latest tick.
 */
export function LiveStatusIndicator({ className }: { className?: string }) {
  const { state, connection } = useLiveSimulation();
  const running = Boolean(state?.running);
  const connectionCopy = CONNECTION_COPY[connection];
  const simLabel = !state?.enabled ? "Simulation off" : running ? "Live simulation" : "Simulation paused";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DemoBadge className="hidden sm:inline-flex" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10.5px] font-semibold tracking-wide whitespace-nowrap uppercase",
              running ? "border-status-good/35 bg-status-good/10" : "border-border bg-muted",
            )}
          >
            <StatusDot tone={running ? "good" : "neutral"} pulse={running} />
            <span className="hidden md:inline">{simLabel}</span>
            <span className="md:hidden">{running ? "Live" : "Paused"}</span>
            {state && running && <span className="text-muted-foreground">· {state.speed}x</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          <p className="font-medium">{simLabel}</p>
          <p className="text-xs opacity-80">
            {connectionCopy.label}. Each tick advances the simulated clock by {state?.simulatedMinutesPerTick ?? "—"} min every{" "}
            {state ? state.tickIntervalMs / 1000 : 2}s.
          </p>
        </TooltipContent>
      </Tooltip>
      <div className="hidden items-center gap-1.5 text-xs whitespace-nowrap lg:flex" aria-live="off">
        <Clock3 className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">Last updated</span>
        <time dateTime={state?.simulatedNow} className="font-mono text-[12px] font-medium tabular">
          {state ? formatClock(state.simulatedNow) : "--:--:--"}
        </time>
        <span className="hidden text-[11px] text-muted-foreground xl:inline">
          {state ? `${formatShortDate(state.simulatedNow)} ${timeZoneLabel()}` : ""}
        </span>
        {connection !== "live" && (
          <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <StatusDot tone={connectionCopy.tone} />
            {connectionCopy.label}
          </span>
        )}
      </div>
    </div>
  );
}
