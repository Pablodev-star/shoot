/**
 * SHOOT! — Guided-random encounter generator (Block 3a).
 *
 * The player never picks a level. They walk, and the road decides. But "fully
 * random" is bad design — a stretch with no shop and no inn is unwinnable, and
 * one with five shops in a row is boring. So each world segment is generated
 * with *guarantees*:
 *
 *   - exactly `duels` duels, which is what the world's difficulty is measured in
 *   - one or two shops and, quite separately, one or two inns
 *   - at least SERVICE_GAP duels between any two of those stops
 *   - order and spacing shuffled freely inside those guarantees
 *   - the world boss always closes the segment
 *
 * A SHOP IS NOT A DOORWAY TO AN INN
 * ---------------------------------------------------------------------------
 * Shops and inns used to be generated as an inseparable `[shop, inn]` pair,
 * dropped on the road a hundred pixels apart. Every world therefore had exactly
 * as many inns as shops, they always arrived together, and the road had two
 * kinds of thing on it — "a fight" and "the services" — which made the choice
 * of what to spend gold on a single decision taken twice at the same counter.
 *
 * They are independent stops now. A world rolls its shops and its inns
 * separately (1 or 2 of each, and usually 2), shuffles them into one order, and
 * spaces them out with duels. So a stretch can offer a shop, three fights and
 * another shop with no bed anywhere in between — the trip you finish carrying
 * gold and no lives — or two inns and a single shop, which is the opposite
 * problem. Neither is a special case in here; both fall out of the roll.
 *
 * NOTHING IS EVER SHOULDER TO SHOULDER
 * ---------------------------------------------------------------------------
 * Two rules keep the stops apart, and they are deliberately different rules:
 *
 *   1. SERVICE_GAP duels sit between any two of them, so you never step out of
 *      a shop into another shop, or out of an inn into another inn, and never
 *      walk from a counter straight to a bed either. There is always a road in
 *      between, and something on it.
 *   2. SERVICE_MIN_GAP source pixels of approach in front of each one, which is
 *      the same rule expressed in distance rather than in events: a building
 *      should come up over the horizon and be walked towards, not appear.
 *
 * Distances are in source pixels; the walk engine converts them to time using
 * the current speed (which the horse multiplies).
 */

import { makeRng, hashSeed } from '../core/rng.js';
import { getWorld } from '../game/worlds.js';

/** Spacing between encounters, in source pixels. */
export const MIN_GAP = 320;
export const MAX_GAP = 780;
/** A shop or an inn is always approached, never stumbled into. */
export const SERVICE_MIN_GAP = 480;
/** The run-up to a boss is always long — it should feel like a march. */
export const BOSS_GAP = 1050;

/**
 * How many shops (and, rolled again, how many inns) a world gets. Two is the
 * normal shape of a world and one is the lean version of it, which is why the
 * odds are lopsided rather than a coin toss: at 50/50 a quarter of all worlds
 * would have a single shop *and* a single inn, and that stretch is noticeably
 * harder than its neighbours for a reason the player cannot see.
 */
export const SERVICE_PAIR_CHANCE = 0.8;

/** Duels that must sit between two service stops. Reduced only if it cannot fit. */
export const SERVICE_GAP = 2;

/** One or two, weighted towards two. */
function rollServiceCount(rng) {
  return rng.chance(SERVICE_PAIR_CHANCE) ? 2 : 1;
}

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
  const duels = Math.max(1, cfg.duels);

  // --- 1. What the road has on it ----------------------------------------
  const services = [
    ...Array(rollServiceCount(rng)).fill('shop'),
    ...Array(rollServiceCount(rng)).fill('inn'),
    ...Array(worldId === 1 ? 2 : (rng.chance(0.8) ? 1 : 0)).fill('forge'),
  ];
  rng.shuffle(services);

  // --- 2. How far apart it can afford to keep them ------------------------
  // The opening duel plus one gap per pair of stops is the minimum duel bill.
  // A world too short to pay it buys a smaller gap first, and only then gives
  // up a stop — and when it does, it gives up a duplicate, so a world can lose
  // its second shop but never its only inn. No world in the game is currently
  // tight enough to reach either branch; they exist so that adding one cannot
  // quietly produce a road with two counters side by side.
  let gap = SERVICE_GAP;
  const bill = () => 1 + gap * (services.length - 1);
  while (gap > 1 && bill() > duels) gap--;
  while (services.length > 1 && bill() > duels) dropDuplicate(services, rng);

  // --- 3. Deal the duels out around them ----------------------------------
  // One bucket in front of every stop, plus a last one between the final stop
  // and the boss. The first is at least one duel — a world should never open at
  // a counter you cannot afford anything at — the middle ones are the gap, and
  // the last may be empty, because arriving at a bed or a store right before
  // the boss is a good thing to be offered rather than a hole in the road.
  const buckets = new Array(services.length + 1).fill(0);
  buckets[0] = 1;
  for (let i = 1; i < services.length; i++) buckets[i] = gap;
  let spare = duels - buckets.reduce((sum, n) => sum + n, 0);
  while (spare > 0) {
    buckets[rng.int(0, buckets.length - 1)] += 1;
    spare -= 1;
  }

  // --- 4. Flatten into positioned events ----------------------------------
  const events = [];
  let distance = 0;
  const push = (type) => {
    const gapPx = type === 'enemy'
      ? rng.int(MIN_GAP, MAX_GAP)
      : rng.int(SERVICE_MIN_GAP, MAX_GAP);
    distance += gapPx;
    events.push({ index: events.length, type, distance, gap: gapPx, resolved: false });
  };

  buckets.forEach((count, i) => {
    for (let n = 0; n < count; n++) push('enemy');
    if (services[i]) push(services[i]);
  });

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
 * Remove one stop of whichever kind there are two of, so trimming a road that
 * cannot hold everything never costs the player their only inn or their only
 * shop. Falls back to dropping the last one if both kinds are already single.
 */
function dropDuplicate(services, rng) {
  const counts = services.reduce((acc, type) => ({ ...acc, [type]: (acc[type] || 0) + 1 }), {});
  const doubled = services.filter((type) => counts[type] > 1);
  const victim = doubled.length ? rng.pick(doubled) : services[services.length - 1];
  services.splice(services.lastIndexOf(victim), 1);
}

/**
 * Where an encounter actually sits on the road, in travelled pixels.
 *
 * The horse does not move the encounters — it shortens the *gap* in front of
 * each one, which is a different thing and the reason this is a function rather
 * than a field. Everything that has to place an event against `travelled` (the
 * walk engine, the approaching buildings, the trail map) goes through here, so
 * a mounted player's map and a mounted player's road agree.
 *
 * @param {{distance:number, gap:number}} event
 * @param {boolean} mounted
 * @param {number} timeMul the mounted gap multiplier (HORSE_TIME_MUL)
 */
export function effectiveDistance(event, mounted, timeMul) {
  return event.distance - event.gap + event.gap * (mounted ? timeMul : 1);
}

/**
 * Human-readable label for an encounter type. Used by the trail map's markers
 * and its legend.
 *
 * There used to be a `peekAhead` here as well, which returned the next three
 * encounters with a vague distance attached ("Shop just ahead"). It existed
 * only to fill the toast the Map item printed, and the map replaced both — the
 * road drawn to scale says everything the proximity words were approximating,
 * and it still never shows a number.
 */
export const ENCOUNTER_LABELS = {
  enemy: 'Duel',
  shop: 'Shop',
  inn: 'Inn',
  forge: 'Forge',
  boss: 'Boss',
};
