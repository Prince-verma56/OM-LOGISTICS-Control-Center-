"use client";

import type { ReactNode } from "react";
import { LiveSimulationContext, useLiveSimulationController } from "@/hooks/use-live-simulation";

/** Mounts one realtime connection for the whole operator console. */
export function LiveSimulationProvider({ children }: { children: ReactNode }) {
  const value = useLiveSimulationController();
  return <LiveSimulationContext value={value}>{children}</LiveSimulationContext>;
}
