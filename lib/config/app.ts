import { z } from "zod";
import { DEMO_CONFIG } from "@/config/demo";
import { DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/constants/thresholds";
import type { SimulationSpeed } from "@/types/realtime";

/**
 * Server-side application configuration, parsed from environment variables.
 * See .env.example and brain/23_ENVIRONMENT_CONFIG.md.
 *
 * Never import this module into client components — use `PublicAppConfig`
 * (serialized by the root layout) instead.
 */

const booleanFlag = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === "") return fallback;
      return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    });

const optionalPositiveInt = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined || value.trim() === "") return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEMO_MODE: booleanFlag(true),
  SIMULATION_ENABLED: booleanFlag(true),
  SIMULATION_SPEED: optionalPositiveInt,
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  MAP_PROVIDER: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() ? value.trim().toLowerCase() : "demo")),
  MAP_API_KEY: z.string().optional(),
  NOTIFICATION_PROVIDER_MODE: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() ? value.trim() : "in_app_demo")),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  REALTIME_TRANSPORT: z
    .string()
    .optional()
    .transform((value) => (value?.trim().toLowerCase() === "polling" ? "polling" : "sse")),
  STALE_GPS_MINUTES: optionalPositiveInt,
  NO_MOVEMENT_MINUTES: optionalPositiveInt,
  HUB_DWELL_WARNING_MINUTES: optionalPositiveInt,
  HUB_DWELL_CRITICAL_MINUTES: optionalPositiveInt,
  ROUTE_DEVIATION_METERS: optionalPositiveInt,
  ETA_NOTIFICATION_DELTA_MINUTES: optionalPositiveInt,
});

export type RealtimeTransport = "sse" | "polling";

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  demoMode: boolean;
  simulationEnabled: boolean;
  simulationSpeed: SimulationSpeed;
  databaseUrl?: string;
  /** Secret used to derive opaque public tracking tokens. */
  trackingTokenSecret: string;
  mapProvider: string;
  notificationProviderMode: string;
  appUrl?: string;
  realtimeTransport: RealtimeTransport;
  thresholds: Thresholds;
}

/** Subset that is safe to hand to the browser. */
export interface PublicAppConfig {
  demoMode: boolean;
  simulationEnabled: boolean;
  mapProvider: string;
  realtimeTransport: RealtimeTransport;
  appUrl?: string;
}

const DEMO_TRACKING_SECRET = "om-control-tower-demo-tracking-secret";

function nearestSpeed(value: number | undefined): SimulationSpeed {
  if (!value) return DEMO_CONFIG.defaultSpeed;
  return DEMO_CONFIG.speeds.reduce<SimulationSpeed>(
    (best, speed) => (Math.abs(speed - value) < Math.abs(best - value) ? speed : best),
    DEMO_CONFIG.speeds[0],
  );
}

let cached: AppConfig | undefined;

export function getAppConfig(): AppConfig {
  if (cached) return cached;
  const env = envSchema.parse(process.env);

  cached = {
    nodeEnv: env.NODE_ENV,
    demoMode: env.DEMO_MODE,
    simulationEnabled: env.SIMULATION_ENABLED,
    simulationSpeed: nearestSpeed(env.SIMULATION_SPEED),
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    // Outside demo mode a real secret is required; demo mode may fall back.
    trackingTokenSecret: env.AUTH_SECRET?.trim() || (env.DEMO_MODE ? DEMO_TRACKING_SECRET : ""),
    mapProvider: env.MAP_PROVIDER,
    notificationProviderMode: env.NOTIFICATION_PROVIDER_MODE,
    appUrl: env.NEXT_PUBLIC_APP_URL?.trim() || undefined,
    realtimeTransport: env.REALTIME_TRANSPORT as RealtimeTransport,
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      ...(env.STALE_GPS_MINUTES && { staleGpsMinutes: env.STALE_GPS_MINUTES }),
      ...(env.NO_MOVEMENT_MINUTES && { noMovementMinutes: env.NO_MOVEMENT_MINUTES }),
      ...(env.HUB_DWELL_WARNING_MINUTES && { hubDwellWarningMinutes: env.HUB_DWELL_WARNING_MINUTES }),
      ...(env.HUB_DWELL_CRITICAL_MINUTES && { hubDwellCriticalMinutes: env.HUB_DWELL_CRITICAL_MINUTES }),
      ...(env.ROUTE_DEVIATION_METERS && { routeDeviationMeters: env.ROUTE_DEVIATION_METERS }),
      ...(env.ETA_NOTIFICATION_DELTA_MINUTES && {
        etaNotificationDeltaMinutes: env.ETA_NOTIFICATION_DELTA_MINUTES,
      }),
    },
  };
  return cached;
}

export function getThresholds(): Thresholds {
  return getAppConfig().thresholds;
}

export function getPublicAppConfig(): PublicAppConfig {
  const config = getAppConfig();
  return {
    demoMode: config.demoMode,
    simulationEnabled: config.simulationEnabled,
    mapProvider: config.mapProvider,
    realtimeTransport: config.realtimeTransport,
    appUrl: config.appUrl,
  };
}
