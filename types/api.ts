import type {
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionType,
  RiskLevel,
  ShipmentScope,
  ShipmentSortField,
  ShipmentStatus,
  SortOrder,
  VehicleStatus,
} from "@/lib/constants/statuses";

/* -------------------------------------------------------------------------- */
/* Envelopes                                                                  */
/* -------------------------------------------------------------------------- */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Collection responses: `{ data, pagination? }` (brain/07_API_CONTRACT.md §2). */
export interface CollectionResponse<T> {
  data: T[];
  pagination?: Pagination;
}

export interface PaginatedResponse<T> extends CollectionResponse<T> {
  pagination: Pagination;
}

/** Stable error contract (brain/07 §14, brain/09 §2). */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  };
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SHIPMENT_NOT_FOUND"
  | "HUB_NOT_FOUND"
  | "EXCEPTION_NOT_FOUND"
  | "TRACKING_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "EXCEPTION_ALREADY_CLOSED"
  | "DEMO_MODE_REQUIRED"
  | "RATE_LIMITED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR";

/* -------------------------------------------------------------------------- */
/* Inputs                                                                     */
/* -------------------------------------------------------------------------- */

export interface DashboardFilters {
  search?: string;

  from?: string;
  to?: string;

  status?: ShipmentStatus;
  riskLevel?: RiskLevel;

  hubId?: string;
  vehicleId?: string;
  customerId?: string;
  routeId?: string;
}

export interface ShipmentListQuery extends DashboardFilters {
  page: number;
  pageSize: number;
  scope: ShipmentScope;
  sort: ShipmentSortField;
  order: SortOrder;
}

export interface ExceptionActionInput {
  status: ExceptionStatus;

  assignedTo?: string;
  note?: string;
}

export interface ExceptionListQuery {
  status?: ExceptionStatus;
  severity?: ExceptionSeverity;
  type?: ExceptionType;
  hubId?: string;
  assignedTo?: string;
  shipmentId?: string;
  from?: string;
  to?: string;
  /** "open" = OPEN + IN_PROGRESS */
  view?: "open" | "closed" | "all";
  page: number;
  pageSize: number;
}

export interface FleetListQuery extends DashboardFilters {
  vehicleStatus?: VehicleStatus;
}

export interface KpiQuery {
  from?: string;
  to?: string;
  hubId?: string;
  customerId?: string;
  routeId?: string;
}

/* -------------------------------------------------------------------------- */
/* Reference data                                                             */
/* -------------------------------------------------------------------------- */

export interface FilterOption {
  value: string;
  label: string;
  hint?: string;
}

export interface FilterOptions {
  customers: FilterOption[];
  hubs: FilterOption[];
  vehicles: FilterOption[];
  routes: FilterOption[];
  assignees: FilterOption[];
}
