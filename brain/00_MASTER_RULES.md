# 00 Master Rules

## 1. Product rule

The control tower is an intelligence and visibility layer. It should **connect existing logistics systems**, not replace them.

## 2. Demo vs production rule

The initial application uses dummy/simulated data.

Every integration boundary must be designed so that a real source can replace the dummy source later without rebuilding the UI.

Bad:
```ts
const shipment = hardcodedObject;
```

Good:
```ts
const shipment = await shipmentService.getById(id);
```

The service may currently read a dummy repository and later read an API/database repository.

## 3. Contract-first rule

Frontend and backend must agree on API contracts before feature implementation.

Use:
- TypeScript types.
- Zod validation.
- Versioned API routes.
- Stable IDs.
- ISO-8601 timestamps in UTC.

## 4. Real-time-looking rule

The prototype must feel live even with dummy data.

The demo layer should:
- update vehicle positions periodically;
- change shipment statuses;
- recalculate displayed ETA;
- generate sample alerts;
- show "last updated" timestamps;
- animate only where useful, never excessively.

The UI must clearly indicate that demo data is simulated.

## 5. UI rule

The visual direction is:
- premium enterprise logistics;
- high information density but clean hierarchy;
- map-centric;
- professional blue/white theme consistent with the supplied presentation;
- responsive;
- accessible.

## 6. Safety rule for business data

Never expose one customer's shipment to another customer.

Customer tracking pages must use an unguessable public tracking token.

## 7. Audit rule

Every operational action that changes alert state or shipment-related workflow must be auditable.

Store:
- actor;
- action;
- timestamp;
- old state;
- new state;
- optional note.

## 8. Intelligence rule

Predictive fields must always show:
- prediction time;
- predicted ETA;
- confidence/risk status;
- data freshness.

Do not present a prediction as a confirmed fact.

## 9. Failure rule

A stale or missing data source must not make the whole dashboard fail.

Use graceful degradation:
- show last known position;
- display data freshness;
- surface integration health;
- avoid silently showing stale data as current.

## 10. Scope rule

Phase 1 is a polished control-tower prototype.

Real third-party API contracts, live GPS integrations, production messaging credentials, and production ML training are later integration tasks.
