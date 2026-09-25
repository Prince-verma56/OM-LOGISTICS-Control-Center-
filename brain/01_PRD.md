# 01 Product Requirements Document

## 1. Product name

**OM Logistics Intelligent Control Tower**

## 2. Product statement

A centralized supply chain control tower that turns shipment, fleet, hub, traffic and historical data into a unified operational view, predictive insight and proactive customer communication.

## 3. Problem

The supplied presentation describes a situation where tracking exists but operational information is spread across multiple sources. Delays can require manual follow-up and customers may contact support for status updates.

The proposed product adds a centralized, intelligent operating layer.

## 4. Primary users

### Operations team
Needs to:
- see active shipments;
- identify at-risk shipments;
- investigate exceptions;
- act on route or hub issues;
- assign and resolve exceptions.

### Operations manager
Needs to:
- understand network performance;
- review exception trends;
- monitor KPIs;
- see hubs, routes and fleet status.

### Customer support
Needs to:
- search shipment status;
- see current ETA;
- understand delay reason;
- share a tracking link;
- see customer notification status.

### Customer
Needs to:
- view shipment progress;
- see latest location when available;
- see ETA;
- receive delay notifications;
- open a tracking link.

## 5. Core user journeys

### Journey A: Operations monitoring

Dashboard -> identify At Risk shipment -> open shipment -> inspect route/hub/ETA -> take action -> record action -> resolve alert.

### Journey B: Customer self-service

Customer opens tracking link -> sees milestone timeline -> sees current status/ETA -> sees proactive delay message if relevant.

### Journey C: Manager review

Dashboard -> KPI view -> choose date range/hub/customer/route -> inspect exceptions -> drill into shipments.

## 6. Functional requirements

### FR-001 Dashboard
Show:
- total active shipments;
- vehicles in transit;
- at-risk shipments;
- on-time delivery;
- live map;
- shipment status table;
- exception panel;
- hub status;
- filters.

### FR-002 Shipment search
Search by:
- shipment ID;
- customer;
- vehicle number;
- origin;
- destination;
- status.

### FR-003 Shipment journey
Show:
1. Order Booked
2. Shipment Picked Up
3. In Transit
4. Hub Reached
5. Out for Delivery
6. Delivered

### FR-004 Fleet view
Show:
- vehicle number;
- current location;
- shipment count;
- route;
- movement status;
- last GPS update.

### FR-005 Hub view
Show:
- hub;
- arrivals;
- departures;
- shipments waiting;
- average dwell;
- current high-dwell exceptions.

### FR-006 Route status
Show:
- planned route;
- actual route;
- route deviation;
- traffic status;
- estimated route duration.

### FR-007 Predictive ETA
Show:
- original ETA;
- revised ETA;
- prediction generated at;
- ETA delta;
- confidence/risk status.

### FR-008 Delay risk
Flag shipments where current conditions indicate a probable service breach.

### FR-009 Route deviation
Compare actual route with planned route and flag deviations.

### FR-010 Exception detection
Support:
- hub dwell exception;
- no-movement exception;
- route deviation;
- traffic exception;
- missed milestone;
- stale GPS/data freshness exception.

### FR-011 Exception workflow
Statuses:
- Open;
- In Progress;
- Resolved;
- Dismissed.

Actions:
- assign;
- reassign;
- add note;
- escalate;
- resolve.

### FR-012 Customer notification
Support event-driven notification records for:
- shipment update;
- delay reason;
- revised ETA;
- tracking link.

Channels:
- WhatsApp;
- SMS;
- Email.

The pilot may simulate sending while preserving a production-ready notification contract.

### FR-013 Customer tracking page
Public page using tracking token.

### FR-014 KPI analytics
Measure:
- ETA Accuracy;
- OTIF;
- Delay Response Time;
- Customer Queries;
- Hub Dwell;
- Route Exceptions.

## 7. Non-functional requirements

- Responsive web application.
- Fast dashboard interactions.
- API validation.
- Role-based access.
- Audit logging.
- Structured error handling.
- Observability.
- Secure secret handling.
- No hardcoded credentials.
- Clear dummy-data labeling.

## 8. Pilot acceptance criteria

The pilot is accepted when a user can:
1. open the dashboard;
2. filter shipments;
3. open a shipment;
4. view route and status;
5. see ETA and risk;
6. see at least one simulated exception;
7. assign and resolve an exception;
8. open a customer tracking link;
9. see a simulated notification event;
10. view KPI cards/charts.

## 9. Out of scope for the first prototype

- Production GPS vendor onboarding.
- Production TMS/WMS integrations.
- Financial billing.
- Route optimization as an autonomous dispatcher.
- Full ML training pipeline from scratch.
- Production WhatsApp/SMS vendor credentials.
- Customer account management beyond tracking.
