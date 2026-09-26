export interface DashboardSummary {
  generatedAt: string;
  activeShipments: number;
  vehiclesInTransit: number;
  atRiskShipments: number;
  onTimeDeliveryPct: number;
  openExceptions: number;

  /** Change since the simulation baseline (last reset), per KPI. */
  deltas: {
    activeShipments: number;
    vehiclesInTransit: number;
    atRiskShipments: number;
    onTimeDeliveryPct: number;
    openExceptions: number;
  };
  /** Supporting counts for tooltips. */
  breakdown: {
    criticalShipments: number;
    criticalExceptions: number;
    deliveredLast30Days: number;
    totalVehicles: number;
  };
}

/** brain/04_DATA_MODEL.md §10 */
export interface KpiSnapshot {
  date: string;
  etaAccuracy: number;
  otif: number;
  avgDelayResponseMinutes: number;
  customerQueries: number;
  avgHubDwellMinutes: number;
  routeExceptions: number;
}

export type KpiKey = Exclude<keyof KpiSnapshot, "date">;

export interface AnalyticsKpis {
  generatedAt: string;
  range: { from: string; to: string; days: number };
  current: KpiSnapshot;
  previous: KpiSnapshot;
  trend: KpiSnapshot[];
  exceptionsByType: Array<{ type: string; label: string; count: number }>;
  isSimulated: true;
}
