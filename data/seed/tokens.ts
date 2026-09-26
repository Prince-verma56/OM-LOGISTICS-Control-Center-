import { createHmac } from "node:crypto";

/**
 * Opaque public tracking token (ADR-005): HMAC-SHA256(secret, shipmentId),
 * base64url, 24 chars. Unguessable without the server secret, stable across
 * reseeds so shared demo links keep working.
 */
export function trackingToken(shipmentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`tracking:${shipmentId}`).digest("base64url").slice(0, 24);
}
