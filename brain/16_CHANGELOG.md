# 16 Changelog

All meaningful product and technical changes should be recorded here.

## Format

```text
## [date]
### Added
### Changed
### Fixed
### Decision
### Migration
```

## Initial baseline

### Added
- Control tower product documentation.
- Dummy data strategy.
- Normalized data model.
- API contract.
- UI specification.
- Alerting specification.
- Security baseline.
- Testing baseline.
- Production checklist.

### Note
Initial scope is a demo/prototype using simulated data.

## [2026-09-26] Phase 1 — premium prototype foundation

### Added
- Next.js 16 app (root `app/`), shadcn/ui (radix-nova), Tailwind 4 design tokens (navy/blue, dark default + light), Inter + JetBrains Mono.
- Domain contracts (`types/`), status/threshold constants, Zod schemas, versioned `/api/v1` route handlers with request ids and the stable error contract.
- Deterministic seed: 25 customers, 100 vehicles, 20 hubs, 34 routes (17 Indian lanes), 500 active + 150 delivered shipments, ~2.9k events, ~5.2k GPS points, 100 exceptions, 300 notifications, 60-day KPI history; scenarios A–F incl. OML123456.
- Repository interfaces with dummy implementations; services for shipments, fleet, hubs, ETA, alerts, notifications, KPIs and simulation.
- Live simulation (SSE with polling fallback): vehicle movement, hub dwell, deliveries, bookings, organic incidents, presenter scenario triggers; ETA/risk recompute, exception create/escalate/auto-resolve, in-app notifications (Sonner + notification center).
- Pages: control tower (map-centric), shipments, shipment detail, fleet, hubs, exception center (RHF + Zod action drawer with audit trail), analytics, customer tracking.
- Prisma 7 PostgreSQL schema, initial migration (`prisma/migrations/20260926084003_init`) and idempotent seed script, verified against a local Prisma Postgres; not used in DEMO_MODE. Vitest suite.

### Decision
- Phase 1 notifications are in-app only (demo provider). WhatsApp/SMS/email remain documented interfaces.
- Operational timestamps use a simulated clock (IST presentation) so ETA, risk and "last updated" stay coherent at 1x/5x/20x.
- Delay = revised ETA − original ETA; risk = buffer between revised ETA and promised delivery.
