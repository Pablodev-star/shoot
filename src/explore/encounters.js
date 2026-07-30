/**
 * SHOOT! — Guided-random encounter generator (Block 3a).
 *
 * The player never picks a level. They walk, and the road decides. But "fully
 * random" is bad design — a stretch with no shop and no inn is unwinnable, and
 * one with five shops in a row is boring. So each world segment is generated
 * with *guarantees*:
 *
 *   - at least `minEnemies` duels
 *   - at least `minShops` shops, each one immediately followed by an inn
 *     (the inn-after-shop rule from the spec)
 *   - the remaining slots up to `total` are filled with extra duels
 *   - order and spacing are shuffled freely inside those guarantees
 *   - the world boss always closes the segment
 *
 * Distances are in source pixels; the walk engine converts them to time using
 * the current speed (which the horse multiplies).
 */

import { makeRng, hashSeed } from '../core/rng.js';
import { getWorld } from '../game/worlds.js';

/** Spacing between encounters, in source pixels. */
export const MIN_GAP = 320;
export const MAX_GAP = 780;
/** The run-up to a boss is always long — it should feel like a march. */
export const BOSS_GAP = 1050;

/**
 * Build the full event list for one world.
 * @param {number} worldId
 * @param {number|string} seed
 * @returns {{worldId:number, events:Array, totalDistance:number}}
 */
export function generateSegment(worldId, seed) {
  const world = getWorld(worldId);
  const cfg = world.encounters;
  const rng = makeRng(typeof seed === 'string' ? hashSeed(seed) : seed >>> 0);

  // --- 1. Build the guaranteed units -------------------------------------
  // A "unit" is either a single enemy or an inseparable [shop, inn] pair.
  const pairCount = Math.max(cfg.minShops, cfg.minInns);
  const units = [];
  for (let i = 0; i < pairCount; i++) units.push(['shop', 'inn']);
  for (let i = 0; i < cfg.minEnemies; i++) units.push(['enemy']);

  // --- 2. Fill the remaining slots ---------------------------------------
  const guaranteed = pairCount * 2 + cfg.minEnemies;
  let remaining = Math.max(0, cfg.total - guaranteed);
  while (remaining > 0) {
    if (remaining >= 2 && rng.chance(0.22)) {
      units.push(['shop', 'inn']);
      remaining -= 2;
    } else {
      units.push(['enemy']);
      remaining -= 1;
    }
  }

  // --- 3. Shuffle, then fix the opening ----------------------------------
  rng.shuffle(units);
  // A world should never open with a shop you cannot afford anything in, and
  // never open with the boss run-up: force a duel first.
  const firstEnemy = units.findIndex((u) => u[0] === 'enemy');
  if (firstEnemy > 0) {
    const [unit] = units.splice(firstEnemy, 1);
    units.unshift(unit);
  }

  // --- 4. Flatten into positioned events ---------------------------------
  const events = [];
  let distance = 0;
  for (const unit of units) {
    for (const type of unit) {
      // An inn sits right beside its shop — a short walk, not a fresh journey.
      const gap = type === 'inn' ? rng.int(120, 210) : rng.int(MIN_GAP, MAX_GAP);
      distance += gap;
      events.push({ index: events.length, type, distance, gap, resolved: false });
    }
  }

  // --- 5. Boss ------------------------------------------------------------
  distance += BOSS_GAP;
  events.push({
    index: events.length,
    type: 'boss',
    distance,
    gap: BOSS_GAP,
    resolved: false,
  });

  return { worldId, seed, events, totalDistance: distance };
}

/**
 * What the Map item reveals: the next `count` encounters with a rough distance
 * ("just ahead" / "a short ride" / "far off") instead of exact numbers — the
 * spec is explicit that the player must never see a precise progress readout.
 */
export function peekAhead(segment, currentIndex, travelled, count = 3) {
  const upcoming = segment.events.slice(currentIndex, currentIndex + count);
  return upcoming.map((event) => {
    const away = event.distance - travelled;
    let proximity = 'far off';
    if (away < 250) proximity = 'just ahead';
    else if (away < 700) proximity = 'a short walk';
    else if (away < 1300) proximity = 'a fair ride';
    return { type: event.type, proximity, index: event.index };
  });
}

/** Human-readable label for an encounter type. */
export const ENCOUNTER_LABELS = {
  enemy: 'Duel',
  shop: 'Shop',
  inn: 'Inn',
  boss: 'Boss',
};
