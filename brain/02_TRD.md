# 02 Technical Requirements Document

## 1. Required stack

### Frontend
- Next.js with App Router.
- TypeScript.
- Tailwind CSS.
- Component system such as shadcn/ui.
- TanStack Query for client-side server state where needed.
- Zod for validation and shared schemas.
- Recharts or equivalent charting library.
- Map rendering using a production-suitable map library.

### Backend
Use Next.js Route Handlers for the initial modular monolith.

Domain services:
- shipmentService;
- fleetService;
- hubService;
- etaService;
- alertService;
- notificationService;
- kpiService.

### Data
Recommended:
- PostgreSQL for transactional data.
- ORM such as Prisma or Drizzle.
- Redis is optional for later scale, queues, caching and real-time fan-out.

## 2. Application shape

```text
Browser
  |
  v
Next.js App Router
  |
  +--> Server Components
  +--> Client Components
  |
  +--> Route Handlers /api/v1/*
            |
            +--> Domain Services
                    |
                    +--> Dummy Repository
                    +--> Future TMS/WMS/GPS adapters
                    +--> Future traffic adapter
```

## 3. Environment separation

- local
- development
- staging
- production

The prototype should also have:
- DEMO_MODE=true
- SIMULATION_SPEED
- MAP_PROVIDER
- DATABASE_URL
- AUTH_SECRET
- NOTIFICATION_PROVIDER_MODE

## 4. API principles

- REST-style endpoints.
- JSON.
- `/api/v1`.
- ISO-8601 UTC timestamps.
- pagination on collections.
- stable error format.
- Zod validation.
- request IDs for tracing.

## 5. Real-time update strategy

Prototype:
- Server-Sent Events or short polling.

Production evolution:
- WebSocket/SSE gateway or event-driven updates.

The UI should not depend on one specific real-time transport.

## 6. Performance targets

Proposed targets for the prototype:
- initial usable screen within 3 seconds on normal broadband;
- filter interactions within 500 ms for local dummy data;
- API p95 below 800 ms for common read endpoints in a prototype environment;
- map should avoid rendering thousands of individual DOM markers.

These are engineering targets, not requirements stated in the presentation.

## 7. Browser requirements

Support current versions of:
- Chrome;
- Edge;
- Firefox;
- Safari.

## 8. Data correctness

Every location and operational event should carry:
- source;
- source timestamp;
- received timestamp;
- data quality/freshness state where applicable.
