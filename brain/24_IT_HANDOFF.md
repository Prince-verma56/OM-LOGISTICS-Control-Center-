# 24 IT Handoff

## One-page implementation brief

### Product
OM Logistics Intelligent Control Tower.

### Frontend
Next.js + TypeScript, App Router, Tailwind, reusable enterprise components.

### Backend
Next.js API routes/route handlers with modular domain services.

### Database
PostgreSQL recommended.

### Prototype data
Dummy seeded data plus live simulation.

### Core modules
1. Control Tower Dashboard.
2. Shipment Tracking.
3. Fleet.
4. Hubs.
5. Route Status.
6. ETA.
7. Exception Center.
8. Customer Tracking.
9. Notifications.
10. KPI Analytics.
11. Integrations Health.
12. Role/Settings.

## Required dashboard data fields

### KPI cards
- activeShipments;
- vehiclesInTransit;
- atRiskShipments;
- onTimeDeliveryPct;
- openExceptions.

### Shipment table
- trackingNumber;
- customerName;
- origin;
- destination;
- status;
- vehicleNumber;
- eta;
- delayMinutes;
- riskLevel;
- lastUpdatedAt.

### Map
- vehicleId;
- vehicleNumber;
- lat;
- lng;
- heading;
- speed;
- shipmentId;
- status;
- risk;
- routeId.

### Exception list
- exceptionId;
- shipmentId;
- trackingNumber;
- type;
- severity;
- title;
- detectedAt;
- currentLocation;
- revisedEta;
- status;
- assignedTo.

### Shipment detail
- shipment summary;
- milestone timeline;
- current location;
- original ETA;
- revised ETA;
- delay minutes;
- route;
- hub history;
- exceptions;
- notification history.

## Required API endpoints

```text
GET    /api/v1/dashboard/summary
GET    /api/v1/shipments
GET    /api/v1/shipments/:id
GET    /api/v1/shipments/:id/events
GET    /api/v1/shipments/:id/eta
GET    /api/v1/shipments/:id/route
GET    /api/v1/shipments/:id/notifications

GET    /api/v1/fleet
GET    /api/v1/hubs
GET    /api/v1/hubs/:id

GET    /api/v1/exceptions
PATCH  /api/v1/exceptions/:id

GET    /api/v1/analytics/kpis

GET    /api/v1/public/tracking/:trackingToken

GET    /api/v1/realtime/stream
```

## Demo requirements

The developer must seed at least:
- on-time shipments;
- at-risk shipments;
- delayed shipments;
- route deviation;
- hub dwell;
- no movement;
- delivered shipment.

The UI must make the data feel live using the simulator.

## Phase plan

### Days 1–2: Foundation
- project setup;
- data model;
- seed data;
- dashboard;
- shipment milestones.

### Days 3–6: Intelligence
- ETA;
- delay risk;
- route deviation;
- hub dwell;
- exceptions.

### Days 7–9: Customer layer
- tracking link;
- revised ETA;
- simulated WhatsApp/SMS/email;
- pilot measurement.

### Day 10: Review & scale
- user feedback;
- fixes;
- KPI review;
- go/no-go;
- rollout plan.

## First demo flow

1. Open Control Tower.
2. Show KPI cards.
3. Show live vehicle movement.
4. Open OML123456-style delayed shipment.
5. Show Agra location and revised ETA.
6. Show traffic reason.
7. Open exception.
8. Assign to operations.
9. Resolve exception.
10. Open customer tracking page.
11. Show customer notification.
12. Open analytics.

## Important handoff rule

The frontend must not be rebuilt when real data arrives.

Only the data provider/repository/integration layer should need to change in the first real-integration iteration.
