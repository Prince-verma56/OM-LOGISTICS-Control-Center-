# 06 Data Ingestion Specification

## 1. Purpose

This document defines how data enters the application now and how the dummy implementation can later be replaced by real integrations.

## 2. Prototype ingestion

For the prototype use:
- seeded database records;
- JSON fixtures;
- simulation service.

No scraping is required for the initial build.

## 3. Real integration pattern

```text
External API / File / Stream
          |
          v
Connector Adapter
          |
          v
Validation + Normalization
          |
          v
Internal Domain Model
          |
          +--> Database
          +--> Event/Alert Engine
          +--> Real-time UI
```

## 4. Validation

Validate incoming records with Zod before processing.

Example:
```ts
const gpsSchema = z.object({
  vehicleId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  recordedAt: z.string().datetime()
});
```

## 5. Idempotency

Every externally sourced event should have:
- source;
- external event ID;
- receivedAt.

Use a uniqueness constraint:
```text
(source, externalEventId)
```

## 6. Batch imports

Support CSV/JSON import for pilot data.

Import pipeline:
1. upload;
2. parse;
3. validate;
4. preview;
5. commit;
6. report rejected rows.

## 7. Source adapter interface

```ts
interface ShipmentSourceAdapter {
  getShipments(params: QueryParams): Promise<Shipment[]>;
}

interface GPSSourceAdapter {
  getLatestPositions(): Promise<GPSPoint[]>;
}

interface TrafficSourceAdapter {
  getTraffic(params: RouteQuery): Promise<TrafficSnapshot[]>;
}
```

## 8. Source contract changes

External payload shape changes must be absorbed inside the adapter.

Do not modify UI models whenever a vendor changes its JSON.
