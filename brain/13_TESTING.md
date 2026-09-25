# 13 Testing

## 1. Test levels

### Unit
Test:
- status transitions;
- ETA calculations;
- risk logic;
- route deviation logic;
- KPI calculations;
- notification templates.

### Integration
Test:
- API + database;
- exception update;
- public tracking response;
- simulator event ingestion.

### E2E
Test:
1. dashboard opens;
2. filter shipments;
3. open shipment;
4. open exception;
5. assign exception;
6. resolve exception;
7. open customer tracking link;
8. view updated status.

## 2. Intelligence test cases

### ETA
Given:
- base route time;
- current traffic;
- current position;
- historical delay factor.

Expected:
- deterministic revised ETA for the same inputs.

### Delay risk
Given revised ETA after promised delivery:
- risk should be HIGH or CRITICAL according to configured threshold.

### Route deviation
Given actual point beyond allowed route corridor:
- create ROUTE_DEVIATION.

### Hub dwell
Given dwell > threshold:
- create HUB_DWELL.

## 3. Data quality tests

- invalid coordinates rejected;
- missing shipment ID rejected;
- invalid timestamp rejected;
- duplicate external event ignored;
- stale GPS marked stale.

## 4. Demo simulator tests

The same seed should produce repeatable baseline data for automated tests.
