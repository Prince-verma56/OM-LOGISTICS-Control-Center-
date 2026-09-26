"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False on the server and during hydration, true afterwards. Used to keep
 * client-fetched views out of SSR so shared query caches can never cause a
 * hydration mismatch between independently hydrating Suspense boundaries.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
