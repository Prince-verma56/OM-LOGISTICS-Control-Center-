import { z } from "zod";
import {
  EXCEPTION_SEVERITIES,
  EXCEPTION_STATUSES,
  EXCEPTION_TYPES,
} from "@/lib/constants/statuses";
import type { ExceptionActionInput, ExceptionListQuery } from "@/types/api";
import { idSchema, isoDateOrDateTimeSchema, paginationSchema } from "./common";

/**
 * Exception workflow action. Shared by the React Hook Form (client) and the
 * PATCH /api/v1/exceptions/:id handler (server).
 */
export const exceptionActionSchema = z
  .object({
    status: z.enum(EXCEPTION_STATUSES),
    assignedTo: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => (value ? value : undefined)),
    note: z
      .string()
      .trim()
      .max(500, "Keep notes under 500 characters.")
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .superRefine((value, ctx) => {
    if ((value.status === "RESOLVED" || value.status === "DISMISSED") && (!value.note || value.note.length < 3)) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Add a short resolution note before closing the exception.",
      });
    }
    if (value.status === "IN_PROGRESS" && !value.assignedTo) {
      ctx.addIssue({
        code: "custom",
        path: ["assignedTo"],
        message: "Assign an owner when moving the exception to In progress.",
      });
    }
  }) satisfies z.ZodType<ExceptionActionInput, unknown>;

export type ExceptionActionFormValues = z.input<typeof exceptionActionSchema>;

export const exceptionListQuerySchema = z
  .object({
    status: z.enum(EXCEPTION_STATUSES).optional(),
    severity: z.enum(EXCEPTION_SEVERITIES).optional(),
    type: z.enum(EXCEPTION_TYPES).optional(),
    hubId: idSchema.optional(),
    assignedTo: z.string().trim().max(40).optional(),
    shipmentId: idSchema.optional(),
    from: isoDateOrDateTimeSchema.optional(),
    to: isoDateOrDateTimeSchema.optional(),
    view: z.enum(["open", "closed", "all"]).default("open"),
  })
  .extend(paginationSchema.shape) satisfies z.ZodType<ExceptionListQuery, unknown>;

export const exceptionIdParamSchema = z.object({ exceptionId: idSchema });
