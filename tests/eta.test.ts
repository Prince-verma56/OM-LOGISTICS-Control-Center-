import { describe, expect, it } from "vitest";
import { classifyRisk, computeEta } from "@/lib/intelligence/eta";
import type { EtaInput } from "@/types/eta";

const now = new Date("2026-09-26T08:00:00.000Z");

function input(overrides: Partial<EtaInput> = {}): EtaInput {
  return {
    shipmentId: "shp_10001",
    now,
    originalEtaAt: "2026-09-26T14:15:00.000Z",
    promisedDeliveryAt: "2026-09-26T15:45:00.000Z",
    remainingKm: 225,
    remainingHubStops: 0,
    currentHubDwellMinutes: 0,
    currentHubRemainingMinutes: 0,
    trafficDelayMinutes: 0,
    stationaryMinutes: 0,
    historicalFactor: 1,
    deviationDetourMinutes: 0,
    inLastMile: false,
    lastMileRemainingMinutes: 0,
    awaitingPickup: false,
    plannedDurationMinutes: 1800,
    dataFreshnessAt: now.toISOString(),
    ...overrides,
  };
}

describe("computeEta", () => {
  it("is deterministic for the same inputs (brain/13 §2)", () => {
    expect(computeEta(input())).toEqual(computeEta(input()));
  });

  it("predicts remaining drive at plan speed plus last-mile allowance", () => {
    const prediction = computeEta(input());
    // 225 km @ 45 km/h = 300 min + 75 min last mile.
    expect(Date.parse(prediction.predictedEtaAt) - now.getTime()).toBe(375 * 60_000);
    expect(prediction.delayMinutes).toBe(0);
    expect(prediction.riskLevel).toBe("LOW");
    expect(prediction.explanation).toBe("On plan.");
  });

  it("adds traffic impact and escalates risk when the promise is breached", () => {
    const prediction = computeEta(input({ trafficDelayMinutes: 120 }));
    expect(prediction.delayMinutes).toBe(120);
    expect(prediction.bufferMinutes).toBe(-30);
    expect(prediction.riskLevel).toBe("HIGH");
    expect(prediction.factors.find((factor) => factor.key === "traffic")?.impactMinutes).toBe(120);
    expect(prediction.explanation).toContain("Heavy traffic detected");
    expect(prediction.confidence).toBeLessThan(computeEta(input()).confidence);
  });

  it("uses the planned line-haul while awaiting pickup", () => {
    const prediction = computeEta(
      input({ awaitingPickup: true, scheduledPickupAt: "2026-09-26T09:00:00.000Z", plannedDurationMinutes: 600 }),
    );
    expect(Date.parse(prediction.predictedEtaAt) - now.getTime()).toBe((60 + 600 + 75) * 60_000);
  });

  it("marks stale data with lower confidence", () => {
    const fresh = computeEta(input());
    const stale = computeEta(input({ dataFreshnessAt: new Date(now.getTime() - 90 * 60_000).toISOString() }));
    expect(stale.confidence).toBeLessThan(fresh.confidence);
  });
});

describe("classifyRisk (brain/20 §5)", () => {
  it.each([
    [240, "LOW"],
    [90, "LOW"],
    [89, "MEDIUM"],
    [0, "MEDIUM"],
    [-1, "HIGH"],
    [-180, "HIGH"],
    [-181, "CRITICAL"],
  ] as const)("buffer %i min → %s", (buffer, expected) => {
    expect(classifyRisk(buffer)).toBe(expected);
  });
});
