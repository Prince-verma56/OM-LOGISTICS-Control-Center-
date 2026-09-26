import { getDemoStore } from "@/data/store/demo-store";
import type { DashboardBaseline } from "@/data/store/types";
import type { AnalyticsRepository, HubRepository } from "./types";

/** Hub repository backed by the in-memory demo store. */
export class DummyHubRepository implements HubRepository {
  async list() {
    return [...getDemoStore().hubs.values()];
  }

  async getById(id: string) {
    return getDemoStore().hubs.get(id);
  }
}

/** KPI history + dashboard baseline (simulated analytics warehouse). */
export class DummyAnalyticsRepository implements AnalyticsRepository {
  async listKpiHistory() {
    return [...getDemoStore().kpiHistory];
  }

  async getBaseline() {
    return getDemoStore().baseline;
  }

  async setBaseline(baseline: DashboardBaseline) {
    getDemoStore().baseline = baseline;
  }
}
