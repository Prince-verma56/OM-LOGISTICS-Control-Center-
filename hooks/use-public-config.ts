"use client";

import { useContext } from "react";
import { PublicConfigContext } from "@/components/providers/app-providers";

/** Browser-safe configuration (demo mode, map provider, realtime transport). */
export function usePublicConfig() {
  return useContext(PublicConfigContext);
}
