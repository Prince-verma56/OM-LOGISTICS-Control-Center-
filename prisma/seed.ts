/**
 * Seeds PostgreSQL with the same deterministic demo dataset the in-memory
 * store uses (brain/18 §6: `npm run db:seed`). Requires DATABASE_URL and a
 * migrated schema (`npm run db:migrate`).
 */
import { DEMO_CONFIG } from "@/config/demo";
import { generateDemoDataset } from "@/data/seed";
import { getAppConfig } from "@/lib/config/app";
import { getDb } from "@/lib/db";

const BATCH = 1_000;

async function inBatches<T>(rows: T[], write: (chunk: T[]) => Promise<unknown>) {
  for (let start = 0; start < rows.length; start += BATCH) await write(rows.slice(start, start + BATCH));
}

const date = (value: string) => new Date(value);
const optionalDate = (value?: string) => (value ? new Date(value) : null);

async function main() {
  const config = getAppConfig();
  const db = getDb();
  const dataset = generateDemoDataset({
    seed: DEMO_CONFIG.seed,
    anchorMs: Date.now(),
    trackingSecret: config.trackingTokenSecret,
    thresholds: config.thresholds,
    simulation: { running: false, speed: config.simulationSpeed },
  });

  console.log("Clearing existing demo data…");
  await db.$transaction([
    db.exceptionAudit.deleteMany(),
    db.exception.deleteMany(),
    db.notification.deleteMany(),
    db.etaPrediction.deleteMany(),
    db.hubVisit.deleteMany(),
    db.shipmentEvent.deleteMany(),
    db.shipment.deleteMany(),
    db.gpsPoint.deleteMany(),
    db.vehicle.deleteMany(),
    db.routeStop.deleteMany(),
    db.route.deleteMany(),
    db.hub.deleteMany(),
    db.customer.deleteMany(),
    db.kpiSnapshot.deleteMany(),
  ]);

  await db.customer.createMany({
    data: [...dataset.customers.values()].map((customer) => ({
      id: customer.id,
      name: customer.name,
      segment: customer.segment,
      homeHubId: customer.homeHubId,
    })),
  });
  await db.hub.createMany({
    data: [...dataset.hubs.values()].map((hub) => ({
      id: hub.id,
      code: hub.code,
      name: hub.name,
      city: hub.city,
      state: hub.state,
      latitude: hub.latitude,
      longitude: hub.longitude,
      status: hub.status,
      arrivals: hub.arrivals,
      departures: hub.departures,
      activeShipments: hub.activeShipments,
      averageDwellMinutes: hub.averageDwellMinutes,
    })),
  });
  const routes = [...dataset.routes.values()];
  await db.route.createMany({
    data: routes.map((route) => ({
      id: route.id,
      code: route.code,
      origin: route.origin,
      destination: route.destination,
      corridor: route.corridor,
      plannedDistanceKm: route.plannedDistanceKm,
      plannedDurationMinutes: route.plannedDurationMinutes,
      geometry: route.geometry,
    })),
  });
  await db.routeStop.createMany({
    data: routes.flatMap((route) =>
      route.stops.map((stop, sequence) => ({ routeId: route.id, sequence, hubId: stop.hubId, distanceKm: stop.distanceKm })),
    ),
  });
  await db.vehicle.createMany({
    data: [...dataset.vehicles.values()].map((vehicle) => ({
      id: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      homeHubId: vehicle.homeHubId,
      status: vehicle.status,
      latitude: vehicle.lat,
      longitude: vehicle.lng,
      headingDeg: vehicle.headingDeg,
      speedKph: vehicle.speedKph,
      lastGpsAt: date(vehicle.lastGpsAt),
    })),
  });
  await inBatches(
    [...dataset.gps.values()].flat(),
    (chunk) =>
      db.gpsPoint.createMany({
        data: chunk.map((point) => ({
          id: point.id,
          vehicleId: point.vehicleId,
          latitude: point.latitude,
          longitude: point.longitude,
          speedKph: point.speedKph,
          headingDeg: point.headingDeg,
          recordedAt: date(point.recordedAt),
          receivedAt: date(point.receivedAt),
          source: point.source,
        })),
      }),
  );

  const shipments = [...dataset.shipments.values()];
  await inBatches(shipments, (chunk) =>
    db.shipment.createMany({
      data: chunk.map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        publicTrackingToken: shipment.publicTrackingToken,
        customerId: shipment.customerId,
        routeId: shipment.routeId,
        vehicleId: shipment.vehicleId ?? null,
        status: shipment.status,
        origin: shipment.origin,
        destination: shipment.destination,
        originLat: shipment.originLat,
        originLng: shipment.originLng,
        destinationLat: shipment.destinationLat,
        destinationLng: shipment.destinationLng,
        bookedAt: date(shipment.bookedAt),
        pickedUpAt: optionalDate(shipment.pickedUpAt),
        promisedDeliveryAt: date(shipment.promisedDeliveryAt),
        originalEtaAt: date(shipment.originalEtaAt),
        revisedEtaAt: optionalDate(shipment.revisedEtaAt),
        deliveredAt: optionalDate(shipment.deliveredAt),
        delayMinutes: shipment.delayMinutes,
        riskLevel: shipment.riskLevel,
        currentLat: shipment.currentLocation?.lat ?? null,
        currentLng: shipment.currentLocation?.lng ?? null,
        currentRecordedAt: optionalDate(shipment.currentLocation?.recordedAt),
        progressPct: shipment.progressPct,
        currentHubId: shipment.currentHubId ?? null,
        nextHubId: shipment.nextHubId ?? null,
        locationLabel: shipment.locationLabel ?? null,
        delayReason: shipment.delayReason ?? null,
        lastUpdatedAt: date(shipment.lastUpdatedAt),
      })),
    }),
  );
  await inBatches([...dataset.events.values()].flat(), (chunk) =>
    db.shipmentEvent.createMany({
      data: chunk.map((event) => ({
        id: event.id,
        shipmentId: event.shipmentId,
        type: event.type,
        title: event.title,
        description: event.description ?? null,
        locationLabel: event.locationLabel ?? null,
        hubId: event.hubId ?? null,
        occurredAt: date(event.occurredAt),
        receivedAt: date(event.receivedAt),
        source: event.source,
      })),
    }),
  );
  await inBatches(
    [...dataset.hubVisits.entries()].flatMap(([shipmentId, visits]) =>
      visits.map((visit, sequence) => ({ shipmentId, sequence, ...visit })),
    ),
    (chunk) =>
      db.hubVisit.createMany({
        data: chunk.map((visit) => ({
          shipmentId: visit.shipmentId,
          hubId: visit.hubId,
          sequence: visit.sequence,
          arrivedAt: optionalDate(visit.arrivedAt),
          departedAt: optionalDate(visit.departedAt),
          dwellMinutes: visit.dwellMinutes ?? null,
          status: visit.status,
        })),
      }),
  );
  await db.etaPrediction.createMany({
    data: [...dataset.eta.values()].map((eta) => ({
      shipmentId: eta.shipmentId,
      predictedEtaAt: date(eta.predictedEtaAt),
      previousEtaAt: optionalDate(eta.previousEtaAt),
      generatedAt: date(eta.generatedAt),
      delayMinutes: eta.delayMinutes,
      confidence: eta.confidence,
      riskLevel: eta.riskLevel,
      bufferMinutes: eta.bufferMinutes,
      factors: eta.factors,
      explanation: eta.explanation,
      dataFreshnessAt: date(eta.dataFreshnessAt),
    })),
  });
  await db.exception.createMany({
    data: [...dataset.exceptions.values()].map((exception) => ({
      id: exception.id,
      shipmentId: exception.shipmentId,
      type: exception.type,
      severity: exception.severity,
      title: exception.title,
      description: exception.description,
      detectedAt: date(exception.detectedAt),
      status: exception.status,
      assignedTo: exception.assignedTo ?? null,
      resolutionNote: exception.resolutionNote ?? null,
      resolvedAt: optionalDate(exception.resolvedAt),
      source: exception.source,
      vehicleId: exception.vehicleId ?? null,
      hubId: exception.hubId ?? null,
      affectedShipmentIds: exception.affectedShipmentIds ?? [],
      updatedAt: date(exception.updatedAt),
    })),
  });
  await db.exceptionAudit.createMany({
    data: [...dataset.audit.values()].flat().map((entry) => ({
      id: entry.id,
      exceptionId: entry.exceptionId,
      actor: entry.actor,
      action: entry.action,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus ?? null,
      fromAssignee: entry.fromAssignee ?? null,
      toAssignee: entry.toAssignee ?? null,
      note: entry.note ?? null,
      at: date(entry.at),
    })),
  });
  await db.notification.createMany({
    data: dataset.notifications.map((notification) => ({
      id: notification.id,
      shipmentId: notification.shipmentId ?? null,
      template: notification.template,
      channel: notification.channel,
      provider: notification.provider,
      status: notification.status,
      severity: notification.severity,
      title: notification.title,
      message: notification.message,
      createdAt: date(notification.createdAt),
    })),
  });
  await db.kpiSnapshot.createMany({ data: dataset.kpiHistory });

  console.log(
    `Seeded ${dataset.customers.size} customers, ${dataset.hubs.size} hubs, ${routes.length} routes, ` +
      `${dataset.vehicles.size} vehicles, ${shipments.length} shipments, ${dataset.exceptions.size} exceptions, ` +
      `${dataset.notifications.length} notifications.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (getAppConfig().databaseUrl) await getDb().$disconnect();
  });
