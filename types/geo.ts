/** [longitude, latitude] — GeoJSON coordinate order. */
export type LngLat = [number, number];

export interface GeoPoint {
  lat: number;
  lng: number;
  headingDeg?: number;
  speedKph?: number;
  /** ISO-8601 UTC timestamp of the reading at source. */
  recordedAt: string;
}

/** Raw GPS reading as ingested (brain/04_DATA_MODEL.md §5). */
export interface GpsPoint {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKph?: number;
  headingDeg?: number;
  recordedAt: string;
  receivedAt: string;
  source: "DEMO" | "GPS_PROVIDER";
}
