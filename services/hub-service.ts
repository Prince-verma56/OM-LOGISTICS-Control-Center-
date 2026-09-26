import { getRepositories } from "@/data/repositories";
import { OPEN_EXCEPTION_STATUSES } from "@/lib/constants/statuses";
import { notFound } from "@/lib/server/errors";
import type { CollectionResponse } from "@/types/api";
import type { Hub, HubDetail } from "@/types/hub";
import { alertService } from "./alert-service";
import { toHub, toShipment } from "./mappers";

async function list(): Promise<CollectionResponse<Hub>> {
  const repos = getRepositories();
  const [hubs, exceptions, trips] = await Promise.all([
    repos.hubs.list(),
    repos.exceptions.list(),
    repos.fleet.listTrips(),
  ]);
  const dwellByHub = new Map<string, number>();
  for (const exception of exceptions) {
    if (exception.type === "HUB_DWELL" && exception.hubId && OPEN_EXCEPTION_STATUSES.includes(exception.status)) {
      dwellByHub.set(exception.hubId, (dwellByHub.get(exception.hubId) ?? 0) + 1);
    }
  }
  const onSite = new Map<string, number>();
  for (const trip of trips) {
    if (trip.phase === "AT_HUB" && trip.atHubId) onSite.set(trip.atHubId, (onSite.get(trip.atHubId) ?? 0) + 1);
  }
  const data = hubs
    .map((hub) =>
      toHub(hub, { highDwellExceptions: dwellByHub.get(hub.id) ?? 0, vehiclesOnSite: onSite.get(hub.id) ?? 0 }),
    )
    .sort((a, b) => {
      const rank = { CONGESTED: 2, BUSY: 1, NORMAL: 0 } as const;
      return rank[b.status] - rank[a.status] || b.averageDwellMinutes - a.averageDwellMinutes;
    });
  return { data };
}

async function getDetail(hubId: string): Promise<HubDetail> {
  const repos = getRepositories();
  const hub = (await list()).data.find((item) => item.id === hubId);
  if (!hub) throw notFound("HUB_NOT_FOUND", "Hub not found.");

  const [shipments, routes, trips] = await Promise.all([
    repos.shipments.list(),
    repos.routes.list(),
    repos.fleet.listTrips(),
  ]);
  const originByRoute = new Map(routes.map((route) => [route.id, route.stops[0].hubId]));
  const waiting = shipments.filter(
    (shipment) =>
      (shipment.status === "HUB_REACHED" && shipment.currentHubId === hubId) ||
      ((shipment.status === "ORDER_BOOKED" || shipment.status === "PICKED_UP") && originByRoute.get(shipment.routeId) === hubId),
  );
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const inboundVehicles = trips.filter(
    (trip) => trip.phase === "EN_ROUTE" && routeById.get(trip.routeId)?.stops[trip.nextStopIndex]?.hubId === hubId,
  ).length;
  const exceptions = await alertService.list({ hubId, view: "open", page: 1, pageSize: 50 });

  return {
    hub,
    waitingShipments: waiting
      .sort((a, b) => a.lastUpdatedAt.localeCompare(b.lastUpdatedAt))
      .slice(0, 60)
      .map(toShipment),
    exceptions: exceptions.data,
    inboundVehicles,
  };
}

export const hubService = { list, getDetail };
