"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { FeatureCollection, LineString } from "geojson";
import { useTheme } from "next-themes";
import { useMemo, useRef, useState } from "react";
import MapGL, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { usePublicConfig } from "@/hooks/use-public-config";
import { boundsOfCoordinates } from "@/lib/map/bounds";
import {
  MAP_SOURCE_IDS,
  RISK_HEX,
  actualRouteLayer,
  getFallbackStyle,
  getMapStyleUrl,
  plannedRouteLayer,
  type MapTheme,
} from "@/lib/map/style";
import type { RiskLevel } from "@/lib/constants/statuses";
import type { LngLat } from "@/types/geo";

const mapLib = import("maplibre-gl").then((module) => {
  module.setWorkerUrl(new URL("/vendor/maplibre-gl/maplibre-gl-worker.mjs", window.location.origin).href);
  return module;
});

function line(coordinates: LngLat[]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: coordinates.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } }] : [],
  };
}

/** Planned (dashed) vs actual (solid) route with the current position. */
export default function RouteMap({
  planned,
  actual,
  position,
  risk,
  className,
}: {
  planned: LngLat[];
  actual: LngLat[];
  position?: LngLat;
  risk: RiskLevel;
  className?: string;
}) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();
  const theme: MapTheme = resolvedTheme === "light" ? "light" : "dark";
  const { mapProvider } = usePublicConfig();
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);
  const bounds = useMemo(() => boundsOfCoordinates(planned), [planned]);
  const plannedData = useMemo(() => line(planned), [planned]);
  const actualData = useMemo(() => line(actual), [actual]);
  const origin = planned[0];
  const destination = planned[planned.length - 1];

  return (
    <div className={className}>
      <MapGL
        ref={mapRef}
        mapLib={mapLib}
        mapStyle={failed ? getFallbackStyle(theme) : getMapStyleUrl(mapProvider, theme)}
        initialViewState={bounds ? { bounds, fitBoundsOptions: { padding: 36 } } : undefined}
        attributionControl={{ compact: true }}
        dragRotate={false}
        onLoad={() => {
          loaded.current = true;
        }}
        onError={() => {
          if (!loaded.current) setFailed(true);
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Source id={MAP_SOURCE_IDS.planned} type="geojson" data={plannedData}>
          <Layer {...plannedRouteLayer(theme)} />
        </Source>
        <Source id={MAP_SOURCE_IDS.actual} type="geojson" data={actualData}>
          <Layer {...actualRouteLayer(theme)} />
        </Source>
        {origin && (
          <Marker longitude={origin[0]} latitude={origin[1]} anchor="center">
            <span className="block size-3 rounded-full border-2 border-card bg-foreground shadow" aria-label="Origin" />
          </Marker>
        )}
        {destination && (
          <Marker longitude={destination[0]} latitude={destination[1]} anchor="center">
            <span className="block size-3 rotate-45 border-2 border-card bg-foreground shadow" aria-label="Destination" />
          </Marker>
        )}
        {position && (
          <Marker longitude={position[0]} latitude={position[1]} anchor="center">
            <span
              className="block size-4 rounded-full border-[3px] border-card shadow-md"
              style={{ backgroundColor: RISK_HEX[risk] }}
              aria-label="Current position"
            />
          </Marker>
        )}
      </MapGL>
    </div>
  );
}
