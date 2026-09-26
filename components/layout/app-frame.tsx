"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "./app-shell";

/**
 * Chooses the chrome for a route: the customer tracking experience is a
 * standalone, public page; everything else is the operator console.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/customers")) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
