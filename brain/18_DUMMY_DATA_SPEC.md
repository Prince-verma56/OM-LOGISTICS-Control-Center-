# 18 Dummy Data Specification

## 1. Goal

Create realistic logistics data so the dashboard looks and behaves like a live control tower.

## 2. Dataset size for initial demo

Suggested seed:
- 25 customers;
- 100 vehicles;
- 20 hubs;
- 500 active shipments;
- 150 delivered shipments;
- 2,000 shipment events;
- 5,000 GPS points;
- 100 exceptions;
- 300 notification records.

These volumes are development suggestions and can be adjusted.

## 3. Geography

Use representative Indian logistics lanes because the supplied presentation shows a pan-India concept and example cities such as:
- Delhi;
- Mumbai;
- Bengaluru;
- Chennai;
- Kolkata;
- Agra.

## 4. Demo scenarios that must exist

### Scenario A: On-time shipment
Normal route, no exception.

### Scenario B: Traffic delay
Agra -> Delhi style route scenario.
Example values from the presentation:
- shipment: OML123456;
- current location: Agra;
- previous ETA: 6:30 PM;
- revised ETA: 8:30 PM;
- reason: heavy traffic.

For the UI prototype, these values are illustrative demo data.

### Scenario C: Hub dwell
Shipment has remained at a hub beyond configured threshold.

### Scenario D: Route deviation
Vehicle moves outside the planned route corridor.

### Scenario E: No movement
Vehicle remains stationary for an extended period.

### Scenario F: Delivered
Shipment completes all milestones.

## 5. Data realism rules

- Generate consistent timestamps.
- GPS points should roughly follow route geometry.
- ETA should change when simulated conditions change.
- Shipment status must agree with event history.
- Delivered shipments must have deliveredAt.
- Active shipments cannot have deliveredAt.
- Route deviation should create an exception.

## 6. Seed command

Suggested:
```bash
npm run db:seed
```
