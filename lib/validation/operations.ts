import { z } from "zod";
import { NOTIFICATION_SEVERITIES, NOTIFICATION_TEMPLATES, VEHICLE_STATUSES } from "@/lib/constants/statuses";
import type { FleetListQuery, KpiQuery } from "@/types/api";
import { DEMO_SCENARIO_TRIGGERS, SIMULATION_SPEEDS } from "@/types/realtime";
import { idSchema, isoDateOrDateTimeSchema, optionalTrimmedString } from "./common";

export const fleetListQuerySchema = z.object({
  status: z.enum(VEHICLE_STATUSES).optional(),
  search: optionalTrimmedString(40),
  routeId: idSchema.optional(),
}) satisfies z.ZodType<FleetListQuery, unknown>;

export const hubIdParamSchema = z.object({ hubId: idSchema });

export const kpiQuerySchema = z.object({
  from: isoDateOrDateTimeSchema.optional(),
  to: isoDateOrDateTimeSchema.optional(),
  hubId: idSchema.optional(),
  customerId: idSchema.optional(),
  routeId: idSchema.optional(),
}) satisfies z.ZodType<KpiQuery, unknown>;

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  shipmentId: idSchema.optional(),
});

/** POST /api/v1/notifications/test — DEMO_MODE only. */
export const testNotificationSchema = z.object({
  shipmentId: idSchema.optional(),
  template: z.enum(NOTIFICATION_TEMPLATES).default("SHIPMENT_UPDATE"),
  severity: z.enum(NOTIFICATION_SEVERITIES).default("INFO"),
  title: z.string().trim().min(3).max(120).optional(),
  message: z.string().trim().min(3).max(400).optional(),
});

export const simulationControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("reset") }),
  z.object({
    action: z.literal("setSpeed"),
    speed: z.union(SIMULATION_SPEEDS.map((speed) => z.literal(speed)) as [
      z.ZodLiteral<1>,
      z.ZodLiteral<5>,
      z.ZodLiteral<20>,
    ]),
  }),
]);
export type SimulationControlInput = z.infer<typeof simulationControlSchema>;

export const scenarioTriggerSchema = z.object({
  scenario: z.enum(DEMO_SCENARIO_TRIGGERS),
});
