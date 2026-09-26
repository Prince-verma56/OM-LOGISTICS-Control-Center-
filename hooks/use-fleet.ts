"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { CollectionResponse } from "@/types/api";
import type { Vehicle } from "@/types/fleet";

/**
 * Whole-fleet snapshot used by the live map. Loaded once, then patched in
 * place by VEHICLE_POSITION_UPDATED events (see use-live-simulation).
 */
export function useFleetLive() {
  return useQuery({
    queryKey: queryKeys.fleet.live(),
    queryFn: () => apiClient.get<CollectionResponse<Vehicle>>("/api/v1/fleet"),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useFleetList(params: QueryParams) {
  return useQuery({
    queryKey: queryKeys.fleet.list(params),
    queryFn: () => apiClient.get<CollectionResponse<Vehicle>>("/api/v1/fleet", params),
    placeholderData: keepPreviousData,
  });
}
