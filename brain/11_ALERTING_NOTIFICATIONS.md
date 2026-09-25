# 11 Alerting and Notifications

## 1. Alert types

### Delay Risk
Shipment is likely to miss promised delivery.

### Hub Dwell
Shipment stays at a hub longer than configured.

### No Movement
Vehicle remains stationary beyond a configured threshold.

### Route Deviation
Actual movement departs from planned route beyond the allowed tolerance.

### Traffic
Traffic condition is expected to materially affect ETA.

### Stale GPS
Vehicle position has not updated within the configured freshness window.

### Missed Milestone
Expected event was not observed within its time window.

## 2. Severity

- INFO
- WARNING
- HIGH
- CRITICAL

## 3. Alert lifecycle

```text
DETECTED
   |
   v
OPEN
   |
   +--> IN_PROGRESS
   |       |
   |       v
   |     RESOLVED
   |
   +--> DISMISSED
```

## 4. Notification triggers

### Shipment update
Trigger on meaningful shipment milestone changes.

### Delay notice
Trigger when a delay crosses the customer communication threshold.

### Revised ETA
Trigger when revised ETA changes materially.

### Tracking link
Include on customer notifications where configured.

## 5. Channel abstraction

```ts
interface NotificationProvider {
  send(
    channel: "WHATSAPP" | "SMS" | "EMAIL",
    message: NotificationMessage
  ): Promise<NotificationResult>;
}
```

Demo provider:
- records the notification;
- simulates delivery;
- does not send a real message.

Production providers can implement the same interface later.

## 6. Templates

### Delay
```text
OM Logistics Shipment Update

Shipment: {{trackingNumber}}
Current location: {{location}}
Reason: {{delayReason}}
Previous ETA: {{previousEta}}
Revised ETA: {{revisedEta}}

Track: {{trackingLink}}
```

## 7. Deduplication

Do not send repeated notifications for the same event.

Use:
- event ID;
- template;
- channel;
- shipment ID.

## 8. Configurable thresholds

Thresholds must be configurable per environment and, where needed, per business rule.

Examples:
```text
NO_MOVEMENT_MINUTES
HUB_DWELL_WARNING_MINUTES
HUB_DWELL_CRITICAL_MINUTES
ETA_CHANGE_NOTIFICATION_MINUTES
STALE_GPS_MINUTES
ROUTE_DEVIATION_METERS
```
