import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Compact titled panel used in the control tower rail. */
export function Panel({
  title,
  count,
  href,
  hrefLabel = "View all",
  children,
  className,
  bodyClassName,
}: {
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col rounded-xl border bg-card", className)} aria-label={title}>
      <header className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {count !== undefined && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular">{count}</span>
        )}
        {href && (
          <Link href={href} className="ml-auto text-[11px] font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none">
            {hrefLabel}
          </Link>
        )}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
