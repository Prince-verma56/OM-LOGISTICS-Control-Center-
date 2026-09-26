import type { Metadata } from "next";
import { ShipmentDetailView } from "@/components/shipments/shipment-detail-view";

export const metadata: Metadata = { title: "Shipment detail" };

export default async function ShipmentDetailPage({ params }: PageProps<"/shipments/[shipmentId]">) {
  const { shipmentId } = await params;
  return <ShipmentDetailView shipmentId={shipmentId} />;
}
