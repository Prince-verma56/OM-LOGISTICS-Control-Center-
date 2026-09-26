import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/shared/loading-state";
import { ShipmentsDirectory } from "@/components/shipments/shipments-directory";

export const metadata: Metadata = { title: "Shipments" };

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<LoadingState variant="rows" rows={10} label="Loading shipments" />}>
      <ShipmentsDirectory />
    </Suspense>
  );
}
