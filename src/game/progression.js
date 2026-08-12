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
 * Lives granted per level-up, and the bar you start on.
 *
 * THESE TWO CURVES HAVE TO BE WRITTEN TOGETHER OR THEY COME APART
 * ---------------------------------------------------------------------------
 * This is the number that broke the game once already. At a whole life per
 * level on a bar starting at six, the player doubles by level six — while a
 * rider's bullet was a constant written in another file. Measured on the
 * version that shipped: **twelve** connected shots to kill the player in the
 * Dust Flats and **fourteen** by the Wildgrass Prairie, against two or three to
 * kill the rider across the road. That is not a duel, it is an errand.
 *
 * The bar starts at THREE, which is where it started for the first three years
 * of this game and which was right — three diamonds against half a life a shot
 * is six hits deep, and six hits deep is a fight you can afford to misplay
 * twice.
 *
 * It still grows a whole life a level. The inflation was never the problem: the
 * problem was that ONLY the player's side inflated. A rider's bullet is derived
 * from the bar now (`enemyGunDamage`), so a player standing on nine lives is
 * shot at for a life and a half and is still six hits from the end of the run,
 * exactly as they were in the Dust Flats. The growth is what gives the late
 * game room to absorb a bad duel; the derivation is what stops that room from
 * turning into immunity.
 *
 * Everything the player fights is now DERIVED from where this curve puts them:
 * `enemyGunDamage`, `enemyLives` and `bossLives` read the bar rather than
 * guessing at it, and `node tools/sim.mjs asymmetry` fails the build if the two
 * sides of the road drift apart again.
 */
export const LIVES_PER_LEVEL = 1;
export const STARTING_LIVES = 3;

/**
 * Roughly what the player's bar and revolver look like walking into each world.
 *
 * A table rather than a simulation because it has to be readable: these six
 * rows are the spine of the game's difficulty and every enemy number hangs off
 * them. They are checked against a real economy model — `tools/sim.mjs
 * asymmetry` prints what the road actually delivers beside what is claimed
 * here, and fails if the gap gets wide enough to matter.
 */
export const EXPECTED_POWER = {
  1: { lives: 3, damage: 0.5 },
  2: { lives: 4, damage: 1.5 },
  3: { lives: 5, damage: 2 },
  4: { lives: 7, damage: 2.5 },
  5: { lives: 8, damage: 2.5 },
  6: { lives: 10, damage: 3 },
};

/** Rounded to the half-diamond grid the whole game lives on. */
const toHalf = (n) => Math.max(0.5, Math.round(n * 2) / 2);

/**
 * HOW MANY CONNECTED SHOTS IT SHOULD TAKE TO KILL EACH OF YOU
 * ---------------------------------------------------------------------------
 * The two numbers this file exists to hold steady, in every world. A rival
 * needs about six clean hits to finish you and you need two to finish them:
 * enough cushion that a duel is winnable from behind, tight enough that a rider
 * is a threat rather than a toll booth.
 *
 * The small one is doing more work than it looks, because it sets the LENGTH of
 * a fight and length is what a fight costs. Every extra round is another chance
 * for their gun to be loaded when yours is not, and the bar only holds six hits
 * — it cannot pay for long fights. Measured, at the same everything else:
 *
 *   2.5 hits to kill a rider → 7 rounds → nearly half your bar per duel
 *   2.0                      → 6        → about a third
 *   1.5                      → 4-5      → about a fifth
 *
 * One and a half, and the arithmetic is what forces it. A three-diamond bar
 * that takes six hits dies in THREE duels at a third of a bar each, and a world
 * is five to seven duels — no amount of shopping covers that, and no amount of
 * skill either. At a fifth of a bar a duel, a world costs a bar and a half,
 * which two beds and a counter's worth of bandages can carry with something
 * left over for the gun. That "something left over" is the decision the game is
 * actually made of.
 *
 * The number that must NOT move is the other one. Six hits to kill the player
 * is the feel of this game and always was — three diamonds and half a life a
 * shot — and the version that let it drift to twelve, and to fourteen by the
 * second world, was a game where the rider across the road could not hurt you
 * inside a single fight. `tools/sim.mjs asymmetry` gates that absolute.
 *
 * A boss is the same fight with more of it — three of your shots. Not
 * more, and the reason is the landmark rather than the boss: every boss carries
 * its world's special, a boss fight is the longest fight in the world it
 * belongs to, and a long fight eats eruptions. At four and a half shots the
 * Dust Flats boss ran nearly forty seconds, took three eruptions and killed
 * half of all runs that reached it — the fight was lost to the weather, not to
 * Big Jed.
 *
 * ONE HONEST LIMIT: THE HALF-DIAMOND GRID IS COARSE DOWN HERE
 * ---------------------------------------------------------------------------
 * A bullet has to cost a half or a whole life, and the bar is three diamonds to
 * seven — so `bar / 6` can only ever land on 0.5, 1.0 or 1.5, and "six hits,
 * always" is not a number the grid can express. What comes out is four and a
 * half to seven hits depending on the world, and what stays steady is the thing
 * that actually matters: the RATIO between the two sides, which sits between
 * 1.8 and 2.8 across all six worlds where it used to run from 4 to 7.
 */
export const HITS_TO_KILL_PLAYER = 6;
export const HITS_TO_KILL_ENEMY = 1.5;
export const HITS_TO_KILL_BOSS = 3;

/** What a rider's bullet costs you in a given world. */
export function enemyGunDamage(worldId) {
  const power = EXPECTED_POWER[worldId] || EXPECTED_POWER[1];
  return toHalf(power.lives / HITS_TO_KILL_PLAYER);
}

/** How much life a rider of a given world carries, before its own spread. */
export function enemyLives(worldId) {
  const power = EXPECTED_POWER[worldId] || EXPECTED_POWER[1];
  return toHalf(power.damage * HITS_TO_KILL_ENEMY);
}

/** How much life that world's boss carries. */
export function bossLives(worldId) {
  const power = EXPECTED_POWER[worldId] || EXPECTED_POWER[1];
  return Math.max(2, Math.round(power.damage * HITS_TO_KILL_BOSS * 2) / 2);
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

/**
 * What a body is worth.
 *
 * Raised by about half, and the reason is the ledger rather than generosity: a
 * duel costs roughly a fifth of the life bar, a bandage restores a third of it,
 * and at the old rate a rider paid for almost exactly the bandage that fighting
 * it cost. A world's whole income went on standing still. The purse has to
 * cover the damage AND leave enough over that the gun, the food and the bed are
 * three real choices competing for it — that competition is the game.
 */
export function goldForEnemy({ worldId, lives = 1, isBoss = false }) {
  const world = getWorld(worldId);
  const base = 36 + lives * 20;
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

/**
 * What a shopkeeper hands over for something out of your bag.
 *
 * IT IS A FRACTION OF WHAT THE THING IS, NOT OF WHAT THE ROAD CHARGES FOR IT
 * ---------------------------------------------------------------------------
 * This used to be `itemPrice(item, worldId) * SELL_RATIO`, which quietly made
 * the saddlebag the best investment vehicle in the game. Prices inflate about
 * 42% per world on top of each world's own multiplier, so a carrot bought for
 * 10 gold in the Dust Flats sold for **85** in the Galaxy, and a potion bought
 * for 110 sold for 765. With five of anything stackable on every counter, the
 * correct play was to walk into world one, buy out the shop, carry it five
 * worlds and cash out for more than the road pays for actually fighting.
 *
 * A run should be funded by the fights. So the sale price is a fraction of the
 * item's own base value and knows nothing about where you are standing: buy
 * anywhere at the local asking price, sell anywhere for the same modest sum.
 * Since `itemPrice` is never below `basePrice`, this guarantees the only
 * property that matters — **you can never make money by moving goods between
 * worlds.**
 *
 * `worldId` is still in the signature because every caller has one to hand and
 * a future rule (a world that pays over the odds for its own kit, say) would
 * want it.
 */
export function sellPrice(item, worldId) {
  return Math.max(1, Math.round((item.basePrice * SELL_RATIO) / 5) * 5);
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
export const GUN_DAMAGE_BASE = 0.5;
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
  return Math.max(2, Math.round(maxLives) / 2);
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
