import type { QueryParams } from "./client";

/** Central TanStack Query keys — realtime events invalidate by prefix. */
export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    summary: () => ["dashboard", "summary"] as const,
  },
  reference: {
    filterOptions: () => ["reference", "filter-options"] as const,
    routes: () => ["reference", "routes"] as const,
  },
  shipments: {
    all: ["shipments"] as const,
    list: (params: QueryParams) => ["shipments", "list", params] as const,
    detail: (id: string) => ["shipments", "detail", id] as const,
    route: (id: string) => ["shipments", "route", id] as const,
  },
  fleet: {
    all: ["fleet"] as const,
    live: () => ["fleet", "live"] as const,
    list: (params: QueryParams) => ["fleet", "list", params] as const,
  },
  hubs: {
    all: ["hubs"] as const,
    list: () => ["hubs", "list"] as const,
    detail: (id: string) => ["hubs", "detail", id] as const,
  },
  exceptions: {
    all: ["exceptions"] as const,
    list: (params: QueryParams) => ["exceptions", "list", params] as const,
    detail: (id: string) => ["exceptions", "detail", id] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    kpis: (params: QueryParams) => ["analytics", "kpis", params] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: () => ["notifications", "list"] as const,
  },
  simulation: {
    state: () => ["simulation", "state"] as const,
  },
  publicTracking: (token: string) => ["public-tracking", token] as const,
};
