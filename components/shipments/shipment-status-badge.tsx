import { CircleCheck, OctagonAlert, ShieldAlert, TriangleAlert } from "lucide-react";
import { ToneBadge, TONE_ICON } from "@/components/shared/status-dot";
import {
  RISK_LABELS,
  RISK_TONES,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_TONES,
  type RiskLevel,
  type ShipmentStatus,
} from "@/lib/constants/statuses";
import { cn } from "@/lib/utils";

export function ShipmentStatusBadge({ status, className }: { status: ShipmentStatus; className?: string }) {
  return <ToneBadge tone={SHIPMENT_STATUS_TONES[status]} label={SHIPMENT_STATUS_LABELS[status]} className={className} />;
}

const RISK_ICONS = {
  LOW: CircleCheck,
  MEDIUM: ShieldAlert,
  HIGH: TriangleAlert,
  CRITICAL: OctagonAlert,
} as const;

/** Risk = icon + label + colour (never colour alone). */
export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const Icon = RISK_ICONS[level];
  const tone = RISK_TONES[level];
  return (
    <ToneBadge
      tone={tone}
      label={RISK_LABELS[level]}
      icon={<Icon className={cn("size-3", TONE_ICON[tone])} aria-hidden />}
      className={className}
    />
  );
}
