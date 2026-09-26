"use client";

import { format, parseISO, subDays } from "date-fns";
import { CalendarDays, Check, X } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 24 hours", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
] as const;

const toKey = (date: Date) => format(date, "yyyy-MM-dd");

/**
 * Date range filter: preset rows first (the filter every reader reaches for),
 * custom calendar range below a hairline. Values are ISO dates (IST days).
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
  label = "Booked date",
  referenceDate,
  className,
}: {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
  label?: string;
  /** "Today" for presets — the simulation clock in demo mode. */
  referenceDate?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = referenceDate ? parseISO(referenceDate) : new Date();
  const selected: DateRange | undefined = from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined;
  const summary = from ? `${format(parseISO(from), "d MMM")} – ${to ? format(parseISO(to), "d MMM") : "…"}` : label;

  const applyPreset = (days: number) => {
    onChange({ from: toKey(subDays(today, days)), to: toKey(today) });
    setOpen(false);
  };
  const activePreset = PRESETS.find(
    (preset) => from === toKey(subDays(today, preset.days)) && to === toKey(today),
  );

  return (
    <div className={cn("relative min-w-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("h-8 w-full justify-start gap-1.5 px-2.5 font-normal", from && "pr-8")}
            aria-label={label}
          >
            <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
            <span className={cn("truncate", !from && "text-muted-foreground")}>{summary}</span>
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col p-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.days)}
              className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <Check className={cn("size-4 stroke-[2.5]", activePreset?.label === preset.label ? "opacity-100" : "opacity-0")} />
              {preset.label}
            </button>
          ))}
        </div>
        <Separator />
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={selected}
          defaultMonth={selected?.from ?? today}
          disabled={{ after: today }}
          onSelect={(range) => onChange({ from: range?.from ? toKey(range.from) : undefined, to: range?.to ? toKey(range.to) : undefined })}
        />
      </PopoverContent>
      </Popover>
      {from && (
        <button
          type="button"
          aria-label="Clear date range"
          onClick={() => onChange({})}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
