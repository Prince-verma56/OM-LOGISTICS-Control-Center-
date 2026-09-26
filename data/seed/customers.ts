import type { CustomerRecord } from "@/data/store/types";
import { HUB_DEFINITIONS } from "./geography";
import type { Rng } from "./prng";

/**
 * 25 fictional demo customers. Names are invented for the prototype and do not
 * represent real OM Logistics customers.
 */
const CUSTOMERS: ReadonlyArray<{ name: string; segment: string }> = [
  { name: "Aarav Pharma Distributors", segment: "Pharma" },
  { name: "Kaveri Electronics", segment: "Electronics" },
  { name: "Nirmala Textiles", segment: "Textiles" },
  { name: "Sahyadri Agro Foods", segment: "FMCG" },
  { name: "Tarang Auto Components", segment: "Automotive" },
  { name: "Ganga Consumer Goods", segment: "FMCG" },
  { name: "Deccan Steel Traders", segment: "Industrial" },
  { name: "Meru Healthcare Supplies", segment: "Pharma" },
  { name: "Brahmaputra Tea Traders", segment: "FMCG" },
  { name: "Vindhya Cement Works", segment: "Industrial" },
  { name: "Sagarika Home Appliances", segment: "Electronics" },
  { name: "Saraswati Publishing House", segment: "Retail" },
  { name: "Konark Furniture Co.", segment: "Retail" },
  { name: "Narmada Speciality Chemicals", segment: "Chemicals" },
  { name: "Pinnacle Fresh Dairy", segment: "Cold chain" },
  { name: "Indus Digital Fulfilment", segment: "E-commerce" },
  { name: "Vaigai Garments", segment: "Textiles" },
  { name: "Aravalli Paints", segment: "Industrial" },
  { name: "Sunderban Seafood Exports", segment: "Cold chain" },
  { name: "Nilgiri Spices & Condiments", segment: "FMCG" },
  { name: "Satpura Power Equipment", segment: "Industrial" },
  { name: "Kosi Agri Inputs", segment: "Agri" },
  { name: "Periyar Rubber Products", segment: "Industrial" },
  { name: "Thar Solar Components", segment: "Energy" },
  { name: "Godavari Packaging Solutions", segment: "Packaging" },
];





export function buildCustomers(rng: Rng): CustomerRecord[] {
  const hubWeights = HUB_DEFINITIONS.map((hub) => hub.weight);
  return CUSTOMERS.map((customer, index) => ({
    id: `cus_${String(index + 1).padStart(3, "0")}`,
    name: customer.name,
    segment: customer.segment,
    homeHubId: rng.weighted(HUB_DEFINITIONS, hubWeights).id,
  }));
}
