import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "@/lib/constants/thresholds";
import { detectRouteDeviation, gpsFreshness, hubDwellSeverity, hubStatusFor, isNoMovement } from "@/lib/intelligence/rules";
import { offsetPoint, pointAlong, toLine } from "@/lib/map/geo";
import { exceptionActionSchema } from "@/lib/validation/exceptions";
import { shipmentListQuerySchema } from "@/lib/validation/shipments";

const line = toLine([
  [77.209, 28.6139],
  [77.6737, 27.4924],
  [78.0081, 27.1767],
]);

describe("route deviation", () => {
  it("does not flag a position on the planned corridor", () => {
    const onRoute = pointAlong(line, 60);
    const result = detectRouteDeviation(onRoute, line, DEFAULT_THRESHOLDS, "2026-09-26T08:00:00Z");
    expect(result.deviated).toBe(false);
    expect(result.distanceFromRouteMeters).toBeLessThan(50);
  });

  it("flags a position beyond the corridor tolerance (brain/13 §2)", () => {
    const off = offsetPoint(pointAlong(line, 60), 90, 3);
    const result = detectRouteDeviation(off, line, DEFAULT_THRESHOLDS, "2026-09-26T08:00:00Z");
    expect(result.deviated).toBe(true);
    expect(result.distanceFromRouteMeters).toBeGreaterThan(DEFAULT_THRESHOLDS.routeDeviationMeters);
  });
});

describe("freshness, dwell and movement rules", () => {
  const now = new Date("2026-09-26T08:00:00Z");
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it("classifies GPS freshness", () => {
    expect(gpsFreshness(minutesAgo(5), now, DEFAULT_THRESHOLDS)).toBe("FRESH");
    expect(gpsFreshness(minutesAgo(25), now, DEFAULT_THRESHOLDS)).toBe("STALE");
    expect(gpsFreshness(minutesAgo(90), now, DEFAULT_THRESHOLDS)).toBe("OFFLINE");
    expect(gpsFreshness("not-a-date", now, DEFAULT_THRESHOLDS)).toBe("UNKNOWN");
  });

  it("escalates hub dwell above the thresholds", () => {
    expect(hubDwellSeverity(30, DEFAULT_THRESHOLDS)).toBe("NONE");
    expect(hubDwellSeverity(60, DEFAULT_THRESHOLDS)).toBe("WARNING");
    expect(hubDwellSeverity(95, DEFAULT_THRESHOLDS)).toBe("HIGH");
  });

  it("derives hub load status", () => {
    expect(hubStatusFor(10, 35)).toBe("NORMAL");
    expect(hubStatusFor(50, 35)).toBe("BUSY");
    expect(hubStatusFor(10, 95)).toBe("CONGESTED");
  });

  it("detects no movement beyond the threshold", () => {
    expect(isNoMovement(20, DEFAULT_THRESHOLDS)).toBe(false);
    expect(isNoMovement(45, DEFAULT_THRESHOLDS)).toBe(true);
  });
});

describe("input validation (Zod)", () => {
  it("rejects invalid shipment filters", () => {
    expect(shipmentListQuerySchema.safeParse({ status: "LOST" }).success).toBe(false);
    expect(shipmentListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
    const parsed = shipmentListQuerySchema.parse({ page: "2", riskLevel: "HIGH" });
    expect(parsed).toMatchObject({ page: 2, pageSize: 25, riskLevel: "HIGH", scope: "active" });
  });

  it("requires a note to close and an owner to progress an exception", () => {
    expect(exceptionActionSchema.safeParse({ status: "RESOLVED" }).success).toBe(false);
    expect(exceptionActionSchema.safeParse({ status: "RESOLVED", note: "Rerouted via NH44" }).success).toBe(true);
    expect(exceptionActionSchema.safeParse({ status: "IN_PROGRESS" }).success).toBe(false);
    expect(exceptionActionSchema.safeParse({ status: "IN_PROGRESS", assignedTo: "usr_ops_001" }).success).toBe(true);
  });
});
