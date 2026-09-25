# 08 UI Specification

## 1. Visual direction

Inspired by the supplied OM Logistics presentation:
- white/very light background;
- OM blue family;
- clean enterprise cards;
- rounded corners;
- strong information hierarchy;
- map-centric center area;
- restrained gradients;
- minimal visual noise.

Avoid:
- neon dashboards;
- excessive glassmorphism;
- oversized animations;
- gaming-style UI.

## 2. Main control tower

### Header
- OM Logistics title/brand area;
- page title: Intelligent Control Tower;
- live/demo indicator;
- current time;
- notification icon;
- user menu.

### KPI strip
Cards:
1. Active Shipments.
2. Vehicles in Transit.
3. At Risk.
4. On-Time Delivery.
5. Open Exceptions.

Each card:
- current value;
- small delta;
- tooltip definition;
- click-through destination where applicable.

### Filter bar
Fields:
- date range;
- status;
- risk level;
- customer;
- origin;
- destination;
- hub;
- vehicle;
- search.

Buttons:
- Apply.
- Reset.
- Save view.

### Main grid
Left:
- live map.

Right:
- exception list.

Bottom:
- shipment list.

## 3. Live map

Show:
- vehicle markers;
- route lines;
- origin/destination markers;
- selected shipment path;
- traffic state;
- hub markers.

Marker states:
- normal;
- at risk;
- delayed;
- stopped;
- delivered.

Map interactions:
- hover tooltip;
- click vehicle;
- click shipment;
- fit-to-route;
- zoom to hub.

## 4. Shipment table

Columns:
- Tracking No.
- Customer.
- Origin.
- Destination.
- Status.
- Vehicle.
- ETA.
- Delay.
- Risk.
- Last Updated.
- Action.

Rows must support:
- click to open detail;
- context action;
- visual risk state.

## 5. Shipment detail page

Sections:
1. Summary.
2. Journey timeline.
3. Live location/map.
4. ETA panel.
5. Route intelligence.
6. Exceptions.
7. Hub history.
8. Notification history.

## 6. Timeline

Use the six milestones from the presentation.

Current milestone:
- visually emphasized.

Completed milestone:
- success state.

Future milestone:
- neutral state.

Delayed milestone:
- warning state.

## 7. Exception center

Filters:
- severity;
- type;
- status;
- assignee;
- hub;
- date.

Exception card:
- title;
- shipment;
- location;
- detected time;
- severity;
- revised ETA;
- action buttons.

## 8. Action drawer

Actions:
- assign;
- change status;
- add note;
- escalate;
- resolve.

## 9. Customer tracking page

Mobile-first.

Show:
- OM Logistics branding;
- tracking number;
- status;
- origin/destination;
- timeline;
- current position when available;
- ETA;
- delay notice;
- tracking last updated.

Avoid internal operational details.

## 10. Analytics page

Visuals:
- KPI cards;
- ETA accuracy trend;
- OTIF trend;
- delay response trend;
- hub dwell trend;
- route exception trend;
- customer query volume.

## 11. Responsive rules

Desktop:
- full dashboard;
- side navigation;
- map/table split.

Tablet:
- stacked cards;
- collapsible filters.

Mobile:
- simplified KPI cards;
- list-first shipment experience;
- map opens as focused view.

## 12. Loading states

Use skeletons for:
- KPI cards;
- map data panel;
- shipment table;
- exceptions.

## 13. Empty states

Examples:
- "No exceptions matching your filters."
- "No shipments found."
- "No recent GPS updates."

## 14. Demo mode badge

A visible but non-intrusive:
`DEMO DATA · SIMULATED`

must appear while using dummy data.
