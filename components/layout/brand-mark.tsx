import { cn } from "@/lib/utils";

/** Product mark for the demo (a neutral monogram, not an official logo). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-[11px] font-bold tracking-tight text-sidebar-primary-foreground shadow-sm ring-1 ring-white/10",
        className,
      )}
    >
      OM
    </span>
  );
}
