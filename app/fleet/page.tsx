import type { Metadata } from "next";
import { Suspense } from "react";
import { FleetView } from "@/components/fleet/fleet-view";
import { LoadingState } from "@/components/shared/loading-state";

export const metadata: Metadata = { title: "Fleet" };

export default function FleetPage() {
  return (
    <Suspense fallback={<LoadingState variant="rows" rows={10} label="Loading fleet" />}>
      <FleetView />
    </Suspense>
  );
}
