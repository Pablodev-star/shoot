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

/**
 * exp needed to go from `level` to `level + 1`. Exponential, tunable.
 *
 * A LEVEL IS ABOUT SEVEN TENTHS OF A WORLD
 * ---------------------------------------------------------------------------
 * The pace is the number these two constants and `expForEnemy` exist to hit:
 * roughly 1.4 levels per world, so a run that reaches the Galaxy is somewhere
 * around level 9 and finishes with eleven lives.
 *
 * It used to be more than twice that. Clearing every world put the player up
 * two and a bit levels, they arrived at the Stranger around fourteen with
 * sixteen lives, and the last two worlds' difficulty curve — which is built
 * around a fight you can lose — was being outrun by a life bar that grew
 * faster than anything could empty it. Levelling is meant to be the slow
 * background reward the whole journey pays out; the fast one is gold.
 *
 * Both knobs moved to get there, and deliberately: an enemy is worth less than
 * it was (see `expForEnemy`), and the ladder is steeper from the very first
 * rung. Only raising the ladder would have left the toasts reading "+29 exp"
 * against a bar wanting three hundred, which reads as a bug rather than as a
 * long climb.
 *
 * Cumulative exp needed, and where the road actually delivers it:
 *
 *   level 2 |    195 · mid world 1        level 6 | 1,904 · world 4
 *   level 3 |    456 · early world 2      level 7 | 2,746 · world 5
 *   level 4 |    806 · world 2/3          level 8 | 3,875 · world 5
 *   level 5 |  1,275 · world 3            level 9 | 5,388 · world 6
 */
export const EXP_BASE = 195;
export const EXP_GROWTH = 1.34;

export function expForNextLevel(level) {
  return Math.round(EXP_BASE * Math.pow(EXP_GROWTH, level - 1));
}

/**
 * Lives granted per level-up. The level-up itself hands you exactly this many
 * lives as well as the room to hold them — it is not a refill. See `addExp` in
 * src/game/player.js.
 */
export const LIVES_PER_LEVEL = 1;
export const STARTING_LIVES = 3;

/**
 * exp awarded for beating an enemy.
 *
 * Worth about two thirds of what it used to be, which is half of how the pace
 * above is reached — the other half is the ladder. A tougher enemy is still
 * worth more, and the per-life term is the smaller of the two so that a world
 * full of one-life drifters is not worthless.
 */
export function expForEnemy({ worldId, lives = 1, isBoss = false }) {
  const world = getWorld(worldId);
  const base = 15 + lives * 7;
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
// The revolver
//
// The one purchase in the game that is kept forever. Everything else in a run
// is spent — food is eaten, a bed is slept in, an ability is thrown — and the
// gun is the single line on the ledger that is still there in the last world,
// which is why it is priced like nothing else on the road.
// ---------------------------------------------------------------------------

/**
 * How many times the gun can be improved. Seven tiers, counting the iron you
 * ride in with, and the last one is the Nova — see `src/game/gun-tiers.js`.
 *
 * There used to be no ceiling at all: the cost curve was the only thing
 * stopping you, and a player who banked enough gold could walk into the last
 * world doing six lives a shot at an enemy that has four. A ladder with a top
 * rung is also what lets the art be a ladder — a finish per level, ending
 * somewhere worth ending.
 */
export const GUN_MAX_LEVEL = 6;

/** Lives taken per shot at a given gun level. Half a life per rung. */
export function gunDamageAt(level) {
  return 0.5 + Math.min(GUN_MAX_LEVEL, Math.max(0, level)) * 0.5;
}

/**
 * What the next rung costs.
 *
 * Two things compound here rather than one. The base is exponential, as it
 * always was; on top of it sits an ESCALATION term that grows with the level,
 * so the ratio between one rung and the next widens as you climb — 3.8x for
 * the first, better than 4.4x by the last. That is the difference between a
 * curve that is steep and a curve that keeps getting steeper, and it is what
 * stops a player who found one good boss purse from buying two tiers with it.
 *
 *   level 0 → 1 |      40   pocket change after a duel or two
 *   level 1 → 2 |     150   a world-1 purse
 *   level 2 → 3 |     565   most of a world-2 run's takings
 *   level 3 → 4 |   2,090   a world-3/4 project
 *   level 4 → 5 |   7,655   you are saving instead of buying food
 *   level 5 → 6 |  27,845   the Nova. A whole run spent on one gun
 *
 * The old curve was `25 * 3.25^level` — 25 / 81 / 264 / 858 / 2,789 / 9,065 —
 * so every rung above the first is between two and three times dearer than it
 * was, and the top one is three times dearer again.
 */
export const GUN_COST_BASE = 40;
export const GUN_COST_GROWTH = 3.35;
export const GUN_COST_ESCALATION = 0.13;

export function gunUpgradeCost(level) {
  if (level >= GUN_MAX_LEVEL) return Infinity;
  const raw = GUN_COST_BASE * Math.pow(GUN_COST_GROWTH, level) * (1 + level * GUN_COST_ESCALATION);
  return Math.max(5, Math.round(raw / 5) * 5); // round to a tidy 5, like every other price
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
 * Weather that costs you rations to walk through.
 *
 * A sandstorm is the worst of it — you are leaning into the wind, breathing
 * through a kerchief and covering less ground for the same effort. Snow is
 * nearly as bad for a different reason (you are burning fuel to stay warm as
 * well as to move), and ashfall a shade behind that.
 *
 * These are the only things in the game besides the horse that reach the
 * player's *body* rather than the duel, so the meter says so out loud — see
 * the harsh state in src/ui/statusbar.js. Each number is attached to its
 * weather in `src/explore/weather.js`; nothing outside that table names a
 * particular sky.
 */
export const HUNGER_DRAIN_SANDSTORM_MUL = 1.5;
export const HUNGER_DRAIN_SNOW_MUL = 1.4;
export const HUNGER_DRAIN_ASH_MUL = 1.3;
/**
 * The only multiplier that pulls the other way: water on the saddle.
 *
 * A third off, which is deliberately worth more than the horse costs (x1.15) —
 * the two are bought together often enough that the canteen has to survive
 * being stacked with it, and 1.15 x 0.67 is still comfortably under one.
 */
export const HUNGER_DRAIN_CANTEEN_MUL = 0.67;
/** Once hunger hits zero, one life is lost every this many milliseconds. */
export const STARVATION_INTERVAL_MS = 12000;

// ---------------------------------------------------------------------------
// The Dusk Totem
// ---------------------------------------------------------------------------

/**
 * What you come back on.
 *
 * Half the bar, never fewer than two. Half rather than all of it because the
 * totem is meant to buy a run its next shop, not to hand back the fight that
 * was lost; two as a floor because a revival that puts you on one life in a
 * world where every rider carries three is a cut-scene, not a rescue.
 */
export function totemReviveLives(maxLives) {
  return Math.max(2, Math.ceil(maxLives / 2));
}

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
