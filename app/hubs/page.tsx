import type { Metadata } from "next";
import { HubsView } from "@/components/hubs/hubs-view";

export const metadata: Metadata = { title: "Hubs" };

export default function HubsPage() {
  return <HubsView />;
}
