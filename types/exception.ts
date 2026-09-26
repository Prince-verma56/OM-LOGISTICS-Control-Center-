import type { ExceptionSeverity, ExceptionStatus, ExceptionType } from "@/lib/constants/statuses";

export type { ExceptionSeverity, ExceptionStatus, ExceptionType };

export interface Exception {
  id: string;
  shipmentId: string;

  type: ExceptionType;

  severity: ExceptionSeverity;

  title: string;
  description: string;

  detectedAt: string;

  status: ExceptionStatus;

  assignedTo?: string;
  resolutionNote?: string;
  resolvedAt?: string;

  /* ---- Enrichments ---- */
  source: "SEED" | "DEMO_SIMULATOR" | "DEMO_SCENARIO";
  vehicleId?: string;
  hubId?: string;
  /** Other shipments affected by a vehicle-level incident. */
  affectedShipmentIds?: string[];
  updatedAt: string;
}

/** Exception row enriched for list views (brain/24_IT_HANDOFF.md). */
export interface ExceptionListItem extends Exception {
  trackingNumber: string;
  customerName: string;
  vehicleNumber?: string;
  currentLocationLabel?: string;
  revisedEtaAt?: string;
  hubName?: string;
}

/** Audit record for every workflow change (brain/00_MASTER_RULES.md §7). */
export interface ExceptionAuditEntry {
  id: string;
  exceptionId: string;
  actor: string;
  action: "CREATED" | "UPDATED" | "AUTO_RESOLVED";
  fromStatus?: ExceptionStatus;
  toStatus?: ExceptionStatus;
  fromAssignee?: string;
  toAssignee?: string;
  note?: string;
  at: string;
}

export interface ExceptionDetail {
  exception: ExceptionListItem;
  audit: ExceptionAuditEntry[];
  allowedTransitions: ExceptionStatus[];
}
