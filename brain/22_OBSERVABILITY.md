# 22 Observability

## 1. Application metrics

Track:
- request count;
- request latency;
- error rate;
- active users;
- real-time stream connections.

## 2. Domain metrics

Track:
- shipments processed;
- GPS events processed;
- exceptions created;
- exceptions resolved;
- notifications queued;
- notifications delivered;
- ETA predictions generated.

## 3. Integration metrics

For each source:
- last success;
- latency;
- failure count;
- stale duration;
- records accepted;
- records rejected.

## 4. Structured logs

Use JSON logs where possible.

Example:
```json
{
  "level": "info",
  "event": "ETA_UPDATED",
  "shipmentId": "shp_10001",
  "requestId": "req_123",
  "generatedAt": "2026-09-26T12:00:00Z"
}
```

## 5. Health endpoints

Recommended:
- `/api/health`
- `/api/ready`

Readiness should verify required dependencies.

## 6. Alerts

Operational engineering alerts:
- database unavailable;
- ingestion failures;
- high API error rate;
- stale integrations;
- real-time stream failure.
