"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { AnalyticsKpis } from "@/types/kpi";

export function useAnalytics(params: QueryParams) {
  return useQuery({
    queryKey: queryKeys.analytics.kpis(params),
    queryFn: () => apiClient.get<AnalyticsKpis>("/api/v1/analytics/kpis", params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
