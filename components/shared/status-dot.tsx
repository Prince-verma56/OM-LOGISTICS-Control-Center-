import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants/statuses";

export const TONE_DOT: Record<Tone, string> = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  serious: "bg-status-serious",
  critical: "bg-status-critical",
  info: "bg-status-info",
  neutral: "bg-status-neutral",
};

export const TONE_SURFACE: Record<Tone, string> = {
  good: "bg-status-good/10 border-status-good/25",
  warning: "bg-status-warning/12 border-status-warning/30",
  serious: "bg-status-serious/12 border-status-serious/30",
  critical: "bg-status-critical/12 border-status-critical/35",
  info: "bg-status-info/10 border-status-info/25",
  neutral: "bg-muted border-border",
};

export const TONE_ICON: Record<Tone, string> = {
  good: "text-status-good",
  warning: "text-status-warning",
  serious: "text-status-serious",
  critical: "text-status-critical",
  info: "text-status-info",
  neutral: "text-muted-foreground",
};

/** Small colour dot. Colour is never the only signal — pair it with a label. */
export function StatusDot({
  tone,
  pulse = false,
  className,
}: {
  tone: Tone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", TONE_DOT[tone], pulse && "live-dot", className)}
    />
  );
}

/** Pill with dot + label; text stays in foreground ink for contrast. */
export function ToneBadge({
  tone,
  label,
  icon,
  className,
  title,
}: {
  tone: Tone;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] leading-none font-medium whitespace-nowrap text-foreground",
        TONE_SURFACE[tone],
        className,
      )}
    >
      {icon ?? <StatusDot tone={tone} className="size-1.5" />}
      {label}
    </span>
  );
}
