/**
 * SHOOT! — Deterministic random number generation.
 *
 * Two things need reproducible randomness:
 *   1. Procedural artwork (mountain silhouettes, dune profiles, star fields) —
 *      so the desert looks the same every frame instead of boiling.
 *   2. The "guided randomness" encounter generator, so a saved run can rebuild
 *      the exact same stretch of world after a reload.
 *
 * mulberry32: 32-bit, fast, good enough spread for a game, 4 lines long.
 */

export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** Float in [min, max). */
  rng.range = (min, max) => min + rng() * (max - min);
  /** Integer in [min, max] inclusive. */
  rng.int = (min, max) => Math.floor(min + rng() * (max - min + 1));
  /** Pick one element of an array. */
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  /** True with probability p. */
  rng.chance = (p) => rng() < p;
  /** In-place Fisher-Yates shuffle. */
  rng.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  /**
   * Weighted pick: takes { key: weight } and returns a key.
   */
  rng.weighted = (weights) => {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = rng() * total;
    for (const [key, w] of entries) {
      roll -= w;
      if (roll <= 0) return key;
    }
    return entries.length ? entries[entries.length - 1][0] : null;
  };
  return rng;
}

/** A shared, non-reproducible generator for cosmetic one-off decisions. */
export const rand = makeRng((Math.random() * 0xffffffff) >>> 0);

/** Turn any string into a 32-bit seed (used for named world segments). */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
