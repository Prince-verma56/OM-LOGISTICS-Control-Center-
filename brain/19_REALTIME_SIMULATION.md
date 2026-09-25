# 19 Real-Time Simulation

## 1. Purpose

Make dummy data behave like a live system so the stakeholder demo shows operational value.

## 2. Simulator loop

Every configurable interval:
1. move selected vehicles;
2. update GPS point;
3. recalculate ETA;
4. change risk state;
5. potentially create an exception;
6. update dashboard event stream.

## 3. Simulation controls

Admin/demo controls:
- Start simulation.
- Pause.
- Reset.
- Speed x1.
- Speed x5.
- Speed x20.

## 4. Demo event types

```ts
type DemoEvent =
  | "MOVE_VEHICLE"
  | "TRAFFIC_INCREASE"
  | "HUB_DWELL_INCREASE"
  | "ETA_SHIFT"
  | "CREATE_ROUTE_DEVIATION"
  | "RESOLVE_EXCEPTION"
  | "COMPLETE_DELIVERY";
```

## 5. UI feedback

Topbar should show:
- Demo Data;
- Live Simulation ON/OFF;
- Last updated time.

## 6. Persistence

For a stable demo:
- persist simulator state to database;
- do not create duplicate events after refresh;
- allow reset to seed state.

## 7. Future replacement

Replace:
`DemoSimulator`

with:
`ExternalEventConsumer`

without changing the dashboard components.
