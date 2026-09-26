import { DEMO_CONFIG } from "@/config/demo";

/**
 * Timestamps are stored as ISO-8601 UTC and presented in IST
 * (the operating timezone for Indian lanes).
 */

const TIME_ZONE = DEMO_CONFIG.timeZone;
const LOCALE = "en-IN";

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const clockFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(value: string | Date | undefined | null): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** "6:30 pm" → normalized to "6:30 PM". */
export function formatTime(value: string | Date | undefined | null): string {
  const date = toDate(value);
  return date ? timeFormat.format(date).toUpperCase() : "—";
}

/** "14:32:05" (24h) — for the live clock. */
export function formatClock(value: string | Date | undefined | null): string {
  const date = toDate(value);
  return date ? clockFormat.format(date) : "—";
}

/** "26 Sep 2026" */
export function formatDate(value: string | Date | undefined | null): string {
  const date = toDate(value);
  return date ? dateFormat.format(date) : "—";
}

/** "26 Sep" */
export function formatShortDate(value: string | Date | undefined | null): string {
  const date = toDate(value);
  return date ? shortDateFormat.format(date) : "—";
}

/** "26 Sep, 6:30 PM" */
export function formatDateTime(value: string | Date | undefined | null): string {
  const date = toDate(value);
  return date ? `${shortDateFormat.format(date)}, ${formatTime(date)}` : "—";
}

/** "2026-09-26" in IST — used to bucket daily KPIs. */
export function toDayKey(value: string | Date): string {
  const date = toDate(value);
  return date ? dayKeyFormat.format(date) : "";
}

/** Human duration: 45 → "45m", 125 → "2h 05m", 1570 → "1d 2h". */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.round(Math.abs(totalMinutes));
  if (minutes < 60) return `${minutes}m`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

/** Signed minutes between two timestamps (b − a). */
export function minutesBetween(a: string | Date, b: string | Date): number {
  const first = toDate(a);
  const second = toDate(b);
  if (!first || !second) return 0;
  return Math.round((second.getTime() - first.getTime()) / 60_000);
}

/**
 * Relative time against an explicit reference clock (the simulation clock),
 * e.g. "just now", "4m ago", "in 2h 10m".
 */
export function formatRelative(value: string | Date | undefined | null, reference: string | Date): string {
  const date = toDate(value);
  const ref = toDate(reference);
  if (!date || !ref) return "—";
  const diffMinutes = Math.round((date.getTime() - ref.getTime()) / 60_000);
  if (Math.abs(diffMinutes) < 1) return "just now";
  return diffMinutes < 0 ? `${formatDuration(diffMinutes)} ago` : `in ${formatDuration(diffMinutes)}`;
}

export function timeZoneLabel(): string {
  return DEMO_CONFIG.timeZoneLabel;
}
