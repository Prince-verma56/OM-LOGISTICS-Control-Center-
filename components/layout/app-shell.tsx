"use client";

import type { ReactNode } from "react";
import { LiveSimulationProvider } from "@/components/providers/live-simulation-provider";
import { LoadingState } from "@/components/shared/loading-state";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useHydrated } from "@/hooks/use-hydrated";
import { AppSidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Operator console chrome: sidebar + topbar + main content, with one realtime connection. */
export function AppShell({ children }: { children: ReactNode }) {
  // Views are client-fetched; rendering them after hydration keeps SSR output
  // deterministic (skeleton) regardless of query timing.
  const hydrated = useHydrated();
  return (
    <LiveSimulationProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <Topbar />
          <main id="main-content" className="flex min-w-0 flex-1 flex-col p-3 md:p-5">
            {hydrated ? children : <LoadingState variant="cards" rows={5} label="Loading view" />}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </LiveSimulationProvider>
  );
}
