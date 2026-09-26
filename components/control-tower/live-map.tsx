"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { FeatureCollection, LineString, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { Layers, LocateFixed, WifiOff } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import MapGL, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusDot } from "@/components/shared/status-dot";
import { Button } from "@/components/ui/button";
import { usePublicConfig } from "@/hooks/use-public-config";
import {
  HUB_STATUS_LABELS,
  HUB_STATUS_TONES,
  RISK_LABELS,
  RISK_TONES,
  VEHICLE_STATUS_LABELS,
} from "@/lib/constants/statuses";
import { formatSpeed } from "@/lib/formatters/number";
import { boundsOfCoordinates, easeInOut, lerp } from "@/lib/map/bounds";
import {
  INDIA_BOUNDS,
  INDIA_VIEW,
  MAP_LAYER_IDS,
  MAP_MAX_BOUNDS,
  MAP_SOURCE_IDS,
  MARKER_TWEEN_MS,
  VEHICLE_ICON_ID,
  createChevronImage,
  getFallbackStyle,
  getMapStyleUrl,
  networkRouteLayer,
  selectedRouteLayer,
  vehicleCircleLayer,
  vehicleHaloLayer,
  vehicleHeadingLayer,
  type MapTheme,
} from "@/lib/map/style";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/types/fleet";
import type { Hub } from "@/types/hub";
import type { Route } from "@/types/route";

/**
 * MapLibre v6 resolves its web worker relative to the library URL, which the
 * bundler rewrites — so we serve the version-matched worker from /public
 * (scripts/copy-maplibre-worker.mjs) and point the library at it.
 */
const mapLib = import("maplibre-gl").then((module) => {
  module.setWorkerUrl(new URL("/vendor/maplibre-gl/maplibre-gl-worker.mjs", window.location.origin).href);
  return module;
});

type VehicleFeatureProps = {
  id: string;
  status: Vehicle["status"];
  risk: Vehicle["riskLevel"];
  heading: number;
  selected: boolean;
};

const EMPTY_POINTS: FeatureCollection<Point, VehicleFeatureProps> = { type: "FeatureCollection", features: [] };
const STYLE_TIMEOUT_MS = 15_000;
/** Moves larger than this (degrees) snap instead of tween (e.g. a new trip). */
const SNAP_DISTANCE = 1.2;

function ensureChevron(map: MapLibreMap) {
  if (map.hasImage(VEHICLE_ICON_ID)) return;
  const image = createChevronImage();
  if (image) map.addImage(VEHICLE_ICON_ID, image, { sdf: true, pixelRatio: 2 });
}

export interface LiveMapProps {
  vehicles: Vehicle[];
  routes: Route[];
  hubs: Hub[];
  selectedVehicleId?: string;
  onSelectVehicle: (vehicleId: string | undefined) => void;
  /** Rendered over the map (e.g. the selected-vehicle card). */
  overlay?: ReactNode;
  className?: string;
}

export default function LiveMap({
  vehicles,
  routes,
  hubs,
  selectedVehicleId,
  onSelectVehicle,
  overlay,
  className,
}: LiveMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const rendered = useRef(new Map<string, [number, number]>());
  const loaded = useRef(false);
  const imageResolverAttached = useRef(false);
  const { resolvedTheme } = useTheme();
  const theme: MapTheme = resolvedTheme === "light" ? "light" : "dark";
  const { mapProvider } = usePublicConfig();
  const reduceMotion = useReducedMotion();
  const [styleVersion, setStyleVersion] = useState(0);
  const [styleFailed, setStyleFailed] = useState(false);
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string>();
  const [hoveredHubId, setHoveredHubId] = useState<string>();
  const [showLegend, setShowLegend] = useState(true);

  const mapStyle = useMemo(
    () => (styleFailed ? getFallbackStyle(theme) : getMapStyleUrl(mapProvider, theme)),
    [styleFailed, theme, mapProvider],
  );

  const routeCollection = useMemo<FeatureCollection<LineString, { id: string; code: string }>>(
    () => ({
      type: "FeatureCollection",
      features: routes.map((route) => ({
        type: "Feature",
        properties: { id: route.id, code: route.code },
        geometry: { type: "LineString", coordinates: route.geometry },
      })),
    }),
    [routes],
  );

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  const selectedRouteId = selectedVehicle?.routeId;
  const hoveredVehicle = hoveredVehicleId ? vehicles.find((vehicle) => vehicle.id === hoveredVehicleId) : undefined;
  const hoveredHub = hoveredHubId ? hubs.find((hub) => hub.id === hoveredHubId) : undefined;
  const movingCount = vehicles.filter((vehicle) => vehicle.status === "MOVING").length;

  /* ---------------- Basemap fallback ---------------- */
  useEffect(() => {
    if (styleFailed) return;
    const timer = setTimeout(() => {
      if (!loaded.current) setStyleFailed(true);
    }, STYLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [styleFailed]);

  /* ---------------- Smooth vehicle movement ---------------- */
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || styleVersion === 0) return;
    const source = map.getSource(MAP_SOURCE_IDS.vehicles) as GeoJSONSource | undefined;
    if (!source) return;

    const tracks = vehicles.map((vehicle) => {
      const to: [number, number] = [vehicle.currentLocation.lng, vehicle.currentLocation.lat];
      const previous = rendered.current.get(vehicle.id);
      const from =
        previous && Math.abs(previous[0] - to[0]) + Math.abs(previous[1] - to[1]) < SNAP_DISTANCE ? previous : to;
      return { vehicle, from, to };
    });

    const frame = (t: number): FeatureCollection<Point, VehicleFeatureProps> => ({
      type: "FeatureCollection",
      features: tracks.map(({ vehicle, from, to }) => {
        const position = t >= 1 ? to : lerp(from, to, t);
        rendered.current.set(vehicle.id, position);
        return {
          type: "Feature",
          id: vehicle.id,
          properties: {
            id: vehicle.id,
            status: vehicle.status,
            risk: vehicle.riskLevel,
            heading: vehicle.currentLocation.headingDeg ?? 0,
            selected: vehicle.id === selectedVehicleId,
          },
          geometry: { type: "Point", coordinates: position },
        };
      }),
    });

    if (reduceMotion) {
      source.setData(frame(1));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / MARKER_TWEEN_MS);
      source.setData(frame(easeInOut(t)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [vehicles, selectedVehicleId, styleVersion, reduceMotion]);

  /* ---------------- Frame the selected vehicle's lane ---------------- */
  const route = selectedRouteId ? routes.find((item) => item.id === selectedRouteId) : undefined;
  const focusKey = `${selectedVehicleId ?? ""}:${route?.id ?? ""}`;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVehicleId || styleVersion === 0) return;
    const bounds = route ? boundsOfCoordinates(route.geometry) : undefined;
    if (bounds) {
      map.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: 70, right: 70 },
        maxZoom: 7.2,
        duration: reduceMotion ? 0 : 900,
      });
    } else if (selectedVehicle) {
      map.flyTo({
        center: [selectedVehicle.currentLocation.lng, selectedVehicle.currentLocation.lat],
        zoom: 7,
        duration: reduceMotion ? 0 : 900,
      });
    }
    // Only re-frame when the selection (or its lane) changes, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, styleVersion === 0]);

  const resetView = useCallback(() => {
    onSelectVehicle(undefined);
    mapRef.current?.fitBounds(INDIA_BOUNDS, { padding: 24, duration: reduceMotion ? 0 : 800 });
  }, [onSelectVehicle, reduceMotion]);

  const onLoad = useCallback(() => {
    loaded.current = true;
    const map = mapRef.current?.getMap();
    if (!map) return;
    ensureChevron(map);
    map.on("style.load", () => {
      ensureChevron(map);
      setStyleVersion((version) => version + 1);
    });
    setStyleVersion((version) => version + 1);
  }, []);

  /** Registered at map creation — before the basemap style asks for sprites. */
  const attachMap = useCallback((instance: MapRef | null) => {
    mapRef.current = instance;
    const map = instance?.getMap();
    if (!map || imageResolverAttached.current) return;
    imageResolverAttached.current = true;
    // MapLibre v6 resolver API: supply our chevron on demand, and a transparent
    // pixel for basemap POI sprites we don't use (instead of a console warning).
    map.setMissingStyleImageResolver((id) => {
      if (id === VEHICLE_ICON_ID) ensureChevron(map);
      else if (!map.hasImage(id)) map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
    });
  }, []);

  const onMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    setHoveredVehicleId(feature ? String(feature.properties?.id) : undefined);
  }, []);

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (feature) onSelectVehicle(String(feature.properties?.id));
    },
    [onSelectVehicle],
  );

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-muted", className)}>
      <MapGL
        ref={attachMap}
        mapLib={mapLib}
        mapStyle={mapStyle}
        initialViewState={INDIA_VIEW}
        maxBounds={MAP_MAX_BOUNDS}
        minZoom={3}
        maxZoom={12}
        dragRotate={false}
        pitchWithRotate={false}
        attributionControl={{ compact: true }}
        interactiveLayerIds={[MAP_LAYER_IDS.vehicles]}
        cursor={hoveredVehicleId ? "pointer" : "grab"}
        onLoad={onLoad}
        onError={() => {
          if (!loaded.current) setStyleFailed(true);
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoveredVehicleId(undefined)}
        onClick={onClick}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source id={MAP_SOURCE_IDS.routes} type="geojson" data={routeCollection}>
          <Layer {...networkRouteLayer(theme)} />
          <Layer {...selectedRouteLayer(theme, selectedRouteId)} />
        </Source>

        <Source id={MAP_SOURCE_IDS.vehicles} type="geojson" data={EMPTY_POINTS}>
          <Layer {...vehicleHaloLayer(theme)} />
          <Layer {...vehicleCircleLayer(theme)} />
          <Layer {...vehicleHeadingLayer(theme)} />
        </Source>

        {hubs.map((hub) => (
          <Marker key={hub.id} longitude={hub.longitude} latitude={hub.latitude} anchor="bottom" offset={[0, -2]}>
            <button
              type="button"
              aria-label={`${hub.name}: ${HUB_STATUS_LABELS[hub.status]}`}
              onMouseEnter={() => setHoveredHubId(hub.id)}
              onMouseLeave={() => setHoveredHubId(undefined)}
              onFocus={() => setHoveredHubId(hub.id)}
              onBlur={() => setHoveredHubId(undefined)}
              onClick={() => mapRef.current?.flyTo({ center: [hub.longitude, hub.latitude], zoom: 7.5, duration: reduceMotion ? 0 : 800 })}
              className="flex flex-col items-center focus-visible:outline-none"
            >
              <span className="flex items-center gap-1 rounded-[5px] border border-border bg-card/90 px-1 py-px text-[9.5px] leading-tight font-semibold tracking-wide shadow-sm backdrop-blur-sm hover:border-primary/60">
                <StatusDot tone={HUB_STATUS_TONES[hub.status]} className="size-1.5" />
                {hub.code}
              </span>
              <span className="h-1.5 w-px bg-foreground/40" aria-hidden />
            </button>
          </Marker>
        ))}

        {hoveredVehicle && (
          <Popup
            longitude={hoveredVehicle.currentLocation.lng}
            latitude={hoveredVehicle.currentLocation.lat}
            closeButton={false}
            closeOnClick={false}
            offset={12}
            anchor="bottom"
          >
            <div className="flex min-w-48 flex-col gap-1 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[12.5px] font-semibold">{hoveredVehicle.vehicleNumber}</span>
                <span className="flex items-center gap-1 text-[11px]">
                  <StatusDot tone={RISK_TONES[hoveredVehicle.riskLevel]} />
                  {RISK_LABELS[hoveredVehicle.riskLevel]}
                </span>
              </div>
              <span className="text-muted-foreground">
                {VEHICLE_STATUS_LABELS[hoveredVehicle.status]}
                {hoveredVehicle.status === "MOVING" ? ` · ${formatSpeed(hoveredVehicle.currentLocation.speedKph)}` : ""} ·{" "}
                {hoveredVehicle.currentShipmentIds.length} shipments
              </span>
              <span>{hoveredVehicle.locationLabel}</span>
              <span className="text-[11px] text-muted-foreground">
                GPS <RelativeTime value={hoveredVehicle.lastGpsAt} />
              </span>
            </div>
          </Popup>
        )}

        {hoveredHub && (
          <Popup longitude={hoveredHub.longitude} latitude={hoveredHub.latitude} closeButton={false} closeOnClick={false} offset={26} anchor="bottom">
            <div className="flex min-w-44 flex-col gap-1 text-xs">
              <span className="text-[12.5px] font-semibold">{hoveredHub.name}</span>
              <span className="flex items-center gap-1.5">
                <StatusDot tone={HUB_STATUS_TONES[hoveredHub.status]} />
                {HUB_STATUS_LABELS[hoveredHub.status]} · avg dwell {hoveredHub.averageDwellMinutes} min
              </span>
              <span className="text-muted-foreground">
                {hoveredHub.activeShipments} shipments on site · {hoveredHub.vehiclesOnSite} vehicles
              </span>
            </div>
          </Popup>
        )}
      </MapGL>

      {/* Network chip */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-lg border bg-card/90 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur">
          <StatusDot tone="good" pulse />
          <span className="font-semibold">Live network</span>
          <span className="text-muted-foreground tabular">
            {movingCount}/{vehicles.length} moving · {routes.length} lanes · {hubs.length} hubs
          </span>
        </div>
        {styleFailed && (
          <div className="flex items-center gap-1.5 rounded-lg border border-status-warning/40 bg-card/90 px-2.5 py-1 text-[11px] shadow-sm">
            <WifiOff className="size-3 text-status-warning" aria-hidden />
            Basemap unavailable — showing network only
          </div>
        )}
      </div>

      {/* Map actions */}
      <div className="absolute top-3 right-12 flex gap-1.5">
        <Button size="icon-sm" variant="outline" className="bg-card/90 backdrop-blur" onClick={resetView} aria-label="Reset to India view">
          <LocateFixed />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          className="bg-card/90 backdrop-blur"
          onClick={() => setShowLegend((value) => !value)}
          aria-label={showLegend ? "Hide legend" : "Show legend"}
          aria-pressed={showLegend}
        >
          <Layers />
        </Button>
      </div>

      {showLegend && <MapLegend />}
      {overlay}
    </div>
  );
}

function LegendSwatch({ className }: { className: string }) {
  return <span className={cn("inline-block size-2.5 rounded-full ring-1 ring-card", className)} aria-hidden />;
}

function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 hidden w-52 flex-col gap-2 rounded-lg border bg-card/92 p-2.5 text-[11px] shadow-sm backdrop-blur sm:flex">
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Legend</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5"><LegendSwatch className="bg-status-good" />On track</span>
        <span className="flex items-center gap-1.5"><LegendSwatch className="bg-status-warning" />Watch</span>
        <span className="flex items-center gap-1.5"><LegendSwatch className="bg-status-serious" />At risk</span>
        <span className="flex items-center gap-1.5"><LegendSwatch className="bg-status-critical" />Critical</span>
      </div>
      <div className="flex flex-col gap-1 border-t pt-2">
        <span className="flex items-center gap-1.5">
          <span className="flex size-3 items-center justify-center rounded-full bg-status-good" aria-hidden>
            <svg viewBox="0 0 10 10" className="size-2 fill-card"><path d="M5 1 L8.5 8.5 L5 6.6 L1.5 8.5 Z" /></svg>
          </span>
          Moving (arrow = heading)
        </span>
        <span className="flex items-center gap-1.5"><LegendSwatch className="bg-status-good" />Stopped / idle</span>
        <span className="flex items-center gap-1.5"><LegendSwatch className="bg-status-neutral opacity-60" />GPS offline</span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded bg-primary/60" aria-hidden />
          Planned lane
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-[4px] border bg-card px-1 text-[8.5px] font-semibold">HUB</span>
          Hub · dot = load status
        </span>
      </div>
    </div>
  );
}
