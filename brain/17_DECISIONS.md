# 17 Decisions

## ADR-001: Use Next.js

**Decision:** Use Next.js with App Router and TypeScript.

**Reason:** The project needs a modern professional web application with shared frontend and backend capability for the prototype.

**Status:** Accepted.

## ADR-002: Build as a modular monolith first

**Decision:** Keep initial backend capabilities inside the Next.js application using domain services.

**Reason:** The pilot is small enough that microservices would add operational complexity without a proven need.

**Status:** Accepted.

## ADR-003: Dummy provider behind an adapter

**Decision:** All demo data enters through repository/provider interfaces.

**Reason:** Real integrations can replace the demo providers later.

**Status:** Accepted.

## ADR-004: API versioning

**Decision:** Use `/api/v1`.

**Reason:** Allows future contract evolution.

**Status:** Accepted.

## ADR-005: Public tracking token

**Decision:** Customer tracking uses opaque public tokens instead of shipment IDs alone.

**Reason:** Reduces enumeration risk and limits exposure of internal identifiers.

**Status:** Accepted.

## ADR-006: Real-time transport is abstracted

**Decision:** UI subscribes to application events without depending on a single transport.

**Reason:** Prototype may use SSE or polling while production may use a dedicated real-time/event infrastructure.

**Status:** Accepted.

## ADR-007: No production scraping in prototype

**Decision:** Do not rely on uncontrolled web scraping for the pilot.

**Reason:** The presentation identifies traffic data as an input but does not specify a source. An adapter should be used once an approved source is selected.

**Status:** Accepted.
