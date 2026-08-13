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
 * A LEVEL IS A WORLD
 * ---------------------------------------------------------------------------
 * Exactly one, and it is not a coincidence — it is the whole point. Three lives
 * a level (see LIVES_PER_LEVEL) and one level a world is what puts the player
 * on 3, 6, 9, 12, 15, 18 lives at the six borders, which is the spine every
 * enemy number in the game is derived from (EXPECTED_POWER below). Levelling
 * used to run at a ragged 1.4 worlds a level and the bar landed wherever it
 * landed; now the curve is solved for the table.
 *
 * AND IT ARRIVES IN THE MIDDLE OF ONE
 * ---------------------------------------------------------------------------
 * Deliberately, and it is the other half of the ramp. From the halfway point of
 * a world half the riders carry the next rung of the gun (`enemyGunDamageAt`),
 * so the back half of every crossing is the dangerous half — and the level-up
 * is timed to land in the same stretch. The Dust Flats is the clearest case:
 * three diamonds against half-life bullets for two fights, then six diamonds
 * against riders who hit for a whole one. The world gets harder and you get
 * bigger, in that order, once per world, six times.
 *
 * Cumulative exp needed, and where the road actually delivers it — the two
 * columns are meant to be read together, and `tools/sim.mjs asymmetry` fails
 * the build if they stop agreeing:
 *
 *   level 2 |     95 · middle of world 1   level 5 | 1,592 · middle of world 4
 *   level 3 |    294 · middle of world 2   level 6 | 3,438 · late in world 5
 *   level 4 |    713 · early in world 3    level 7 | 7,315 · out of reach
 *
 * Level seven is past the end of the game on purpose: eighteen lives is where
 * the bar stops, the Stranger is built for eighteen, and a run that somehow
 * fought its way to twenty-one would be fighting a boss sized for somebody
 * else. The ladder ends where the road does.
 */
export const EXP_BASE = 95;
export const EXP_GROWTH = 2.1;

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
 * It grows THREE lives a level now, on a curve that gives out exactly one level
 * per world, and the ladder in `gunDamageAt` grows with it. The inflation was
 * never the problem: the problem was that ONLY the player's side inflated. Every number on the other side of the road is derived
 * from this one, so a player standing on twelve lives is shot at for two and is
 * still six hits from the end of the run, exactly as they were in the Dust
 * Flats on three. The growth is what gives a duel in the Galaxy room to be a
 * long fight between two people who hit hard; the derivation is what stops that
 * room from turning into immunity.
 *
 * Everything the player fights is now DERIVED from where this curve puts them:
 * `enemyGunDamage`, `enemyLives` and `bossLives` read the bar rather than
 * guessing at it, and `node tools/sim.mjs asymmetry` fails the build if the two
 * sides of the road drift apart again.
 */
export const LIVES_PER_LEVEL = 3;
export const STARTING_LIVES = 3;

/**
 * Roughly what the player's bar and revolver look like walking into each world.
 *
 * A table rather than a simulation because it has to be readable: these six
 * rows are the spine of the game's difficulty and every enemy number hangs off
 * them. They are checked against a real economy model — `tools/sim.mjs
 * asymmetry` prints what the road actually delivers beside what is claimed
 * here, and fails if the gap gets wide enough to matter.
 *
 * THE SPINE IS A STRAIGHT LINE NOW
 * ---------------------------------------------------------------------------
 * Three lives and half a life a shot in the Dust Flats, and then three more
 * lives and one more rung of the gun per world. Every enemy number in the game
 * falls out of those two columns:
 *
 *   world | you have      | so a rider hits for | and carries
 *   ------+---------------+---------------------+-------------
 *     1   |  3 lives  0.5 |        0.5          |   1 life
 *     2   |  6 lives  2.5 |        1            |   4 lives
 *     3   |  9 lives  4.5 |        1.5          |   7 lives
 *     4   | 12 lives  6.5 |        2            |  10 lives
 *     5   | 15 lives  8.5 |        2.5          |  13 lives
 *     6   | 18 lives 10.5 |        3            |  16 lives
 *
 * Which is six hits to kill you and a hit and a half to kill them, in every
 * world in the game — and a rider in the back half of a world is carrying the
 * NEXT world's bullet half the time (`enemyGunDamageAt`), so the second half of
 * a crossing is where a bar that was six hits deep turns into four.
 *
 * The two columns are not independent. The bar is what the enemy's bullet is
 * derived from and the gun is what the enemy's LIFE is derived from, so moving
 * one of them moves half the game: three more lives a world means a rider hits
 * for half a life more a world, and two more damage a world means a rider
 * carries three more diamonds. That is the whole point of writing it down as a
 * table — there is one place to edit, and the harness checks that the road
 * actually delivers it.
 */
export const EXPECTED_POWER = {
  1: { lives: 3, damage: 0.5 },
  2: { lives: 6, damage: 2.5 },
  3: { lives: 9, damage: 4.5 },
  4: { lives: 12, damage: 6.5 },
  5: { lives: 15, damage: 8.5 },
  6: { lives: 18, damage: 10.5 },
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
 * actually made of. This was measured, then measured again after every rescale
 * since; two hits was tried and cost the novice the whole Dust Flats.
 *
 * A RIDER CAN CARRY SEVEN DIAMONDS AND STILL DIE IN A HIT AND A HALF
 * ---------------------------------------------------------------------------
 * Those two facts are not in tension, and keeping them both is what this file
 * is for. Enemy life totals climb hard — one diamond in the Dust Flats, four in
 * the Prairie, seven in the pass, sixteen in the Galaxy — because the ladder in
 * `gunDamageAt` climbs with them, two whole lives a rung. The fight LOOKS three
 * times bigger by world three and takes the same four or five rounds, which is
 * exactly the intent: the numbers on the cards are the journey, the length of
 * the fight is the balance, and they are allowed to be different things.
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
 * THE HALF-DIAMOND GRID IS NO LONGER IN THE WAY
 * ---------------------------------------------------------------------------
 * A bullet has to cost a half or a whole life. On a bar that ran three to ten,
 * `bar / 6` could only land on 0.5, 1.0 or 1.5 and "six hits, always" was not a
 * number the grid could express — it came out between four and a half and seven
 * depending on the world. On the straight-line spine above the bar is 3, 6, 9,
 * 12, 15, 18, so `bar / 6` lands exactly on the grid in every world and six is
 * six. The rounding is still there because a hand-edited table should not be
 * able to produce a bullet worth a third of a life.
 */
export const HITS_TO_KILL_PLAYER = 6;
export const HITS_TO_KILL_ENEMY = 1.5;
export const HITS_TO_KILL_BOSS = 3;

/**
 * What a rider's bullet costs you in a given world — the FLOOR of it. Riders
 * past the halfway mark of a world can be carrying more; see
 * `enemyGunDamageAt`, which is what actually arms an enemy.
 */
export function enemyGunDamage(worldId) {
  const power = EXPECTED_POWER[worldId] || EXPECTED_POWER[1];
  return toHalf(power.lives / HITS_TO_KILL_PLAYER);
}

/**
 * THE ROAD GETS WORSE AS YOU WALK IT
 * ---------------------------------------------------------------------------
 * A world used to be flat: the first rider out of the gate and the one standing
 * in front of the boss hit for exactly the same, so the only thing that changed
 * across a crossing was how much of your bar was left. Which meant the second
 * half of every world was the easy half, because you were richer, higher level
 * and better armed against the same man.
 *
 * From the halfway point of a world, half the riders carry the NEXT rung of the
 * ladder — the Dust Flats open on half a life a shot and close on riders who
 * hit for half or a whole one, the Prairie opens on one and closes on one or
 * one and a half, and so on up. Six hits deep becomes four hits deep, without
 * one number in the table above moving.
 *
 * It is also the one difficulty knob in the game the player can SEE coming: the
 * heavier bullet comes with a heavier gun in the man's hand (ENEMY_GUNS in
 * src/game/gun-tiers.js), so a longbarrel on the road ahead is a warning rather
 * than a surprise.
 *
 * @param {number} worldId
 * @param {number} progress 0..1, how far into the world's road this one stands
 * @param {boolean} upgraded the coin the caller flipped — only consulted past
 *   the halfway mark
 */
export const ENEMY_DAMAGE_RAMP_AT = 0.5;
export const ENEMY_DAMAGE_STEP = 0.5;

export function enemyGunDamageAt(worldId, progress = 0, upgraded = false) {
  const base = enemyGunDamage(worldId);
  const late = (Number(progress) || 0) >= ENEMY_DAMAGE_RAMP_AT;
  return late && upgraded ? base + ENEMY_DAMAGE_STEP : base;
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
 * HOW BIG A KILL WAS, IN RIDERS
 * ---------------------------------------------------------------------------
 * Both purses below used to be paid out on a rider's ABSOLUTE life count, and
 * that was a bomb under the whole economy: the moment the life ladder was
 * rescaled — riders going from two diamonds to four in the Prairie, from three
 * to seven in the pass — every purse and every exp bar in the game silently
 * doubled with it, the player bought a forge rung a world early, and the two
 * sides of the road came apart again from the money end instead of the numbers
 * end.
 *
 * So a kill is measured in RIDERS, not in diamonds. `enemyLives` says what a
 * standard rider of that world carries; this says how many of those this one
 * was worth. A tougher-than-usual rider still pays more — that is the point of
 * rolling a spread at all — but rescaling the ladder moves nothing, because a
 * standard rider is worth exactly one standard rider in every world.
 *
 * The second term is the world itself: a Galaxy rider is a bigger job than a
 * Dust Flats drifter even when both are standard for where they stand.
 */
function riderWeight(worldId, lives) {
  const standard = enemyLives(worldId) || 1;
  const size = 1 + (Math.max(1, Math.min(6, worldId)) - 1) * 0.65;
  return (Math.max(0.5, lives) / standard) * size;
}

/**
 * exp awarded for beating an enemy.
 *
 * Worth about two thirds of what it used to be, which is half of how the pace
 * above is reached — the other half is the ladder. A tougher enemy is still
 * worth more, and the per-rider term is the smaller of the two so that a world
 * full of drifters is not worthless.
 */
export function expForEnemy({ worldId, lives = 1, isBoss = false }) {
  const world = getWorld(worldId);
  const base = 15 + riderWeight(worldId, lives) * 7;
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
  const base = 36 + riderWeight(worldId, lives) * 20;
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

/**
 * What a bandage or a potion is actually worth to you, on the bar you are
 * standing on.
 *
 * See the note over the two of them in src/game/items.js: a healing item is a
 * FRACTION of the player, not a fixed number of diamonds, or it turns into
 * litter three worlds after it was bought. `heal` is still on the item as the
 * number that fraction comes to on the starting bar, which is what the shop
 * card and the tooltip print when there is no bar to measure against.
 */
export function itemHeal(item, maxLives = STARTING_LIVES) {
  if (!item) return 0;
  if (!item.healFraction) return item.heal || 0;
  return Math.max(0.5, Math.round(maxLives * item.healFraction * 2) / 2);
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
 * The answer is not a flatter ladder — a gun that barely matters is the same
 * failure from the other side, and the forge is where a run's money goes. It is
 * a ladder that keeps PACE. A rung is worth a life and a half now and there are
 * six of them, so the ladder runs 0.5 → 9.5, and the enemy life totals it
 * shoots at are derived from exactly that curve (`enemyLives`): a rider is two
 * of your shots deep in the Dust Flats and two of your shots deep in the
 * Galaxy, whatever is in your hand.
 *
 * What that buys is a gun that is still the biggest purchase in the game
 * without being the only one that was ever available: falling one rung behind
 * the curve costs you a third of your damage, which is a bad world rather than
 * an unwinnable run, and it can be bought back at the next forge.
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
 * A life and a half a rung clears that bar with room to spare, and it keeps the
 * step legible on the bar: buying a gun visibly takes a diamond and a half off
 * everything you point it at.
 */
export const GUN_DAMAGE_BASE = 0.5;
export const GUN_DAMAGE_PER_RUNG = 2;

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
 *   level 0 → 1 |     195   a world-1 road, saved rather than eaten
 *   level 1 → 2 |     390   a world-2 road
 *   level 2 → 3 |     770   a world-3 road
 *   level 3 → 4 |   1,520   a world-4 road
 *   level 4 → 5 |   2,975   a world-5 road
 *   level 5 → 6 |   5,805   the Nova, out of the Galaxy's own takings
 *
 * ONE RUNG PER WORLD, AND IT IS NOT OPTIONAL ANY MORE
 * ---------------------------------------------------------------------------
 * The curve above is SOLVED for that, against the gold the road actually pays
 * (`tools/sim.mjs asymmetry` prints both columns). It used to run 40 → 16,605,
 * which is a different game at each end: the first two rungs were pocket change
 * bought before the first shop and the last one was a locked door. Both of
 * those were symptoms of the same thing — a rung was worth half a life, so it
 * had to be priced as a curiosity early and a monument late.
 *
 * A rung is worth a life and a half now (`gunDamageAt`) and the enemy life
 * ladder is derived from it, so the gun is no longer a luxury the run can skip:
 * it is the toll for staying level with the road, and the price is one world's
 * takings, every world, all the way up. What is still a CHOICE is when to pay
 * it — a player who buys the rung the moment the forge appears eats worse for a
 * world, and a player who eats first fights a world at a rung down.
 *
 * The whole ladder is 11,655 against a full clear that pays about 17,000, which
 * leaves the difference for the food, the beds and the bandages that a run of
 * that length actually needs. Nothing here is bought twice.
 */
export const GUN_COST_BASE = 120;
export const GUN_COST_GROWTH = 1.95;
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
