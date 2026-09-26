import { z } from "zod";

/** Internal identifiers look like `shp_10001`, `veh_0042`, `hub_del`. */
export const idSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{3}_[a-z0-9]{2,24}$/, "Invalid identifier.");

/** Opaque public tracking token (base64url, derived with HMAC). */
export const trackingTokenSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid tracking token.");

/** Accepts an ISO date (YYYY-MM-DD) or a full ISO-8601 datetime with offset. */
export const isoDateOrDateTimeSchema = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

export const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * Converts URLSearchParams to a plain object. Empty values are dropped so that
 * optional schema fields stay `undefined`.
 */
export function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    if (value.trim() !== "") result[key] = value;
  });
  return result;
}

/** Normalizes a date-only bound to an instant (start/end of day, IST). */
export function toInstant(value: string | undefined, bound: "start" | "end"): Date | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = bound === "start" ? "00:00:00.000" : "23:59:59.999";
    return new Date(`${value}T${time}+05:30`);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
