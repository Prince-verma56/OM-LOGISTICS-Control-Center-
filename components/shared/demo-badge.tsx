import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Visible, non-intrusive marker required while dummy data is in use (brain/08 §14). */
export function DemoBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-status-warning/40 bg-status-warning/10 px-2 text-[10.5px] font-semibold tracking-wide text-foreground uppercase",
        className,
      )}
      title="All data on this screen is simulated demo data. No real OM Logistics systems are connected."
    >
      <FlaskConical className="size-3 text-status-warning" aria-hidden />
      {compact ? "Demo" : "Demo data · Simulated"}
    </span>
  );
}
