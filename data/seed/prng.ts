/**
 * Deterministic PRNG (mulberry32). The same seed always yields the same
 * sequence, so the demo dataset is reproducible (brain/13 §4) and never
 * regenerated randomly on render.
 */
export interface Rng {
  next(): number;
  float(min: number, max: number): number;
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Approximately normal (Irwin–Hall, n=4). */
  normal(mean: number, stdDev: number): number;
  getState(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  const rng: Rng = {
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items, weights) => {
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      let roll = next() * total;
      for (let index = 0; index < items.length; index += 1) {
        roll -= weights[index];
        if (roll <= 0) return items[index];
      }
      return items[items.length - 1];
    },
    shuffle: (items) => {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(next() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
      }
      return copy;
    },
    normal: (mean, stdDev) => {
      const sum = next() + next() + next() + next();
      return mean + ((sum - 2) / Math.sqrt(4 / 12)) * stdDev;
    },
    getState: () => state,
  };
  return rng;
}

/** Stable 32-bit hash of a string (FNV-1a) — for per-entity variation. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
