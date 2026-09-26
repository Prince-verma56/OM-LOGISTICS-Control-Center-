import {
  along,
  bearing,
  bezierSpline,
  destination,
  distance,
  length,
  lineString,
  nearestPointOnLine,
  point,
  pointToLineDistance,
} from "@turf/turf";
import type { Feature, LineString } from "geojson";
import type { LngLat } from "@/types/geo";

/**
 * Geometry helpers shared by the seed generator, the simulator and the
 * route-intelligence rules. All coordinates are [lng, lat].
 */

export type RouteLine = Feature<LineString>;

export function toLine(coordinates: LngLat[]): RouteLine {
  return lineString(coordinates);
}

export function lineLengthKm(line: RouteLine): number {
  return length(line, { units: "kilometers" });
}

/** Position `km` along the line (clamped to the line). */
export function pointAlong(line: RouteLine, km: number): LngLat {
  const total = lineLengthKm(line);
  const clamped = Math.min(Math.max(km, 0), total);
  const [lng, lat] = along(line, clamped, { units: "kilometers" }).geometry.coordinates;
  return [lng, lat];
}

/** Heading (0..360, clockwise from north) of travel at `km` along the line. */
export function headingAlong(line: RouteLine, km: number): number {
  const total = lineLengthKm(line);
  const from = pointAlong(line, Math.min(km, total - 0.5));
  const to = pointAlong(line, Math.min(km + 2, total));
  if (from[0] === to[0] && from[1] === to[1]) return 0;
  return normalizeHeading(bearing(point(from), point(to)));
}

export function normalizeHeading(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Moves a point `km` in the direction of `headingDeg`. */
export function offsetPoint(origin: LngLat, headingDeg: number, km: number): LngLat {
  const [lng, lat] = destination(point(origin), km, headingDeg, { units: "kilometers" }).geometry.coordinates;
  return [lng, lat];
}

/** Perpendicular distance from a position to the planned corridor, in meters. */
export function distanceFromLineMeters(position: LngLat, line: RouteLine): number {
  return pointToLineDistance(point(position), line, { units: "meters" });
}

/** Distance along the line of the closest point to `position`, in km. */
export function projectOntoLineKm(position: LngLat, line: RouteLine): number {
  const nearest = nearestPointOnLine(line, point(position), { units: "kilometers" });
  return nearest.properties.location ?? 0;
}

export function haversineKm(a: LngLat, b: LngLat): number {
  return distance(point(a), point(b), { units: "kilometers" });
}

/** Smooths a set of waypoints into a road-like polyline with ~`targetPoints` vertices. */
export function smoothPolyline(waypoints: LngLat[], targetPoints: number): LngLat[] {
  if (waypoints.length < 3) return waypoints;
  const resolution = Math.max(1_000, Math.round(targetPoints * 20));
  const spline = bezierSpline(lineString(waypoints), { resolution, sharpness: 0.6 });
  return spline.geometry.coordinates.map(([lng, lat]) => [round6(lng), round6(lat)] as LngLat);
}

/** Slice of the line between two distances, as coordinates. */
export function sliceLine(line: RouteLine, fromKm: number, toKm: number, step = 8): LngLat[] {
  const total = lineLengthKm(line);
  const start = Math.max(0, Math.min(fromKm, total));
  const end = Math.max(start, Math.min(toKm, total));
  const coords: LngLat[] = [];
  for (let km = start; km < end; km += step) coords.push(pointAlong(line, km));
  coords.push(pointAlong(line, end));
  return coords;
}

export function boundsOf(coordinates: LngLat[]): [[number, number], [number, number]] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Coarsens a coordinate for privacy (1 decimal ≈ 11 km). */
export function coarsen(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface NamedPlace {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

/** "Near Agra, UP" — nearest known place within `maxKm`, else a corridor description. */
export function describeLocation(position: LngLat, places: readonly NamedPlace[], maxKm = 45): string {
  let best: NamedPlace | undefined;
  let bestKm = Infinity;
  for (const place of places) {
    const km = haversineKm(position, [place.lng, place.lat]);
    if (km < bestKm) {
      best = place;
      bestKm = km;
    }
  }
  if (!best) return "En route";
  if (bestKm <= 6) return `${best.name}, ${best.state}`;
  if (bestKm <= maxKm) return `Near ${best.name}, ${best.state}`;
  return `${Math.round(bestKm)} km from ${best.name}, ${best.state}`;
}
