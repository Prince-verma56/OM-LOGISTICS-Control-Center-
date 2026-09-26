import type { StyleSpecification } from "maplibre-gl";
import type { LayerProps } from "react-map-gl/maplibre";
import type { HubStatus, RiskLevel, VehicleStatus } from "@/lib/constants/statuses";

/**
 * Map configuration. Page components never hardcode map settings — they read
 * from here. MAP_PROVIDER=demo uses keyless public basemaps; no proprietary
 * credentials are required.
 */

export type MapTheme = "light" | "dark";

interface MapProviderConfig {
  label: string;
  attribution: string;
  styles: Record<MapTheme, string>;
}

export const MAP_PROVIDERS: Record<string, MapProviderConfig> = {
  /** OpenFreeMap — free, keyless, OpenStreetMap-based vector tiles. */
  demo: {
    label: "OpenFreeMap (demo)",
    attribution: "OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors",
    styles: {
      light: "https://tiles.openfreemap.org/styles/positron",
      dark: "https://tiles.openfreemap.org/styles/dark",
    },
  },
  /** CARTO basemaps — keyless alternative (subject to CARTO usage terms). */
  carto: {
    label: "CARTO basemaps",
    attribution: "© CARTO · © OpenStreetMap contributors",
    styles: {
      light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    },
  },
};

export function getMapStyleUrl(provider: string, theme: MapTheme): string {
  return (MAP_PROVIDERS[provider] ?? MAP_PROVIDERS.demo).styles[theme];
}

/**
 * Offline fallback: a plain canvas so vehicles, routes and hubs still render
 * when the basemap cannot be reached (brain/00 §9 — degrade gracefully).
 */
export function getFallbackStyle(theme: MapTheme): StyleSpecification {
  return {
    version: 8,
    name: "offline-fallback",
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": theme === "dark" ? "#0b1220" : "#eef2f7" },
      },
    ],
  };
}

/** Pan-India network view. */
export const INDIA_VIEW = { longitude: 80.2, latitude: 22.4, zoom: 4.05 } as const;
export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [66.5, 6.0],
  [98.5, 36.5],
];
/** Pan limit as [west, south, east, north]. */
export const MAP_MAX_BOUNDS: [number, number, number, number] = [55, -2, 110, 42];

export const MAP_LAYER_IDS = {
  routes: "network-routes",
  routeSelected: "network-route-selected",
  trail: "vehicle-trail",
  vehicleHalo: "vehicle-halo",
  vehicles: "vehicle-points",
  vehicleHeading: "vehicle-heading",
  plannedRoute: "planned-route",
  actualRoute: "actual-route",
} as const;

export const MAP_SOURCE_IDS = {
  routes: "network-routes-src",
  vehicles: "vehicles-src",
  trail: "trail-src",
  planned: "planned-src",
  actual: "actual-src",
} as const;

export const VEHICLE_ICON_ID = "vehicle-chevron";

/**
 * Status palette (validated reference palette, dataviz skill):
 * good #0ca30c · warning #fab219 · serious #ec835a · critical #d03b3b.
 * MapLibre paint cannot read CSS variables, so literal hex lives here.
 */
export const STATUS_HEX = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  neutral: "#8a94a6",
  info: "#3987e5",
} as const;

export const RISK_HEX: Record<RiskLevel, string> = {
  LOW: STATUS_HEX.good,
  MEDIUM: STATUS_HEX.warning,
  HIGH: STATUS_HEX.serious,
  CRITICAL: STATUS_HEX.critical,
};

export const HUB_STATUS_HEX: Record<HubStatus, string> = {
  NORMAL: STATUS_HEX.good,
  BUSY: STATUS_HEX.warning,
  CONGESTED: STATUS_HEX.critical,
};

export const VEHICLE_STATUS_HEX: Record<VehicleStatus, string> = {
  MOVING: STATUS_HEX.good,
  IDLE: STATUS_HEX.neutral,
  STOPPED: STATUS_HEX.warning,
  OFFLINE: STATUS_HEX.neutral,
};

export interface MapPalette {
  route: string;
  routeOpacity: number;
  routeSelected: string;
  trail: string;
  planned: string;
  actual: string;
  vehicleStroke: string;
  selectedHalo: string;
}

export const MAP_PALETTE: Record<MapTheme, MapPalette> = {
  dark: {
    route: "#5b7fb5",
    routeOpacity: 0.42,
    routeSelected: "#60a5fa",
    trail: "#93c5fd",
    planned: "#60a5fa",
    actual: "#f59e0b",
    vehicleStroke: "#0b1220",
    selectedHalo: "#e2e8f0",
  },
  light: {
    route: "#315b9c",
    routeOpacity: 0.35,
    routeSelected: "#1d4ed8",
    trail: "#1e40af",
    planned: "#1d4ed8",
    actual: "#c2410c",
    vehicleStroke: "#ffffff",
    selectedHalo: "#0f172a",
  },
};

/** Duration of the client-side marker interpolation between ticks. */
export const MARKER_TWEEN_MS = 1_700;

/* -------------------------------------------------------------------------- */
/* Layer styles (MapLibre style-spec)                                         */
/* -------------------------------------------------------------------------- */

// `source` is optional in LayerProps; <Layer> inherits it from its parent <Source>.
type LayerStyle = LayerProps;

const riskColorExpression = [
  "match",
  ["get", "status"],
  "OFFLINE",
  STATUS_HEX.neutral,
  [
    "match",
    ["get", "risk"],
    "CRITICAL",
    RISK_HEX.CRITICAL,
    "HIGH",
    RISK_HEX.HIGH,
    "MEDIUM",
    RISK_HEX.MEDIUM,
    RISK_HEX.LOW,
  ],
] as unknown as string;

export function networkRouteLayer(theme: MapTheme): LayerStyle {
  const palette = MAP_PALETTE[theme];
  return {
    id: MAP_LAYER_IDS.routes,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": palette.route,
      "line-opacity": palette.routeOpacity,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 6, 1.6, 9, 3] as unknown as number,
    },
  };
}

export function selectedRouteLayer(theme: MapTheme, routeId: string | undefined): LayerStyle {
  return {
    id: MAP_LAYER_IDS.routeSelected,
    type: "line",
    filter: ["==", ["get", "id"], routeId ?? "__none__"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_PALETTE[theme].routeSelected,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 8, 4] as unknown as number,
      "line-opacity": 0.95,
    },
  };
}

export function vehicleHaloLayer(theme: MapTheme): LayerStyle {
  return {
    id: MAP_LAYER_IDS.vehicleHalo,
    type: "circle",
    filter: ["==", ["get", "selected"], true],
    paint: {
      "circle-radius": 15,
      "circle-color": MAP_PALETTE[theme].routeSelected,
      "circle-opacity": 0.18,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": MAP_PALETTE[theme].routeSelected,
    },
  };
}

export function vehicleCircleLayer(theme: MapTheme): LayerStyle {
  return {
    id: MAP_LAYER_IDS.vehicles,
    type: "circle",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        ["case", ["==", ["get", "selected"], true], 7, 4.5],
        8,
        ["case", ["==", ["get", "selected"], true], 10, 7.5],
      ] as unknown as number,
      "circle-color": riskColorExpression,
      "circle-opacity": ["case", ["==", ["get", "status"], "OFFLINE"], 0.55, 1] as unknown as number,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": MAP_PALETTE[theme].vehicleStroke,
    },
  };
}

/** Direction chevron — only for moving vehicles, rotated to heading. */
export function vehicleHeadingLayer(theme: MapTheme): LayerStyle {
  return {
    id: MAP_LAYER_IDS.vehicleHeading,
    type: "symbol",
    filter: ["==", ["get", "status"], "MOVING"],
    layout: {
      "icon-image": VEHICLE_ICON_ID,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.32, 8, 0.5] as unknown as number,
      "icon-rotate": ["get", "heading"] as unknown as number,
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-color": MAP_PALETTE[theme].vehicleStroke },
  };
}

export function plannedRouteLayer(theme: MapTheme): LayerStyle {
  return {
    id: MAP_LAYER_IDS.plannedRoute,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": MAP_PALETTE[theme].planned, "line-width": 3, "line-opacity": 0.55, "line-dasharray": [2, 1.5] },
  };
}

export function actualRouteLayer(theme: MapTheme): LayerStyle {
  return {
    id: MAP_LAYER_IDS.actualRoute,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": MAP_PALETTE[theme].actual, "line-width": 3.5, "line-opacity": 0.95 },
  };
}

/** SDF chevron for vehicle heading, drawn once on a canvas (no sprite dependency). */
export function createChevronImage(size = 48): ImageData | undefined {
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(size / 2, size * 0.14);
  context.lineTo(size * 0.8, size * 0.8);
  context.lineTo(size / 2, size * 0.64);
  context.lineTo(size * 0.2, size * 0.8);
  context.closePath();
  context.fill();
  return context.getImageData(0, 0, size, size);
}
