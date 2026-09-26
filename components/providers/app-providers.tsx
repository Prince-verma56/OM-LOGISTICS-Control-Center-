"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { createContext, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { shouldRetry } from "@/lib/api/client";
import type { PublicAppConfig } from "@/lib/config/app";

export const PublicConfigContext = createContext<PublicAppConfig>({
  demoMode: true,
  simulationEnabled: true,
  mapProvider: "demo",
  realtimeTransport: "sse",
});

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}

function getQueryClient() {
  // Isolated per server render; one shared client in the browser.
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/**
 * Root client providers: theme, server-state cache, motion preferences,
 * tooltips and the Sonner toaster. The customer tracking page is forced to
 * the light theme.
 */
export function AppProviders({ children, config }: { children: ReactNode; config: PublicAppConfig }) {
  const pathname = usePathname();
  const forcedTheme = pathname?.startsWith("/customers") ? "light" : undefined;
  const [queryClient] = useState(getQueryClient);

  return (
    <PublicConfigContext value={config}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme={forcedTheme} disableTransitionOnChange>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <MotionConfig reducedMotion="user">
              <TooltipProvider delayDuration={250}>
                {children}
                <Toaster position="bottom-right" visibleToasts={4} closeButton gap={10} />
              </TooltipProvider>
            </MotionConfig>
          </QueryClientProvider>
        </SessionProvider>
      </ThemeProvider>
    </PublicConfigContext>
  );
}
