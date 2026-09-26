import { toDayKey } from "@/lib/formatters/date";
import { round } from "@/lib/formatters/number";
import type { KpiSnapshot } from "@/types/kpi";
import type { Rng } from "./prng";

export const KPI_HISTORY_DAYS = 60;

/**
 * Network-level daily KPI history (simulated). The trend shows the pilot
 * effect described in the presentation: proactive alerts improve OTIF and
 * reduce customer queries over time.
 */
export function buildKpiHistory(rng: Rng, nowMs: number): KpiSnapshot[] {
  const history: KpiSnapshot[] = [];
  for (let offset = KPI_HISTORY_DAYS - 1; offset >= 0; offset -= 1) {
    const dayMs = nowMs - offset * 24 * 60 * 60_000;
    const progress = (KPI_HISTORY_DAYS - 1 - offset) / (KPI_HISTORY_DAYS - 1); // 0 → 1
    const weekday = new Date(dayMs).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    history.push({
      date: toDayKey(new Date(dayMs)),
      etaAccuracy: round(Math.min(97.5, 84 + progress * 7.5 + rng.normal(0, 1.2)), 1),
      otif: round(Math.min(98, 88.5 + progress * 5 + rng.normal(0, 1.1) - (weekend ? 0.6 : 0)), 1),
      avgDelayResponseMinutes: Math.max(6, Math.round(42 - progress * 22 + rng.normal(0, 3.5))),
      customerQueries: Math.max(40, Math.round((weekend ? 150 : 225) - progress * 70 + rng.normal(0, 14))),
      avgHubDwellMinutes: Math.max(22, Math.round(58 - progress * 12 + rng.normal(0, 4))),
      routeExceptions: Math.max(2, Math.round(19 - progress * 7 + rng.normal(0, 2.4))),
    });
  }
  return history;
}
