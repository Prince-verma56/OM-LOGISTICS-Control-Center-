import { ETA_MODEL } from "@/lib/constants/thresholds";
import {
  lineLengthKm,
  projectOntoLineKm,
  smoothPolyline,
  toLine,
  type RouteLine,
} from "@/lib/map/geo";
import type { LngLat } from "@/types/geo";
import type { Route } from "@/types/route";
import { HUB_DEFINITIONS, LANE_DEFINITIONS, PLACES, type LaneDefinition } from "./geography";
import type { Rng } from "./prng";

export interface BuiltRoutes {
  routes: Route[];
  lines: Map<string, RouteLine>;
  historicalFactors: Map<string, number>;
}

const hubCode = (hubId: string) => HUB_DEFINITIONS.find((hub) => hub.id === hubId)?.code ?? hubId;
const hubCity = (hubId: string) => {
  const definition = HUB_DEFINITIONS.find((hub) => hub.id === hubId);
  if (!definition) return hubId;
  const place = PLACES[definition.place];
  return place.name === "Bhiwandi" ? "Mumbai" : place.name;
};

export function routeIdFor(originHubId: string, destinationHubId: string): string {
  return `rte_${hubCode(originHubId).toLowerCase()}${hubCode(destinationHubId).toLowerCase()}`;
}

/**
 * Adds deterministic lateral wiggle between waypoints so a smoothed lane
 * reads like a highway rather than a straight line.
 */
function roadlikeWaypoints(lane: LaneDefinition, rng: Rng): LngLat[] {
  const points: LngLat[] = [];
  lane.waypoints.forEach((key, index) => {
    const place = PLACES[key];
    points.push([place.lng, place.lat]);
    const nextKey = lane.waypoints[index + 1];
    if (!nextKey) return;
    const next = PLACES[nextKey];
    const dx = next.lng - place.lng;
    const dy = next.lat - place.lat;
    const length = Math.hypot(dx, dy);
    if (length < 0.35) return;
    // Perpendicular unit vector.
    const px = -dy / length;
    const py = dx / length;
    for (const t of [0.35, 0.68]) {
      const wiggle = rng.float(-0.045, 0.045) * Math.min(1, length);
      points.push([place.lng + dx * t + px * wiggle, place.lat + dy * t + py * wiggle]);
    }
  });
  return points;
}

function buildStops(line: RouteLine, hubIds: string[]) {
  return hubIds
    .map((hubId) => {
      const definition = HUB_DEFINITIONS.find((hub) => hub.id === hubId);
      if (!definition) throw new Error(`Unknown hub ${hubId}`);
      const place = PLACES[definition.place];
      return { hubId, distanceKm: Math.round(projectOntoLineKm([place.lng, place.lat], line) * 10) / 10 };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function plannedDuration(distanceKm: number, intermediateStops: number): number {
  const driveMinutes = (distanceKm / ETA_MODEL.plannedAverageSpeedKph) * 60;
  return Math.round(driveMinutes + intermediateStops * ETA_MODEL.expectedHubDwellMinutes);
}

function makeRoute(lane: LaneDefinition, geometry: LngLat[], hubIds: string[]): { route: Route; line: RouteLine } {
  const line = toLine(geometry);
  const distanceKm = lineLengthKm(line);
  const stops = buildStops(line, hubIds);
  // Pin origin/destination to the line ends.
  stops[0].distanceKm = 0;
  stops[stops.length - 1].distanceKm = Math.round(distanceKm * 10) / 10;
  const originHubId = hubIds[0];
  const destinationHubId = hubIds[hubIds.length - 1];
  return {
    line,
    route: {
      id: routeIdFor(originHubId, destinationHubId),
      code: `${hubCode(originHubId)}-${hubCode(destinationHubId)}`,
      origin: hubCity(originHubId),
      destination: hubCity(destinationHubId),
      plannedDistanceKm: Math.round(distanceKm),
      plannedDurationMinutes: plannedDuration(distanceKm, Math.max(0, stops.length - 2)),
      geometry,
      stops,
      corridor: lane.corridor,
    },
  };
}

/** 17 bidirectional lanes → 34 routes with planned geometry and hub stops. */
export function buildRoutes(rng: Rng): BuiltRoutes {
  const routes: Route[] = [];
  const lines = new Map<string, RouteLine>();
  const historicalFactors = new Map<string, number>();

  for (const lane of LANE_DEFINITIONS) {
    const raw = roadlikeWaypoints(lane, rng);
    const approxKm = lineLengthKm(toLine(raw));
    const geometry = smoothPolyline(raw, Math.min(260, Math.max(60, Math.round(approxKm / 7))));

    const forward = makeRoute(lane, geometry, lane.hubIds);
    const reverse = makeRoute(lane, [...geometry].reverse(), [...lane.hubIds].reverse());

    for (const { route, line } of [forward, reverse]) {
      routes.push(route);
      lines.set(route.id, line);
      historicalFactors.set(route.id, lane.historicalFactor);
    }
  }

  return { routes, lines, historicalFactors };
}
