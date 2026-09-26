"use client";

import { useOptionalLiveSimulation } from "./use-live-simulation";

/**
 * The operational "now". In demo mode every timestamp is on the simulated
 * clock, so relative times ("4m ago") are computed against it.
 */
export function useSimNow(fallback?: string): string | undefined {
  const live = useOptionalLiveSimulation();
  return live?.state?.simulatedNow ?? fallback;
}
