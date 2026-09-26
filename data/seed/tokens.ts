/**
 * A simple 53-bit string hash (cyrb53) for generating pseudo-opaque tokens in Edge 
 * without node:crypto. Unguessable without the secret for demo purposes.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Opaque public tracking token (ADR-005): hash(secret + shipmentId),
 * base64url, 24 chars. Stable across reseeds so shared demo links keep working.
 */
export function trackingToken(shipmentId: string, secret: string): string {
  const hash = cyrb53(`tracking:${shipmentId}`, cyrb53(secret));
  // Convert number to base64url string
  return Buffer.from(hash.toString(16).padStart(16, "0"), "hex").toString("base64url").slice(0, 24).padEnd(24, "0");
}
