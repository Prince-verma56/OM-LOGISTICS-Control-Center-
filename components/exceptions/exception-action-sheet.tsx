"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, History, Loader2, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ExceptionStatusBadge, SeverityBadge } from "@/components/shared/domain-badges";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_CONFIG, assigneeName } from "@/config/demo";
import { useExceptionAction, useExceptionDetail } from "@/hooks/use-exceptions";
import { ApiError } from "@/lib/api/client";
import {
  EXCEPTION_STATUS_LABELS,
  EXCEPTION_TYPE_LABELS,
  OPEN_EXCEPTION_STATUSES,
  type ExceptionStatus,
} from "@/lib/constants/statuses";
import { formatDateTime } from "@/lib/formatters/date";
import { shipmentPath } from "@/lib/formatters/shipment";
import { exceptionActionSchema, type ExceptionActionFormValues } from "@/lib/validation/exceptions";
import type { ExceptionDetail } from "@/types/exception";

function defaultsFor(detail: ExceptionDetail): ExceptionActionFormValues {
  const { exception } = detail;
  const suggested: ExceptionStatus = exception.status === "OPEN" ? "IN_PROGRESS" : exception.status;
  return { status: suggested, assignedTo: exception.assignedTo ?? DEMO_CONFIG.operator.id, note: "" };
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[13px]">{children}</span>
    </div>
  );
}

function ActionForm({ detail }: { detail: ExceptionDetail }) {
  const action = useExceptionAction(detail.exception.id);
  const form = useForm({
    resolver: zodResolver(exceptionActionSchema),
    defaultValues: defaultsFor(detail),
  });
  const status = useWatch({ control: form.control, name: "status" });

  const submit = form.handleSubmit(async (values) => {
    try {
      const next = await action.mutateAsync(values);
      form.reset(defaultsFor(next));
    } catch {
      // Error is rendered from mutation state below.
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            form.setValue("status", "IN_PROGRESS");
            form.setValue("assignedTo", DEMO_CONFIG.operator.id);
          }}
          disabled={!detail.allowedTransitions.includes("IN_PROGRESS")}
        >
          <UserRoundCheck data-icon="inline-start" />
          Assign to me
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => form.setValue("status", "RESOLVED")}>
          <CheckCircle2 data-icon="inline-start" />
          Resolve
        </Button>
      </div>

      <FieldGroup className="gap-4">
        <Controller
          name="status"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="exception-status">Status</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="exception-status" aria-invalid={fieldState.invalid} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {detail.allowedTransitions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {EXCEPTION_STATUS_LABELS[option]}
                      {option === detail.exception.status ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="assignedTo"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="exception-assignee">Owner</FieldLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="exception-assignee" aria-invalid={fieldState.invalid} className="w-full">
                  <SelectValue placeholder="Choose an owner" />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_CONFIG.assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="note"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="exception-note">Note</FieldLabel>
              <Textarea
                id="exception-note"
                rows={3}
                placeholder={
                  status === "RESOLVED" || status === "DISMISSED"
                    ? "What was done? e.g. Rerouted via NH44, customer informed."
                    : "e.g. Contacted transport partner; awaiting update."
                }
                aria-invalid={fieldState.invalid}
                {...field}
                value={field.value ?? ""}
              />
              <FieldDescription>Every change is recorded in the audit trail with your name and time.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      {action.isError && (
        <Alert variant="destructive">
          <AlertTitle>Action not saved</AlertTitle>
          <AlertDescription>
            {action.error instanceof ApiError ? action.error.message : "Please try again."}
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={action.isPending}>
        {action.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        Save action
      </Button>
    </form>
  );
}

/** Action drawer: assign, change status, add note, resolve (brain/08 §8). */
export function ExceptionActionSheet({
  exceptionId,
  open,
  onOpenChange,
}: {
  exceptionId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useExceptionDetail(open ? exceptionId : undefined);
  const exception = detail.data?.exception;
  const isOpen = exception ? OPEN_EXCEPTION_STATUSES.includes(exception.status) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[460px]">
        <SheetHeader className="border-b">
          <div className="flex flex-wrap items-center gap-1.5 pr-8">
            {exception && (
              <>
                <SeverityBadge severity={exception.severity} />
                <ExceptionStatusBadge status={exception.status} />
                <span className="text-[11px] text-muted-foreground">{EXCEPTION_TYPE_LABELS[exception.type]}</span>
              </>
            )}
          </div>
          <SheetTitle className="pr-8 leading-snug">{exception?.title ?? "Exception"}</SheetTitle>
          <SheetDescription>{exception?.description ?? "Loading exception details…"}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 p-4">
            {detail.isPending ? (
              <LoadingState variant="list" rows={6} label="Loading exception" />
            ) : detail.isError ? (
              <ErrorState error={detail.error} onRetry={() => void detail.refetch()} compact />
            ) : detail.data && exception ? (
              <>
                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                  <Meta label="Shipment">
                    <Link href={shipmentPath(exception.shipmentId)} className="font-mono font-medium text-primary hover:underline">
                      {exception.trackingNumber}
                    </Link>
                  </Meta>
                  <Meta label="Customer">{exception.customerName}</Meta>
                  <Meta label="Vehicle">
                    <span className="font-mono">{exception.vehicleNumber ?? "—"}</span>
                  </Meta>
                  <Meta label="Location">{exception.hubName ?? exception.currentLocationLabel ?? "—"}</Meta>
                  <Meta label="Detected">
                    <RelativeTime value={exception.detectedAt} />
                  </Meta>
                  <Meta label="Revised ETA">{formatDateTime(exception.revisedEtaAt)}</Meta>
                  <Meta label="Owner">{assigneeName(exception.assignedTo) ?? "Unassigned"}</Meta>
                  <Meta label="Affected shipments">{exception.affectedShipmentIds?.length ?? 1}</Meta>
                </div>

                {isOpen ? (
                  <ActionForm key={`${exception.id}:${exception.updatedAt}`} detail={detail.data} />
                ) : (
                  <Alert>
                    <CheckCircle2 className="text-status-good" />
                    <AlertTitle>{EXCEPTION_STATUS_LABELS[exception.status]}</AlertTitle>
                    <AlertDescription>
                      {exception.resolutionNote ?? "Closed."} {exception.resolvedAt ? `· ${formatDateTime(exception.resolvedAt)}` : ""}
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />
                <section aria-label="Audit trail" className="flex flex-col gap-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <History className="size-3.5" aria-hidden />
                    Audit trail
                  </h3>
                  <ol className="flex flex-col gap-3 border-l pl-4">
                    {[...detail.data.audit].reverse().map((entry) => (
                      <li key={entry.id} className="relative flex flex-col gap-0.5 text-xs">
                        <span className="absolute top-1 -left-[21px] size-2 rounded-full border-2 border-card bg-primary" aria-hidden />
                        <span className="font-medium">
                          {entry.action === "CREATED"
                            ? "Exception detected"
                            : entry.action === "AUTO_RESOLVED"
                              ? "Auto-resolved"
                              : entry.fromStatus !== entry.toStatus && entry.toStatus
                                ? `${EXCEPTION_STATUS_LABELS[entry.fromStatus ?? "OPEN"]} → ${EXCEPTION_STATUS_LABELS[entry.toStatus]}`
                                : "Updated"}
                        </span>
                        <span className="text-muted-foreground">
                          {entry.actor}
                          {entry.toAssignee && entry.toAssignee !== entry.fromAssignee ? ` · assigned to ${assigneeName(entry.toAssignee)}` : ""} ·{" "}
                          {formatDateTime(entry.at)}
                        </span>
                        {entry.note && <span className="rounded-md bg-muted px-2 py-1 text-foreground/90">{entry.note}</span>}
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
