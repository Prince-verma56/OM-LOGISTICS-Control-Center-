import { cn } from "@/lib/utils";

/**
 * Minimal inline sparkline (session trend of a live KPI). 1.5px line, no
 * axes — the card's value and delta carry the numbers.
 */
export function Sparkline({
  values,
  className,
  strokeClassName = "stroke-primary",
  height = 28,
  width = 96,
}: {
  values: number[];
  className?: string;
  strokeClassName?: string;
  height?: number;
  width?: number;
}) {
  if (values.length < 2) {
    return <div className={cn("h-7 w-24", className)} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(",");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        className={cn("opacity-80", strokeClassName)}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} className={cn("fill-card", strokeClassName)} strokeWidth={1.5} />
    </svg>
  );
}
