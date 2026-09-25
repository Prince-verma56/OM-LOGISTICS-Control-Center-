# 20 Intelligence Specification

## 1. Scope

The presentation proposes:
- Predictive ETA;
- Delay Risk;
- Route Deviation;
- Exception Detection.

The first prototype can use deterministic rules and simple weighted logic. A true machine-learning model can be introduced after historical data and validation are available.

## 2. Predictive ETA input

Potential inputs:
- current latitude/longitude;
- route;
- distance remaining;
- recent average speed;
- traffic state;
- historical lane transit time;
- hub delay;
- time of day;
- day of week.

## 3. ETA output

```ts
type EtaResult = {
  predictedEtaAt: string;
  delayMinutes: number;
  confidence: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: {
    code: string;
    label: string;
    impactMinutes?: number;
  }[];
};
```

## 4. Prototype ETA approach

Example conceptual formula:

```text
ETA =
  currentTime
  + remainingRouteTime
  + trafficImpact
  + expectedHubDelay
  + historicalAdjustment
```

The exact production model should be validated against real historical data.

## 5. Risk rules

Suggested:
- LOW: within service promise with comfortable buffer.
- MEDIUM: buffer becoming small.
- HIGH: likely to breach promise.
- CRITICAL: predicted breach is severe or already breached.

Use configured thresholds.

## 6. Route deviation

Inputs:
- planned polyline;
- actual GPS points.

Output:
```ts
type RouteDeviationResult = {
  deviated: boolean;
  distanceFromRouteMeters: number;
  detectedAt: string;
  confidence: number;
};
```

## 7. Explainability

Every risk alert should expose a short reason:
- "Heavy traffic detected."
- "Hub dwell 48 min above threshold."
- "Vehicle stationary for 32 min."
- "Revised ETA is 85 min after promised delivery."

## 8. Accuracy KPI

ETA accuracy should compare predicted ETA with actual arrival.

Track:
- absolute error in minutes;
- mean absolute error;
- percentage within chosen tolerance.

The business may later choose the exact success threshold.
