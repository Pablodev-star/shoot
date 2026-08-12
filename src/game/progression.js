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
/**
 * Six, not three.
 *
 * Every damage figure in the game doubled when the trail iron went from half a
 * life a shot to a whole one (see `gunDamageAt`), so a three-life bar would be
 * three hits deep in world one and two hits deep in the basin. Six is a little
 * more than the old three was worth, and the extra is deliberate: the Dust
 * Flats were measured killing two runs in five, which is a tutorial that eats
 * the people it is teaching.
 */
export const STARTING_LIVES = 6;

/**
 * What a rider's bullet costs you, by world.
 *
 * A table rather than `worldId * 0.5`, which is what it used to be and which
 * had the Stranger's riders taking three lives a shot off an eleven-life bar —
 * four hits and a run that had lasted an hour was over. Written out, on the
 * half-life grid, and deliberately flat across pairs of worlds: the road gets
 * harder because there is more of it and because the landmarks now erupt, not
 * because every bullet is bigger than the last one.
 */
export const ENEMY_GUN_DAMAGE = { 1: 0.5, 2: 0.5, 3: 1, 4: 1, 5: 1.5, 6: 1.5 };

export function enemyGunDamage(worldId) {
  return ENEMY_GUN_DAMAGE[worldId] ?? 1;
}

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

/**
 * Lives a basic bed restores — grows with the world.
 *
 * It used to be 1/1/2/3/3/4 against a bar that ran 3 to 11, so the cheap bed
 * was a third of your lives in the Dust Flats and a quarter of them in the
 * Galaxy: it fell behind the thing it was healing at exactly the rate the
 * thing grew. It is written as a FRACTION of the bar now, rounded to the
 * half-diamond grid, so "the cheap bed" means the same thing all the way down
 * the road — a bit under half of you, wherever you are.
 *
 * That matters more than it sounds. Measured over three hundred full runs, the
 * thing that ended a run was almost never one bad duel; it was nine duels
 * costing half a life each against a world holding two beds.
 */
export const INN_BASIC_FRACTION = 0.45;

export function innBasicHeal(worldId, maxLives = STARTING_LIVES) {
  const scaled = maxLives * INN_BASIC_FRACTION + (worldId - 1) * 0.15;
  return Math.max(1, Math.round(scaled * 2) / 2);
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

/**
 * Lives taken per shot at a given gun level.
 *
 * THE GUN USED TO BE THE WHOLE DIFFICULTY SLIDER
 * ---------------------------------------------------------------------------
 * It was `0.5 + level * 0.5`, which reads like a gentle ladder and is not one.
 * The trail iron did half a life and the Nova did three and a half — seven
 * times as much — while nothing else in the shop moves a fight by more than a
 * fifth. Measured over two hundred duels a cell, in the Galaxy:
 *
 *   gun 0   0% of duels won        gun 3   56%
 *   gun 1  16%                     gun 5   73%
 *
 * A player who spent their gold on food, a map and a vest was not playing a
 * different strategy, they were playing an unwinnable game, and nothing on the
 * road ever told them. That is the opposite of a build.
 *
 * So the iron you ride in with is worth twice what it was and the ladder above
 * it is unchanged: 1.0 at the bottom, 4.0 at the top — four times rather than
 * seven. The Nova is still the best gun in the game and still a whole run's
 * savings; it is no longer the only thing that decides whether the run was
 * possible. Everything the gun shoots at grew to match (see `lives` in
 * src/game/worlds.js), so a fight is the same length it always was.
 *
 * AND IT HAS TO LAND ON A HALF
 * ---------------------------------------------------------------------------
 * Lives are red diamonds and half a diamond is a shape the interface can draw;
 * 0.15 of one is not (see `livesRow` in src/ui/widgets.js). So every damage
 * figure in this game — the gun, the riders, the abilities, the mountains —
 * is a multiple of 0.5, and flattening the curve had to be done by moving the
 * bottom of the ladder up rather than by making the steps smaller. A player
 * hit for a quarter of a diamond is a player watching a bar that does not
 * move.
 *
 * The pleasant side effect is that the rule book is true again: at the trail
 * iron a shot costs exactly one life, which is what the how-to-play panel has
 * always said it does.
 */
export const GUN_DAMAGE_BASE = 1;
export const GUN_DAMAGE_PER_RUNG = 0.5;

export function gunDamageAt(level) {
  const rungs = Math.min(GUN_MAX_LEVEL, Math.max(0, level));
  return GUN_DAMAGE_BASE + rungs * GUN_DAMAGE_PER_RUNG;
}

/**
 * What the next rung costs.
 *
 * Two things compound here rather than one. The base is exponential, as it
 * always was; on top of it sits an ESCALATION term that grows with the level,
 * so the ratio between one rung and the next widens as you climb. That is the
 * difference between a curve that is steep and a curve that keeps getting
 * steeper, and it is what stops a player who found one good boss purse from
 * buying two tiers with it.
 *
 *   level 0 → 1 |      40   pocket change after a duel or two
 *   level 1 → 2 |     135   a world-1 purse
 *   level 2 → 3 |     455   most of a world-2 run's takings
 *   level 3 → 4 |   1,515   a world-3/4 project
 *   level 4 → 5 |   5,025   you are saving instead of buying food
 *   level 5 → 6 |  16,605   the Nova. A whole run spent on one gun
 *
 * THE TOP RUNG HAS TO BE REACHABLE OR IT IS NOT A CHOICE
 * ---------------------------------------------------------------------------
 * It was 27,845, against a full clear that pays out about 21,000 counting
 * every purse in the game — so the Nova was not an expensive decision, it was
 * a locked door with a price painted on it, and the seventh revolver, its
 * ritual and its starfield were art nobody would ever see. Now the whole
 * ladder costs 23,775 of a ~21,000 run: still more than the road pays, so it
 * needs a run that sells its finds and skips its beds, and no longer a number
 * that exists to be looked at.
 *
 * The rungs matter less than they did in any case — a rung is worth half a
 * life a shot against a ladder that now starts at a whole one (`gunDamageAt`),
 * so this is a curve for the player who wants the gun, not the toll every
 * player pays to stay in the game.
 */
export const GUN_COST_BASE = 40;
export const GUN_COST_GROWTH = 3.1;
export const GUN_COST_ESCALATION = 0.09;

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
/**
 * STARVING, AND WHY IT SPEEDS UP AS YOU GROW
 * ---------------------------------------------------------------------------
 * It used to be a whole life every twelve seconds, flat. That is a real threat
 * at three lives — thirty-six seconds and the run is over — and it is nothing
 * at all by the Galaxy, where the same rule takes better than two minutes to
 * empty a fourteen-life bar. So the one system in the game whose whole job is
 * to make food a purchase quietly stopped being one exactly when food became
 * hardest to find. Runs did not starve; they walked the last two worlds on an
 * empty gauge and paid a rounding error for it.
 *
 * The rule now is one sentence: **an empty gauge empties a full life bar in
 * STARVATION_BAR_MS, whatever the bar is.** It comes off half a diamond at a
 * time — the smallest thing the interface can draw, so the first tick is
 * visible instead of a whole heart arriving out of nowhere — and the interval
 * between ticks is simply that budget divided by the number of halves in the
 * bar. A longer bar does not buy you time, it buys you warnings.
 *
 *    6 lives → a tick every 2.5s  ┐
 *    9 lives → a tick every 1.7s  ├ thirty seconds, all of them
 *   14 lives → a tick every 1.1s  ┘
 *
 * Half a minute from the end of the run at every stage of the road is what
 * makes a carrot worth buying in the Dust Flats and a Trail Stew worth carrying
 * out of the basin.
 */
export const STARVATION_LIFE_PER_TICK = 0.5;
/** How long an empty gauge takes to empty a full bar, whatever size it is. */
export const STARVATION_BAR_MS = 30000;
/** However long the bar gets, a tick is never quicker than this. */
export const STARVATION_MIN_MS = 600;

/**
 * How long between starvation ticks for a given maximum life bar.
 * @param {number} maxLives
 */
export function starvationIntervalMs(maxLives = STARTING_LIVES) {
  const ticks = Math.max(1, maxLives / STARVATION_LIFE_PER_TICK);
  return Math.max(STARVATION_MIN_MS, STARVATION_BAR_MS / ticks);
}

// ---------------------------------------------------------------------------
// The Dusk Totem
// ---------------------------------------------------------------------------

/**
 * What you come back on.
 *
 * Half the bar, never fewer than three. Half rather than all of it because the
 * totem is meant to buy a run its next shop, not to hand back the fight that
 * was lost; three as a floor because a revival that puts you on one life in a
 * world where a rider's bullet costs two and a half is a cut-scene, not a
 * rescue. The floor moved with every other damage figure in the game — see
 * `gunDamageAt`.
 */
export function totemReviveLives(maxLives) {
  return Math.max(3, Math.ceil(maxLives / 2));
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
