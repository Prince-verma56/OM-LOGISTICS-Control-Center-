import type { Metadata } from "next";
import { Suspense } from "react";
import { ExceptionsView } from "@/components/exceptions/exceptions-view";
import { LoadingState } from "@/components/shared/loading-state";

export const metadata: Metadata = { title: "Exception center" };

export default function ExceptionsPage() {
  return (
    <Suspense fallback={<LoadingState variant="rows" rows={10} label="Loading exceptions" />}>
      <ExceptionsView />
    </Suspense>
  );
}
