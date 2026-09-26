import { describe, expect, it } from "vitest";
import { generateDemoDataset } from "@/data/seed";
import { DEFAULT_THRESHOLDS } from "@/lib/constants/thresholds";

const options = {
  seed: 20_260_926,
  anchorMs: Date.parse("2026-09-26T06:45:00Z"),
  trackingSecret: "test-secret",
  thresholds: DEFAULT_THRESHOLDS,
  simulation: { running: false, speed: 5 as const },
};

describe("demo dataset (brain/18)", () => {
  const dataset = generateDemoDataset(options);
  const shipments = [...dataset.shipments.values()];
  const active = shipments.filter((shipment) => shipment.status !== "DELIVERED");
  const delivered = shipments.filter((shipment) => shipment.status === "DELIVERED");

  it("is deterministic for the same seed and anchor (brain/13 §4)", () => {
    const again = generateDemoDataset(options);
    expect(JSON.stringify([...again.shipments.values()])).toBe(JSON.stringify(shipments));
    expect(JSON.stringify([...again.exceptions.values()])).toBe(JSON.stringify([...dataset.exceptions.values()]));
  });

  it("meets the seed volumes", () => {
    expect(dataset.customers.size).toBeGreaterThanOrEqual(25);
    expect(dataset.vehicles.size).toBe(100);
    expect(dataset.hubs.size).toBe(20);
    expect(active).toHaveLength(500);
    expect(delivered).toHaveLength(150);
    expect([...dataset.events.values()].flat().length).toBeGreaterThanOrEqual(2000);
    expect([...dataset.gps.values()].flat().length).toBeGreaterThanOrEqual(5000);
    expect(dataset.exceptions.size).toBe(100);
    expect(dataset.notifications.length).toBe(300);
  });

  it("keeps statuses consistent with timestamps", () => {
    for (const shipment of delivered) expect(shipment.deliveredAt).toBeDefined();
    for (const shipment of active) expect(shipment.deliveredAt).toBeUndefined();
    for (const shipment of active.filter((item) => item.status !== "ORDER_BOOKED")) {
      expect(shipment.vehicleId).toBeDefined();
      expect(Date.parse(shipment.bookedAt)).toBeLessThan(Date.parse(shipment.pickedUpAt!));
    }
  });

  it("contains the six required demo scenarios", () => {
    const byTracking = (trackingNumber: string) => shipments.find((item) => item.trackingNumber === trackingNumber);
    const headline = byTracking("OML123456");
    expect(headline).toMatchObject({ status: "IN_TRANSIT", origin: "Kolkata", destination: "Delhi", vehicleNumber: "DL01AB1234" });
    expect(headline?.locationLabel).toContain("Agra");
    expect(byTracking("OML100001")?.riskLevel).toBe("LOW");
    expect(byTracking("OML100003")?.status).toBe("HUB_REACHED");
    expect(byTracking("OML100006")?.status).toBe("DELIVERED");
    const openTypes = new Set(
      [...dataset.exceptions.values()].filter((item) => item.status === "OPEN").map((item) => item.type),
    );
    for (const type of ["HUB_DWELL", "ROUTE_DEVIATION", "NO_MOVEMENT"] as const) expect(openTypes.has(type)).toBe(true);
  });

  it("issues unique, opaque public tracking tokens", () => {
    const tokens = new Set(shipments.map((shipment) => shipment.publicTrackingToken));
    expect(tokens.size).toBe(shipments.length);
    for (const shipment of shipments.slice(0, 50)) {
      expect(shipment.publicTrackingToken).toMatch(/^[A-Za-z0-9_-]{24}$/);
      expect(shipment.publicTrackingToken).not.toContain(shipment.id);
      expect(shipment.publicTrackingToken).not.toContain(shipment.trackingNumber);
    }
  });
});
