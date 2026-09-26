# OM Logistics · Intelligent Control Tower (Phase 1 prototype)

A premium, real-time-looking control tower prototype: live shipment map, fleet and hub visibility, predictive ETA, exception detection and workflow, proactive in-app notifications and a customer tracking page.

> **All data is simulated.** Phase 1 runs on a deterministic seeded dataset plus a live simulation. No TMS, WMS, GPS, traffic or messaging systems are connected, and no external credentials are needed. The UI shows **DEMO DATA · SIMULATED** and **LIVE SIMULATION** at all times.

The `brain/` folder is the source of truth for requirements (PRD, API contract, data model, UI spec…).

## Quick start

```bash
npm install          # also copies the MapLibre worker and runs `prisma generate`
npm run dev          # http://localhost:3000 → /control-tower
```

Node 20.9+ (tested on Node 24). No `.env` is required; see `.env.example` for optional settings.

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js 16 (Turbopack) |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm run test` | Vitest — domain rules, seed, services, API guards |
| `npm run check` | lint + typecheck + test + build |
| `npm run db:generate` / `db:migrate` / `db:seed` | Prisma (only when `DATABASE_URL` is set) |

The demo never needs a database. To try the PostgreSQL foundation locally without Docker, run `npx prisma dev --detach`, set `DATABASE_URL` to the `postgres://…` URL it prints, then `npm run db:migrate` (applies `prisma/migrations/…_init`) and `npm run db:seed` (idempotent: it clears and reloads the demo dataset).

## Demo flow (≈5 minutes)

1. Open **/control-tower** — KPI strip, live map, critical exceptions, high-risk shipments, hub status, shipment table.
2. Vehicles move every 2 s (**1x / 5x / 20x**, pause, reset in the topbar). *Last updated* shows the simulated clock (IST).
3. **Scenarios → Traffic increase** — OML123456 (Kolkata → Delhi, at Agra on NH19): ETA moves ~2 h later, risk goes *On track → At risk*, TRAFFIC + DELAY_RISK exceptions open, Sonner toasts appear, the map flies to DL01AB1234.
4. Open **OML123456** — journey timeline, ETA factors, route intelligence (planned vs actual), hub history, notification history.
5. **Act** on the exception — *Assign to me* → *Resolve* (a note is required); the audit trail records every change.
6. **Customer view** — the public tracking link shows the delay notice without any internal data.
7. **Analytics** — pilot KPIs (ETA accuracy, OTIF, delay response, customer queries, hub dwell, route exceptions) with table views.

Other scenario triggers: route deviation, hub dwell +60 min, no movement, complete delivery. Seeded scenarios A–F (brain/18 §4) always exist after a reset.

## Architecture

```
UI (app/, components/, hooks/)        — never imports dummy data
  │  TanStack Query · SSE (/api/v1/realtime/stream, polling fallback)
  ▼
API  /api/v1/*  (app/api)             — Zod validation, request ids, stable error contract
  ▼
Services (services/)                  — shipment, fleet, hub, eta, alert, notification, kpi, simulation
  │  deterministic rules in lib/intelligence (ETA, risk, deviation, dwell, freshness)
  ▼
Repositories (data/repositories)      — interfaces in types.ts; Dummy* implementations today
  ▼
Demo store + DemoSimulator (data/)    — seeded dataset on globalThis; the simulator reports world changes
```

**Replacing demo data later:** implement the repository interfaces with PostgreSQL (schema in `prisma/schema.prisma`), feed them from TMS/WMS/GPS/traffic adapters, and swap `DemoSimulator` for an external event consumer that produces the same change signals. Services, API contracts and UI stay unchanged (ADR-003, ADR-006).

### Key directories

| Path | Contents |
|---|---|
| `types/` | Domain contracts (Shipment, Vehicle, Route, Hub, EtaPrediction, Exception, DemoNotification, KPIs, API envelopes, realtime events) |
| `lib/constants/` | Status vocabularies, labels, tones; business thresholds |
| `lib/intelligence/` | Pure, tested rules: ETA, risk bands, deviation, hub load, message copy |
| `lib/validation/` | Zod schemas shared by API handlers and forms |
| `lib/map/` | Map styles, layer specs, geo helpers (turf) |
| `data/seed/`, `data/fixtures/` | Deterministic generator (PRNG seed `20260926`), demo scenarios |
| `data/simulator/` | Vehicle movement, hub dwell, deliveries, bookings, scenario triggers |
| `config/demo.ts` | Tick interval, speeds, operator identity, assignees |

### Real-time simulation

- One tick every 2 s advances the simulated clock by 3 / 15 / 60 min (1x / 5x / 20x).
- The loop only runs while the simulation is running **and** a browser is connected (SSE, or the polling fallback), so an idle server does no work.
- Pipeline per tick: move vehicles → recompute ETA + risk → evaluate exception rules (create / escalate / auto-resolve) → notifications → hub load → realtime events.
- State lives in memory (process singleton that survives dev hot reload). **Multi-instance or serverless deployments need the database-backed repositories**; the demo is meant for a single Node process (`next dev` or `next start`).

### Notifications

Current pipeline: demo event → `notificationService.trigger()` → `DemoInAppNotificationProvider` → notification record → Sonner toast + notification center. Routine updates go to the center only; risk escalations, alerts and presenter-triggered events also toast. Deduplication uses shipment + template + channel + event.

**Future providers (documented only — not implemented, not required):** WhatsApp, SMS and email providers implement `NotificationProvider` (`types/notification.ts`) and are selected by `NOTIFICATION_PROVIDER_MODE`. Their keys (`WHATSAPP_API_KEY`, `SMS_API_KEY`, `EMAIL_API_KEY`) are listed in `.env.example` as commented placeholders.

### Map

MapLibre GL 6 through `react-map-gl/maplibre`, keyless OpenFreeMap styles (`MAP_PROVIDER=demo`, or `carto`). MapLibre 6 resolves its web worker relative to the library URL, which the bundler rewrites, so `scripts/copy-maplibre-worker.mjs` copies the version-matched worker to `public/vendor/maplibre-gl/` (postinstall / predev / prebuild) and the map calls `setWorkerUrl()`. If the basemap cannot load, the map falls back to a plain canvas and keeps showing lanes, hubs and vehicles.

## API (`/api/v1`)

| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/summary` | KPI strip values + deltas since simulation start |
| GET | `/dashboard/filter-options` | Customers, hubs, vehicles, routes, assignees |
| GET | `/shipments` | `page, pageSize, scope, status, riskLevel, hubId, vehicleId, customerId, routeId, search, from, to, sort, order` |
| GET | `/shipments/:id` | Shipment, timeline, vehicle, route, ETA, exceptions, notifications, hub history, events |
| GET | `/shipments/:id/events` · `/eta` · `/route` · `/notifications` | |
| GET | `/routes` | Planned lane network (geometry + hub stops) |
| GET | `/fleet` | `status, search, routeId` |
| GET | `/hubs` · `/hubs/:id` | |
| GET | `/exceptions` | `view, status, severity, type, hubId, assignedTo, shipmentId, from, to, page, pageSize` |
| GET / PATCH | `/exceptions/:id` | PATCH `{ status, assignedTo?, note? }`; invalid transitions → 409 |
| GET | `/analytics/kpis` | `from, to, hubId, customerId, routeId` |
| GET | `/public/tracking/:token` | Customer-safe projection; rate-limited |
| GET | `/notifications` | Notification center feed |
| POST | `/notifications/test` | DEMO_MODE only |
| GET | `/realtime/stream` | SSE, DEMO_MODE only |
| GET / POST | `/simulation` · POST `/simulation/scenarios` | Demo controls, DEMO_MODE only |

Errors always use `{ "error": { "code", "message", "requestId", "retryable?", "details?" } }`. `GET /api/health` reports liveness and the data source.

## Security notes

- Public tracking uses opaque HMAC tokens (`AUTH_SECRET`; a demo secret is used only in DEMO_MODE) and never returns customer IDs, risk metadata, exception notes, vehicle/driver data or precise GPS (coordinates are coarsened to ~10 km).
- Demo endpoints return 403 when `DEMO_MODE=false`. Baseline security headers are set in `next.config.ts`; a strict CSP is a production task.
- Authentication/RBAC are not part of Phase 1 (a demo operator identity is shown).

## Known limitations (Phase 1)

- In-memory data resets on server restart; single-process only.
- The Prisma schema, initial migration and seed are verified against a local Prisma Postgres (`prisma dev`), not yet a managed PostgreSQL server. The app still reads the in-memory store; database-backed repositories are future work.
- ETA and risk use deterministic rules, not a trained model; analytics history is simulated.
