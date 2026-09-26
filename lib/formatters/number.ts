const integerFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimalFormat = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const compactFormat = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatNumber(value: number): string {
  return integerFormat.format(value);
}

export function formatCompact(value: number): string {
  return Math.abs(value) < 10_000 ? integerFormat.format(value) : compactFormat.format(value);
}

/** 93.4 → "93.4%" */
export function formatPercent(value: number, decimals = 1): string {
  return decimals === 0 ? `${integerFormat.format(value)}%` : `${oneDecimalFormat.format(value)}%`;
}

export function formatKm(value: number): string {
  return `${integerFormat.format(Math.round(value))} km`;
}

export function formatSpeed(kph: number | undefined): string {
  return kph === undefined ? "—" : `${Math.round(kph)} km/h`;
}

/** "+3", "−2", "0" — uses a true minus sign. */
export function formatSigned(value: number, decimals = 0): string {
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return "0";
  const magnitude = decimals === 0 ? integerFormat.format(Math.abs(rounded)) : Math.abs(rounded).toFixed(decimals);
  return rounded > 0 ? `+${magnitude}` : `−${magnitude}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
