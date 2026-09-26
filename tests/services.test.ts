import { beforeEach, describe, expect, it } from "vitest";
import { getDemoStore, resetDemoStore } from "@/data/store/demo-store";
import { AppError } from "@/lib/server/errors";
import { alertService } from "@/services/alert-service";
import { kpiService } from "@/services/kpi-service";
import { shipmentService } from "@/services/shipment-service";
import { simulationService } from "@/services/simulation-service";

const HEADLINE = "OML123456";

function headline() {
  const store = getDemoStore();
  return store.shipments.get(store.shipmentIdByTracking.get(HEADLINE)!)!;
}

beforeEach(() => {
  resetDemoStore();
});

describe("exception workflow (brain/09 §6, brain/00 §7)", () => {
  async function openException() {
    const list = await alertService.list({ view: "open", status: "OPEN", page: 1, pageSize: 1 });
    return list.data[0];
  }

  it("allows OPEN → IN_PROGRESS → RESOLVED and records an audit trail", async () => {
    const exception = await openException();
    const progressed = await alertService.applyAction(exception.id, { status: "IN_PROGRESS", assignedTo: "usr_ops_002" });
    expect(progressed.exception.status).toBe("IN_PROGRESS");
    expect(progressed.exception.assignedTo).toBe("usr_ops_002");

    const resolved = await alertService.applyAction(exception.id, { status: "RESOLVED", note: "Partner confirmed dispatch." });
    expect(resolved.exception.status).toBe("RESOLVED");
    expect(resolved.exception.resolvedAt).toBeDefined();
    expect(resolved.exception.resolutionNote).toBe("Partner confirmed dispatch.");
    const trail = resolved.audit.map((entry) => `${entry.fromStatus ?? ""}>${entry.toStatus ?? ""}`);
    expect(trail).toEqual(expect.arrayContaining(["OPEN>IN_PROGRESS", "IN_PROGRESS>RESOLVED"]));
  });

  it("rejects invalid transitions and changes to closed exceptions", async () => {
    const exception = await openException();
    await alertService.applyAction(exception.id, { status: "IN_PROGRESS", assignedTo: "usr_ops_001" });
    await expect(alertService.applyAction(exception.id, { status: "OPEN" })).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
      status: 409,
    });
    await alertService.applyAction(exception.id, { status: "DISMISSED", note: "Duplicate." });
    await expect(alertService.applyAction(exception.id, { status: "RESOLVED", note: "x" })).rejects.toBeInstanceOf(AppError);
  });
});

describe("public tracking (brain/07 §11, brain/21)", () => {
  it("returns customer-safe fields only", async () => {
    const view = await shipmentService.getPublicTracking(headline().publicTrackingToken);
    const json = JSON.stringify(view);
    expect(view.trackingNumber).toBe(HEADLINE);
    for (const forbidden of ["customerId", "customerName", "riskLevel", "vehicleNumber", "vehicleId", "shp_", "assignedTo", "resolutionNote"]) {
      expect(json).not.toContain(forbidden);
    }
    // Location is coarsened to ~10 km.
    expect(Number.isInteger(view.latestLocation!.approxLat * 10)).toBe(true);
  });

  it("does not resolve unknown tokens", async () => {
    await expect(shipmentService.getPublicTracking("definitely-not-a-token")).rejects.toMatchObject({ status: 404 });
  });
});

describe("live simulation", () => {
  it("advances the simulated clock and moves vehicles", async () => {
    const store = getDemoStore();
    const before = store.sim.simNowMs;
    const moving = [...store.vehicles.values()].find((vehicle) => vehicle.status === "MOVING" && !store.trips.get(vehicle.id)?.fixtureHold)!;
    const position = [moving.lat, moving.lng];
    await simulationService.step();
    expect(store.sim.simNowMs - before).toBe(store.sim.speed * 3 * 60_000);
    expect([moving.lat, moving.lng]).not.toEqual(position);
  });

  it("keeps the dashboard summary coherent", async () => {
    const summary = await kpiService.getDashboardSummary();
    expect(summary.activeShipments).toBe(500);
    expect(summary.atRiskShipments).toBeGreaterThan(0);
    expect(summary.openExceptions).toBeGreaterThan(0);
  });

  it("traffic scenario: ETA slips ~2h, risk escalates, exception + notifications are raised", async () => {
    const store = getDemoStore();
    const shipment = headline();
    expect(shipment.riskLevel).toBe("LOW");
    const etaBefore = Date.parse(shipment.revisedEtaAt!);

    const result = await simulationService.triggerScenario("TRAFFIC_INCREASE");
    expect(result).toMatchObject({ applied: true, trackingNumber: HEADLINE, vehicleId: "veh_001" });

    expect(Date.parse(shipment.revisedEtaAt!) - etaBefore).toBe(120 * 60_000);
    expect(shipment.riskLevel).toBe("HIGH");
    expect(shipment.delayReason).toContain("Heavy traffic");

    const exceptions = await alertService.listForShipment(shipment.id);
    expect(exceptions.map((item) => item.type)).toEqual(expect.arrayContaining(["TRAFFIC", "DELAY_RISK"]));

    const notifications = store.notifications.filter((item) => item.shipmentId === shipment.id);
    expect(notifications.map((item) => item.template)).toEqual(expect.arrayContaining(["DELAY_NOTICE", "REVISED_ETA"]));
    expect(notifications.find((item) => item.template === "DELAY_NOTICE")?.title).toBe(`Shipment ${HEADLINE} is now at risk.`);
    expect(notifications.every((item) => item.channel === "IN_APP" && item.provider === "DEMO")).toBe(true);
  });

  it("deduplicates repeated notifications for the same event", async () => {
    await simulationService.triggerScenario("TRAFFIC_INCREASE");
    const count = getDemoStore().notifications.filter(
      (item) => item.shipmentId === headline().id && item.template === "DELAY_NOTICE",
    ).length;
    await simulationService.step();
    await simulationService.step();
    expect(
      getDemoStore().notifications.filter((item) => item.shipmentId === headline().id && item.template === "DELAY_NOTICE").length,
    ).toBe(count);
  });
});
