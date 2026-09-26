import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

// Each test file runs in its own worker, so config is parsed fresh here.
beforeAll(() => {
  process.env.DEMO_MODE = "false";
});

describe("DEMO_MODE guard (brain/10 §10)", () => {
  it("disables demo-only endpoints when DEMO_MODE=false", async () => {
    const simulation = await import("@/app/api/v1/simulation/route");
    const notificationTest = await import("@/app/api/v1/notifications/test/route");

    const state = await simulation.GET(new NextRequest("http://localhost/api/v1/simulation"));
    expect(state.status).toBe(403);
    expect((await state.json()).error.code).toBe("DEMO_MODE_REQUIRED");

    const test = await notificationTest.POST(
      new NextRequest("http://localhost/api/v1/notifications/test", { method: "POST", body: "{}" }),
    );
    expect(test.status).toBe(403);
  });

  it("keeps read APIs available with a request id", async () => {
    const summary = await import("@/app/api/v1/dashboard/summary/route");
    const response = await summary.GET(new NextRequest("http://localhost/api/v1/dashboard/summary"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(/^req_/);
  });
});
