"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { PaginatedResponse } from "@/types/api";
import type { ShipmentRouteView } from "@/types/route";
import type { PublicTrackingView, Shipment, ShipmentDetail } from "@/types/shipment";
import type { RiskLevel, ShipmentStatus } from "@/lib/constants/statuses";

export interface ShipmentQueryParams extends QueryParams {
  page?: number;
  pageSize?: number;
  scope?: "active" | "delivered" | "all";
  sort?: "risk" | "eta" | "delay" | "lastUpdated" | "trackingNumber";
  order?: "asc" | "desc";
  search?: string;
  status?: ShipmentStatus;
  riskLevel?: RiskLevel;
  hubId?: string;
  vehicleId?: string;
  customerId?: string;
  routeId?: string;
  from?: string;
  to?: string;
}

export function useShipments(params: ShipmentQueryParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.shipments.list(params),
    queryFn: () => apiClient.get<PaginatedResponse<Shipment>>("/api/v1/shipments", params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useShipmentDetail(shipmentId: string) {
  return useQuery({
    queryKey: queryKeys.shipments.detail(shipmentId),
    queryFn: () => apiClient.get<ShipmentDetail>(`/api/v1/shipments/${shipmentId}`),
    placeholderData: keepPreviousData,
  });
}

export function useShipmentRoute(shipmentId: string) {
  return useQuery({
    queryKey: queryKeys.shipments.route(shipmentId),
    queryFn: () => apiClient.get<ShipmentRouteView>(`/api/v1/shipments/${shipmentId}/route`),
    placeholderData: keepPreviousData,
  });
}

/** Customer tracking — polls (the public page never subscribes to internal streams). */
export function usePublicTracking(token: string) {
  return useQuery({
    queryKey: queryKeys.publicTracking(token),
    queryFn: () => apiClient.get<PublicTrackingView>(`/api/v1/public/tracking/${token}`),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  });
}
