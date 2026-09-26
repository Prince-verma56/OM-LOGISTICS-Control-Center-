import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { LoadingState } from "@/components/shared/loading-state";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingState variant="cards" rows={6} label="Loading analytics" />}>
      <AnalyticsView />
    </Suspense>
  );
}
