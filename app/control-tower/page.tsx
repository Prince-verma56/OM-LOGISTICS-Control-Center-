import type { Metadata } from "next";
import { Suspense } from "react";
import { ControlTowerWorkspace } from "@/components/control-tower/control-tower-workspace";
import { LoadingState } from "@/components/shared/loading-state";

export const metadata: Metadata = { title: "Control Tower" };

export default function ControlTowerPage() {
  return (
    <Suspense fallback={<LoadingState variant="cards" rows={5} label="Loading control tower" />}>
      <ControlTowerWorkspace />
    </Suspense>
  );
}
