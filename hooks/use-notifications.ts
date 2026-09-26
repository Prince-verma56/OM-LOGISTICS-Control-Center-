"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { CollectionResponse } from "@/types/api";
import type { DemoNotification } from "@/types/notification";

/** Notification center feed; new items are prepended live by the realtime client. */
export function useNotificationFeed() {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => apiClient.get<CollectionResponse<DemoNotification>>("/api/v1/notifications", { limit: 60 }),
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Read / unread state (per browser, localStorage)                            */
/* -------------------------------------------------------------------------- */

interface ReadState {
  readBefore?: string;
  readIds: string[];
}

const STORAGE_KEY = "om-ct:notifications:read";
const listeners = new Set<() => void>();
let snapshot: ReadState | undefined;

function load(): ReadState {
  if (snapshot) return snapshot;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    snapshot = raw ? (JSON.parse(raw) as ReadState) : { readIds: [] };
  } catch {
    snapshot = { readIds: [] };
  }
  return snapshot;
}

function save(next: ReadState) {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode) — keep in memory.
  }
  listeners.forEach((listener) => listener());
}

const EMPTY: ReadState = { readIds: [] };

/** Called on demo reset — the simulated clock restarts, so read markers no longer apply. */
export function clearNotificationReadState() {
  save({ readIds: [] });
}

export function useNotificationReadState() {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    () => EMPTY,
  );

  const isRead = useCallback(
    (notification: DemoNotification) =>
      (state.readBefore !== undefined && notification.createdAt <= state.readBefore) ||
      state.readIds.includes(notification.id),
    [state],
  );

  const markRead = useCallback(
    (id: string) => {
      const current = load();
      if (current.readIds.includes(id)) return;
      save({ ...current, readIds: [...current.readIds, id].slice(-300) });
    },
    [],
  );

  const markAllRead = useCallback((latestCreatedAt: string | undefined) => {
    if (!latestCreatedAt) return;
    save({ readBefore: latestCreatedAt, readIds: [] });
  }, []);

  return { isRead, markRead, markAllRead };
}
