/**
 * SHOOT! — Progression maths (Block 5a).
 *
 * Pure functions only: no state, no side effects. Every curve in the game lives
 * here so balancing is a matter of editing constants in one file.
 */

import { getWorld } from './worlds.js';
import { SELL_RATIO } from './items.js';

// ---------------------------------------------------------------------------
// Experience & levels
// ---------------------------------------------------------------------------

/** exp needed to go from `level` to `level + 1`. Exponential, tunable. */
export const EXP_BASE = 60;
export const EXP_GROWTH = 1.34;

export function expForNextLevel(level) {
  return Math.round(EXP_BASE * Math.pow(EXP_GROWTH, level - 1));
}

/** Lives granted per level-up. Levelling also refills lives immediately. */
export const LIVES_PER_LEVEL = 1;
export const STARTING_LIVES = 3;

/** exp awarded for beating an enemy. */
export function expForEnemy({ worldId, lives = 1, isBoss = false }) {
  const world = getWorld(worldId);
  const base = 18 + lives * 9;
  return Math.round(base * world.expMul * (isBoss ? 3.2 : 1));
}

// ---------------------------------------------------------------------------
// Gold
// ---------------------------------------------------------------------------

export function goldForEnemy({ worldId, lives = 1, isBoss = false }) {
  const world = getWorld(worldId);
  const base = 24 + lives * 14;
  return Math.round(base * world.goldMul * (isBoss ? 4 : 1));
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

/** How much prices inflate per world, on top of each world's priceMul. */
export const PRICE_GROWTH = 1.42;

/**
 * Shop price for an item in a given world.
 * price = basePrice * PRICE_GROWTH^(world-1) * world.priceMul
 */
export function itemPrice(item, worldId) {
  const world = getWorld(worldId);
  const raw = item.basePrice * Math.pow(PRICE_GROWTH, worldId - 1) * world.priceMul;
  return Math.max(1, Math.round(raw / 5) * 5); // round to a tidy 5
}

export function sellPrice(item, worldId) {
  return Math.max(1, Math.round((itemPrice(item, worldId) * SELL_RATIO) / 5) * 5);
}

// --- Inn pricing -----------------------------------------------------------

export const INN_BASIC_BASE = 45;
export const INN_PREMIUM_BASE = 130;

/** Lives a basic bed restores — grows with the world. */
export function innBasicHeal(worldId) {
  return 1 + Math.floor((worldId - 1) / 1.5); // W1:1  W2:1  W3:2  W4:3  W5:3  W6:4
}

export function innBasicPrice(worldId) {
  const world = getWorld(worldId);
  return Math.round((INN_BASIC_BASE * Math.pow(PRICE_GROWTH, worldId - 1) * world.priceMul) / 5) * 5;
}

export function innPremiumPrice(worldId) {
  const world = getWorld(worldId);
  return Math.round((INN_PREMIUM_BASE * Math.pow(PRICE_GROWTH, worldId - 1) * world.priceMul) / 5) * 5;
}

// ---------------------------------------------------------------------------
// Hunger
// ---------------------------------------------------------------------------

export const HUNGER_MAX = 100;
/** Hunger points lost per second of walking (on foot). */
export const HUNGER_DRAIN_PER_SEC = 0.85;
/** Riding covers ground faster but burns hunger slightly faster too. */
export const HUNGER_DRAIN_HORSE_MUL = 1.15;
/**
 * Walking into a sandstorm costs you. Half again as much hunger per second:
 * you are leaning into the wind, breathing through a kerchief and covering
 * less ground for the same effort. This is the only weather that reaches the
 * player's body rather than only the duel, so the meter says so out loud —
 * see the sand-blasted state in src/ui/statusbar.js.
 */
export const HUNGER_DRAIN_SANDSTORM_MUL = 1.5;
/** Once hunger hits zero, one life is lost every this many milliseconds. */
export const STARVATION_INTERVAL_MS = 12000;

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

/** Walking speed in source pixels per second. */
export const WALK_SPEED = 58;
/**
 * The horse discount. Travel time between encounters is
 *   gap * HORSE_TIME_MUL / (WALK_SPEED * HORSE_SPEED_MUL)
 * so the two multipliers together put a mounted journey at roughly half the
 * time of one on foot — the x0.5 the design calls for. Tune either freely.
 */
export const HORSE_TIME_MUL = 0.75;
export const HORSE_SPEED_MUL = 1.55;
