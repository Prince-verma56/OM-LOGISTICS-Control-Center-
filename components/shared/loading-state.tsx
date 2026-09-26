import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Skeleton placeholders shaped like the content they stand in for. */
export function LoadingState({
  variant = "rows",
  rows = 5,
  className,
  label = "Loading",
}: {
  variant?: "rows" | "cards" | "panel" | "list";
  rows?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={cn("w-full", className)}>
      {variant === "rows" && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      )}
      {variant === "list" && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {variant === "cards" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: rows }, (_, index) => (
            <Skeleton key={index} className="h-[104px] rounded-xl" />
          ))}
        </div>
      )}
      {variant === "panel" && <Skeleton className="h-full min-h-40 w-full rounded-xl" />}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
