"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { CollectionResponse, FilterOptions } from "@/types/api";
import type { Hub, HubDetail } from "@/types/hub";
import type { DashboardSummary } from "@/types/kpi";
import type { Route } from "@/types/route";

const HISTORY_KEY = ["dashboard", "history"] as const;
const HISTORY_LENGTH = 40;

/**
 * Live KPI strip values. Each fetch is also appended to a short session
 * history so KPI cards can draw a sparkline of the live simulation.
 */
export function useDashboardSummary() {
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      const data = await apiClient.get<DashboardSummary>("/api/v1/dashboard/summary");
      queryClient.setQueryData<DashboardSummary[]>(HISTORY_KEY, (current = []) =>
        current.at(-1)?.generatedAt === data.generatedAt ? current : [...current, data].slice(-HISTORY_LENGTH),
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
  const history = useQuery<DashboardSummary[]>({
    queryKey: HISTORY_KEY,
    queryFn: () => queryClient.getQueryData<DashboardSummary[]>(HISTORY_KEY) ?? [],
    initialData: [],
    staleTime: Infinity,
  });
  return { ...summary, history: history.data };
}

export function useFilterOptions() {
  return useQuery({
    queryKey: queryKeys.reference.filterOptions(),
    queryFn: () => apiClient.get<FilterOptions>("/api/v1/dashboard/filter-options"),
    staleTime: 5 * 60_000,
  });
}

export function useNetworkRoutes() {
  return useQuery({
    queryKey: queryKeys.reference.routes(),
    queryFn: () => apiClient.get<CollectionResponse<Route>>("/api/v1/routes"),
    staleTime: Infinity,
  });
}

export function useHubs() {
  return useQuery({
    queryKey: queryKeys.hubs.list(),
    queryFn: () => apiClient.get<CollectionResponse<Hub>>("/api/v1/hubs"),
    placeholderData: keepPreviousData,
  });
}

export function useHubDetail(hubId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.hubs.detail(hubId ?? "none"),
    queryFn: () => apiClient.get<HubDetail>(`/api/v1/hubs/${hubId}`),
    enabled: Boolean(hubId),
    placeholderData: keepPreviousData,
  });
}
