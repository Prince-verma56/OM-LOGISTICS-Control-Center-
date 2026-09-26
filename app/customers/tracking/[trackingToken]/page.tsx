import type { Metadata } from "next";
import { CustomerTrackingView } from "@/components/tracking/customer-tracking-view";

export const metadata: Metadata = {
  title: "Track your shipment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function CustomerTrackingPage({ params }: PageProps<"/customers/tracking/[trackingToken]">) {
  const { trackingToken } = await params;
  return <CustomerTrackingView token={trackingToken} />;
}
