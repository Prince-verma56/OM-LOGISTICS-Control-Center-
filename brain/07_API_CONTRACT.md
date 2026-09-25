# 07 API Contract

Base path:

```text
/api/v1
```

## 1. Dashboard summary

### GET
`/api/v1/dashboard/summary`

Response:
```json
{
  "generatedAt": "2026-09-26T05:00:00Z",
  "activeShipments": 1248,
  "vehiclesInTransit": 932,
  "atRiskShipments": 84,
  "onTimeDeliveryPct": 93.4,
  "openExceptions": 57
}
```

## 2. Shipments

### GET
`/api/v1/shipments`

Query params:
```text
page
pageSize
status
riskLevel
hubId
vehicleId
customerId
search
from
to
```

Response:
```json
{
  "data": [
    {
      "id": "shp_10001",
      "trackingNumber": "OML123456",
      "customerName": "Demo Customer",
      "origin": "Delhi",
      "destination": "Kolkata",
      "status": "IN_TRANSIT",
      "vehicleNumber": "DL01AB1234",
      "revisedEtaAt": "2026-09-26T14:30:00Z",
      "delayMinutes": 90,
      "riskLevel": "HIGH",
      "currentLocation": {
        "lat": 27.1767,
        "lng": 78.0081
      },
      "lastUpdatedAt": "2026-09-26T12:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 1248
  }
}
```

## 3. Shipment detail

### GET
`/api/v1/shipments/:shipmentId`

Response sections:
```json
{
  "shipment": {},
  "timeline": [],
  "vehicle": {},
  "route": {},
  "eta": {},
  "exceptions": [],
  "notifications": []
}
```

## 4. Shipment events

### GET
`/api/v1/shipments/:shipmentId/events`

## 5. Fleet

### GET
`/api/v1/fleet

```
Returns:
- vehicle;
- location;
- movement;
- shipment count;
- status;
- last update.
```

## 6. Hubs

### GET
`/api/v1/hubs`

### GET
`/api/v1/hubs/:hubId`

## 7. Exceptions

### GET
`/api/v1/exceptions`

Filters:
- status;
- severity;
- type;
- hub;
- assignedTo;
- from;
- to.

### PATCH
`/api/v1/exceptions/:exceptionId`

Request:
```json
{
  "status": "IN_PROGRESS",
  "assignedTo": "usr_ops_001",
  "note": "Contacted transport partner."
}
```

## 8. ETA

### GET
`/api/v1/shipments/:shipmentId/eta`

## 9. Route

### GET
`/api/v1/shipments/:shipmentId/route`

## 10. KPIs

### GET
`/api/v1/analytics/kpis`

Query:
```text
from
to
hubId
customerId
routeId
```

## 11. Customer tracking

### GET
`/api/v1/public/tracking/:trackingToken`

Public response:
```json
{
  "trackingNumber": "OML123456",
  "status": "IN_TRANSIT",
  "origin": "Delhi",
  "destination": "Kolkata",
  "revisedEtaAt": "2026-09-26T14:30:00Z",
  "delayMinutes": 90,
  "delayReason": "Heavy traffic detected",
  "timeline": [],
  "lastUpdatedAt": "2026-09-26T12:15:00Z"
}
```

Do not return:
- internal customer ID;
- phone/email;
- driver personal data;
- internal exception notes;
- internal risk model metadata.

## 12. Notifications

### GET
`/api/v1/shipments/:shipmentId/notifications`

### POST
`/api/v1/notifications/test`

Use only in DEMO_MODE.

## 13. Real-time endpoint

Prototype:
`GET /api/v1/realtime/stream`

Events:
```json
{
  "type": "VEHICLE_POSITION_UPDATED",
  "occurredAt": "2026-09-26T12:16:05Z",
  "data": {}
}
```

Other event types:
- SHIPMENT_STATUS_CHANGED
- ETA_UPDATED
- EXCEPTION_CREATED
- EXCEPTION_UPDATED
- HUB_DWELL_UPDATED
- NOTIFICATION_UPDATED

## 14. Error contract

```json
{
  "error": {
    "code": "SHIPMENT_NOT_FOUND",
    "message": "Shipment not found.",
    "requestId": "req_abc123",
    "details": {}
  }
}
```
