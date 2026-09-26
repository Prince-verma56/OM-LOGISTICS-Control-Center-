"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CircleCheck, Clock3, MapPin, PackageSearch, RefreshCw, TriangleAlert, Truck } from "lucide-react";
import { useRef } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import { DemoBadge } from "@/components/shared/demo-badge";
import { ShipmentTimeline } from "@/components/shipments/shipment-timeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicTracking } from "@/hooks/use-shipments";
import { ApiError } from "@/lib/api/client";
import { SHIPMENT_STATUS_LABELS } from "@/lib/constants/statuses";
import { formatDateTime, formatDuration, formatShortDate, formatTime } from "@/lib/formatters/date";
import { cn } from "@/lib/utils";
import type { PublicTrackingView } from "@/types/shipment";

gsap.registerPlugin(useGSAP);

function JourneyProgress({ data }: { data: PublicTrackingView }) {
  const scope = useRef<HTMLDivElement>(null);
  const progress = Math.max(2, Math.min(100, data.progressPct));

  // GSAP timeline: the route fills and the truck travels to the current
  // progress, then milestones reveal in sequence. Reduced motion → no tween.
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
        timeline
          .fromTo(".journey-fill", { width: "0%" }, { width: `${progress}%`, duration: 1.1 })
          .fromTo(".journey-truck", { left: "0%" }, { left: `${progress}%`, duration: 1.1 }, "<")
          .fromTo(".journey-milestones li", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.07 }, "-=0.5");
      });
      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".journey-fill", { width: `${progress}%` });
        gsap.set(".journey-truck", { left: `${progress}%` });
      });
      return () => media.revert();
    },
    { scope, dependencies: [progress] },
  );

  return (
    <div ref={scope} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>{data.origin}</span>
          <span>{data.destination}</span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Journey progress">
          <div className="journey-fill absolute inset-y-0 left-0 rounded-full bg-[#1f4fb8]" style={{ width: `${progress}%` }} />
          <div
            className="journey-truck absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#1f4fb8] text-white shadow-md"
            style={{ left: `${progress}%` }}
          >
            <Truck className="size-3.5" aria-hidden />
          </div>
        </div>
        <span className="text-right text-[11px] text-slate-500">{data.progressPct}% of the journey complete</span>
      </div>
      <ShipmentTimeline milestones={data.timeline} className="journey-milestones" />
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading tracking details">
      <Skeleton className="h-8 w-40 bg-slate-200" />
      <Skeleton className="h-36 w-full rounded-2xl bg-slate-200" />
      <Skeleton className="h-72 w-full rounded-2xl bg-slate-200" />
    </div>
  );
}

/**
 * Customer tracking (brain/08 §9). Shows only customer-safe fields: no
 * internal IDs, risk metadata, exception notes, vehicle or driver data.
 */
export function CustomerTrackingView({ token }: { token: string }) {
  const tracking = usePublicTracking(token);
  const data = tracking.data;
  const delivered = data?.status === "DELIVERED";
  const late = data ? data.delayMinutes >= 15 && !delivered : false;
  const eta = data ? (data.deliveredAt ?? data.revisedEtaAt ?? data.originalEtaAt) : undefined;

  return (
    <div className="min-h-dvh bg-[#f4f6fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-xl items-center gap-2.5 px-4 py-3">
          <BrandMark className="bg-[#1f4fb8] text-white" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">OM Logistics</span>
            <span className="text-[11px] text-slate-500">Shipment tracking</span>
          </div>
          <DemoBadge compact className="ml-auto border-amber-300 bg-amber-50 text-amber-900" />
        </div>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-5">
        {tracking.isPending ? (
          <TrackingSkeleton />
        ) : tracking.isError || !data ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <PackageSearch className="size-8 text-slate-400" aria-hidden />
            <h1 className="text-lg font-semibold">
              {tracking.error instanceof ApiError && tracking.error.status === 404
                ? "We couldn't find this shipment"
                : "Tracking is temporarily unavailable"}
            </h1>
            <p className="text-sm text-slate-500">
              {tracking.error instanceof ApiError && tracking.error.status === 404
                ? "The tracking link may be incomplete or expired. Please check the link you received."
                : "Please try again in a moment."}
            </p>
            <Button variant="outline" size="sm" onClick={() => void tracking.refetch()}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Shipment status">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Tracking number</span>
                  <h1 className="font-mono text-xl font-semibold tracking-tight">{data.trackingNumber}</h1>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    delivered ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-blue-50 text-[#1f4fb8] ring-1 ring-blue-200",
                  )}
                >
                  {SHIPMENT_STATUS_LABELS[data.status]}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-500">{delivered ? "Delivered" : "Estimated delivery"}</span>
                <span className="text-3xl font-semibold tracking-tight">{formatTime(eta)}</span>
                <span className="text-sm text-slate-600">{formatShortDate(eta)}</span>
              </div>

              {late && (
                <div className="flex gap-2.5 rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-amber-900">Running about {formatDuration(data.delayMinutes)} late</span>
                    <span className="text-amber-800">
                      {data.delayReason ?? "Your shipment is behind schedule."} Originally expected {formatDateTime(data.originalEtaAt)}.
                    </span>
                  </div>
                </div>
              )}
              {delivered && (
                <div className="flex gap-2.5 rounded-xl bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                  <span className="text-emerald-900">Delivered in {data.destination} on {formatDateTime(data.deliveredAt)}.</span>
                </div>
              )}

              {data.latestLocation && !delivered && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <div className="flex flex-col">
                    <span className="font-medium">{data.latestLocation.label}</span>
                    <span className="text-xs text-slate-500">Approximate location · {formatDateTime(data.latestLocation.recordedAt)}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Journey">
              <h2 className="mb-4 text-sm font-semibold">Journey</h2>
              <JourneyProgress data={data} />
            </section>

            <footer className="flex flex-col items-center gap-1 pb-6 text-center text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3" aria-hidden />
                Last updated {formatDateTime(data.lastUpdatedAt)} IST · refreshes automatically
              </span>
              <span>Demonstration page — shipment data is simulated.</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
