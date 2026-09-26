import { z } from "zod";
import {
  RISK_LEVELS,
  SHIPMENT_SCOPES,
  SHIPMENT_SORT_FIELDS,
  SHIPMENT_STATUSES,
  SORT_ORDERS,
} from "@/lib/constants/statuses";
import type { DashboardFilters, ShipmentListQuery } from "@/types/api";
import { idSchema, isoDateOrDateTimeSchema, optionalTrimmedString, paginationSchema } from "./common";

export const dashboardFiltersSchema = z.object({
  search: optionalTrimmedString(80),
  from: isoDateOrDateTimeSchema.optional(),
  to: isoDateOrDateTimeSchema.optional(),
  status: z.enum(SHIPMENT_STATUSES).optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  hubId: idSchema.optional(),
  vehicleId: idSchema.optional(),
  customerId: idSchema.optional(),
  routeId: idSchema.optional(),
}) satisfies z.ZodType<DashboardFilters>;

export const shipmentListQuerySchema = dashboardFiltersSchema
  .extend(paginationSchema.shape)
  .extend({
    scope: z.enum(SHIPMENT_SCOPES).default("active"),
    sort: z.enum(SHIPMENT_SORT_FIELDS).default("risk"),
    order: z.enum(SORT_ORDERS).default("desc"),
  }) satisfies z.ZodType<ShipmentListQuery, unknown>;

export const shipmentIdParamSchema = z.object({ shipmentId: idSchema });
