# 05 Data Sources

## 1. Source inventory

The presentation names these input sources:

| Source | Intended information |
|---|---|
| GPS | Vehicle location and movement |
| TMS | Transport management data |
| WMS | Warehouse management data |
| Hub Data | Loading, unloading, dwell time |
| Shipment Data | Consignment details |
| Traffic Data | Live traffic and road conditions |
| Historical Data | Routes, transit time, delays |

## 2. Internal normalized layer

All sources should be normalized into:
- Shipment;
- Vehicle;
- GPS Point;
- Hub Event;
- Route;
- Traffic Snapshot;
- ETA Prediction;
- Exception.

## 3. Data fields

### GPS
Required:
- vehicleId;
- latitude;
- longitude;
- recordedAt.

Recommended:
- speedKph;
- headingDeg;
- ignition;
- accuracy.

### TMS
Required:
- shipmentId;
- vehicleId;
- origin;
- destination;
- promisedDeliveryAt;
- routeId;
- status.

Recommended:
- transporter;
- trip number;
- planned departure;
- planned arrival.

### WMS
Required:
- shipmentId;
- warehouse/hub;
- event type;
- event time.

### Hub
Required:
- hubId;
- shipmentId;
- arrivalAt;
- departureAt;
- dwell.

### Traffic
Required:
- route segment;
- severity/status;
- observedAt;
- estimated impact.

### Historical
Required:
- lane;
- historical transit minutes;
- delay distribution;
- hub dwell history.

## 4. Source priority

For current location:
1. latest trusted GPS position;
2. latest verified operational event;
3. last known position with stale indicator.

For milestone status:
1. TMS/WMS operational event;
2. normalized event stream;
3. simulator in demo mode.

## 5. Source freshness

Every source should expose a freshness value:
```text
fresh
stale
offline
unknown
```

Thresholds should be environment-configurable.

## 6. Source health panel

Create an internal integration page showing:
- source name;
- status;
- last successful sync;
- records received;
- last error;
- latency;
- freshness.
