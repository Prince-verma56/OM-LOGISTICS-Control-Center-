import { ToneBadge } from "@/components/shared/status-dot";
import {
  DATA_FRESHNESS_LABELS,
  DATA_FRESHNESS_TONES,
  EXCEPTION_SEVERITY_LABELS,
  EXCEPTION_SEVERITY_TONES,
  EXCEPTION_STATUS_LABELS,
  EXCEPTION_STATUS_TONES,
  HUB_STATUS_LABELS,
  HUB_STATUS_TONES,
  TRAFFIC_STATE_LABELS,
  TRAFFIC_STATE_TONES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONES,
  type DataFreshness,
  type ExceptionSeverity,
  type ExceptionStatus,
  type HubStatus,
  type TrafficState,
  type VehicleStatus,
} from "@/lib/constants/statuses";

export const SeverityBadge = ({ severity, className }: { severity: ExceptionSeverity; className?: string }) => (
  <ToneBadge tone={EXCEPTION_SEVERITY_TONES[severity]} label={EXCEPTION_SEVERITY_LABELS[severity]} className={className} />
);

export const ExceptionStatusBadge = ({ status, className }: { status: ExceptionStatus; className?: string }) => (
  <ToneBadge tone={EXCEPTION_STATUS_TONES[status]} label={EXCEPTION_STATUS_LABELS[status]} className={className} />
);

export const HubStatusBadge = ({ status, className }: { status: HubStatus; className?: string }) => (
  <ToneBadge tone={HUB_STATUS_TONES[status]} label={HUB_STATUS_LABELS[status]} className={className} />
);

export const VehicleStatusBadge = ({ status, className }: { status: VehicleStatus; className?: string }) => (
  <ToneBadge tone={VEHICLE_STATUS_TONES[status]} label={VEHICLE_STATUS_LABELS[status]} className={className} />
);

export const FreshnessBadge = ({ freshness, className }: { freshness: DataFreshness; className?: string }) => (
  <ToneBadge tone={DATA_FRESHNESS_TONES[freshness]} label={`GPS ${DATA_FRESHNESS_LABELS[freshness].toLowerCase()}`} className={className} />
);

export const TrafficBadge = ({ state, className }: { state: TrafficState; className?: string }) => (
  <ToneBadge tone={TRAFFIC_STATE_TONES[state]} label={TRAFFIC_STATE_LABELS[state]} className={className} />
);
