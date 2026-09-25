# OM Logistics Intelligent Control Tower

## Documentation Pack

This documentation pack is the implementation "brain" for the OM Logistics Intelligent Control Tower prototype.

The project will be built as a professional, real-time-looking web application using **Next.js + TypeScript** and **dummy/simulated data for the pilot/demo**.

Later, the same contracts and UI will be connected to real OM Logistics data sources after approval and access are provided.

## Source of truth

The business requirements in this pack are derived from the supplied OM Logistics presentation.

### Requirements explicitly shown in the presentation

- Centralized supply chain control tower for real-time visibility and proactive customer communication.
- Existing situation:
  - Shipment tracking is available.
  - Multiple operational data sources exist.
  - Delays may require manual follow-up.
  - Customers often contact support for shipment status.
- Opportunity:
  - Centralized visibility.
  - Predictive ETA.
  - Route and traffic intelligence.
  - Automatic exception detection.
  - Proactive customer alerts.
- Data inputs:
  - GPS.
  - TMS.
  - WMS.
  - Hub data.
  - Shipment data.
  - Traffic data.
  - Historical data.
- Control tower views:
  - Live shipment map.
  - Fleet status.
  - Hub dwell.
  - Route status.
  - ETA.
  - Exception alerts.
- Intelligence:
  - Predictive ETA.
  - Delay risk.
  - Route deviation.
  - Exception detection.
- Operations actions:
  - Reroute/alternate route.
  - Escalate to hub/transport partner.
  - Resolve exceptions.
- Customer communication:
  - Shipment update.
  - Reason for delay.
  - Revised ETA.
  - Tracking link.
  - WhatsApp/SMS/email channels.
- Shipment journey:
  - Order Booked.
  - Shipment Picked Up.
  - In Transit.
  - Hub Reached.
  - Out for Delivery.
  - Delivered.
- Pilot:
  - Days 1–2: Foundation.
  - Days 3–6: Intelligence.
  - Days 7–9: Customer Layer.
  - Day 10: Review & Scale.
- KPIs:
  - ETA Accuracy.
  - OTIF.
  - Delay Response Time.
  - Customer Queries.
  - Hub Dwell.
  - Route Exceptions.

## Proposed technical additions

The presentation does not specify database schemas, exact field names, API payloads, authentication, deployment, UI component structure, or technology versions.

Those items are defined in this documentation as **implementation proposals** so the developer has an unambiguous starting point.

## Recommended build order

1. Dummy data model.
2. API contracts.
3. Dashboard shell.
4. Shipment detail page.
5. Map and simulated movement.
6. Exception center.
7. ETA/risk intelligence.
8. Customer tracking page.
9. Notification simulation.
10. KPI analytics.
11. Authentication and roles.
12. Testing, observability and production checklist.
