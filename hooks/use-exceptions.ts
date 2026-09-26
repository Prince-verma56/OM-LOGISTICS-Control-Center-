"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, type QueryParams } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { EXCEPTION_STATUS_LABELS } from "@/lib/constants/statuses";
import type { ExceptionActionInput, PaginatedResponse } from "@/types/api";
import type { ExceptionDetail, ExceptionListItem } from "@/types/exception";

export function useExceptions(params: QueryParams) {
  return useQuery({
    queryKey: queryKeys.exceptions.list(params),
    queryFn: () => apiClient.get<PaginatedResponse<ExceptionListItem>>("/api/v1/exceptions", params),
    placeholderData: keepPreviousData,
  });
}

export function useExceptionDetail(exceptionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.exceptions.detail(exceptionId ?? "none"),
    queryFn: () => apiClient.get<ExceptionDetail>(`/api/v1/exceptions/${exceptionId}`),
    enabled: Boolean(exceptionId),
  });
}

/** Assign / progress / resolve an exception (PATCH — never auto-retried). */
export function useExceptionAction(exceptionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExceptionActionInput) =>
      apiClient.patch<ExceptionDetail>(`/api/v1/exceptions/${exceptionId}`, input),
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.exceptions.detail(detail.exception.id), detail);
      void queryClient.invalidateQueries({ queryKey: queryKeys.exceptions.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.hubs.all });
      toast.success(`Exception ${EXCEPTION_STATUS_LABELS[detail.exception.status].toLowerCase()}`, {
        description: detail.exception.title,
      });
    },
  });
}
