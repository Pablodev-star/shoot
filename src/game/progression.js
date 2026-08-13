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
 * THREE LEVELS EVERY TWO WORLDS
 * ---------------------------------------------------------------------------
 * A level is worth one life — one more maximum and one more in the bar to go
 * with it — and the curve pays out about three of them every two worlds, so
 * the bar reads 3, 4, 6, 7, 9, 10 at the six borders.
 *
 * That is a much flatter climb than this game used to have, and it changes
 * what levelling IS. On four lives a level the bar tripled across a run and
 * every enemy number had to be derived from it or the two sides came apart; on
 * one life a level the bar barely doubles, so the road's own ladders — what a
 * rider hits for and how much of him there is — do the work, and the level-up
 * is a small steady reward rather than the difficulty curve in disguise.
 *
 * AND IT ARRIVES IN THE MIDDLE OF A WORLD
 * ---------------------------------------------------------------------------
 * Deliberately, and it is the other half of the ramp. From the halfway point of
 * a world some riders carry the next rung of the gun (`enemyGunDamageAt`), so
 * the back half of every crossing is the dangerous half — and the level-ups are
 * timed to land in the same stretch. The world gets harder and you get bigger,
 * in that order, about three times every two worlds.
 *
 * Cumulative exp, and where the road actually delivers it — the two columns
 * are meant to be read together, and `tools/sim.mjs asymmetry` fails the build
 * if they stop agreeing:
 *
 *   level 2 |     45 · the first fight     level 6 | 1,255 · middle of world 4
 *   level 3 |    230 · end of world 1      level 7 | 1,851 · world 5
 *   level 4 |    478 · middle of world 2   level 8 | 2,650 · middle of world 5
 *   level 5 |    810 · world 3             level 9 | 3,721 · world 6
 *
 */
export const EXP_BASE = 138;
export const EXP_GROWTH = 1.34;

/**
 * The first level is cheap, and it is the only one that breaks the curve.
 *
 * Three diamonds is the shallowest bar the game ever has, and the Dust Flats
 * is where the road first starts ramping (`enemyGunDamageAt`) — so world one
 * is the one stretch where the player is at their most fragile at exactly the
 * moment the riders get heavier. On the geometric curve alone the second level
 * lands near the boss's door, which is a level-up arriving after the world it
 * was needed for. At forty-five it lands on the FIRST fight — a rider out here
 * is worth about fifty — so the fourth diamond is on the bar before the road
 * has had a chance to take three off it.
 *
 * Everything above level two is the curve. The exception is priced so it does
 * not shift the ladder: the cumulative totals from level three on are within a
 * few dozen exp of what they would have been.
 */
export const FIRST_LEVEL_EXP = 45;

export function expForNextLevel(level) {
  if (level <= 1) return FIRST_LEVEL_EXP;
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
 * It grows ONE life a level, at about three levels every two worlds, so the
 * whole climb is three diamonds to ten. The inflation was never the problem:
 * the problem was that only the player's side inflated. What holds the two
 * sides together now is that the rider's bullet is derived from this bar
 * (`enemyGunDamage`) — a player on ten lives is shot at for one and is ten
 * hits from the end of the run, against three lives and half a life a shot in
 * the Dust Flats, which is six.
 *
 * The number actually being held steady is how much of the bar a duel costs —
 * about a third of it, everywhere — and `node tools/sim.mjs asymmetry` fails
 * the build if the hits-to-kill behind it drifts out of what the length of
 * that world's fights needs.
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
 *
 * THE SPINE
 * ---------------------------------------------------------------------------
 * TWO of these columns are ladders written down by hand, and the other two are
 * what the game is tuned to hold up against them.
 *
 * The road's two: a rider hits for half a life in the Dust Flats and half a
 * life more every world (`enemyGunDamage`), and carries one diamond in the Dust
 * Flats and two more every world (`enemyLives`). Those are the shape of the
 * journey and they are not derived from anything.
 *
 * The player's two: a bar that starts at three and grows four a level on a
 * curve that pays out one level a world, and a forge ladder worth half a life a
 * rung that a run finishes buying around the Bayou.
 *
 *   world | you have      | a rider hits for | and carries | so a rider is
 *   ------+---------------+------------------+-------------+---------------
 *     1   |  3 lives  0.5 |       0.5        |   1 life    | 2 shots
 *     2   |  7 lives  1.5 |       1          |   3 lives   | 2 shots
 *     3   | 11 lives  2.5 |       1.5        |   5 lives   | 2 shots
 *     4   | 15 lives  3.5 |       2          |   7 lives   | 2 shots
 *     5   | 19 lives  3.5 |       2.5        |   9 lives   | 2.6 shots
 *     6   | 23 lives  3.5 |       3          |  11 lives   | 3.2 shots
 *
 * Which comes out at six to eight hits to kill you and two to three to kill
 * them, everywhere — and a rider in the back half of a world is carrying the
 * NEXT world's bullet half the time (`enemyGunDamageAt`), so the second half of
 * a crossing is where a bar that was six hits deep turns into four.
 *
 * THE LAST TWO WORLDS ARE WHERE THE LADDER RUNS OUT
 * ---------------------------------------------------------------------------
 * The gun stops at three and a half — seven revolvers, half a life a rung —
 * and the riders do not stop at all, so the Basin and the Galaxy are the two
 * worlds where a fight takes a third shot. That is on purpose and it is the
 * only difficulty curve left in the late game that is not the bar: out there
 * you cannot out-buy the road, you can only out-play it, and what your gold
 * buys instead is what keeps you standing — the med kits, the beds, and the
 * legendaries the forge is no longer eating your purse for.
 *
 * It is also why the last two worlds are SHORTER (see `duels` in
 * src/game/worlds.js). A world costs the number of fights times the cost of a
 * fight; when the second number goes up by half, the first has to come down or
 * the bar cannot pay for it.
 */
export const EXPECTED_POWER = {
  1: { lives: 3, damage: 0.5 },
  2: { lives: 4, damage: 1.5 },
  3: { lives: 6, damage: 2.5 },
  4: { lives: 7, damage: 3.5 },
  5: { lives: 9, damage: 3.5 },
  6: { lives: 10, damage: 3.5 },
};

/** Rounded to the half-diamond grid the whole game lives on. */
const toHalf = (n) => Math.max(0.5, Math.round(n * 2) / 2);

/**
 * The same grid, but the error always falls on the player's side.
 *
 * Every damage figure in the game has to be a multiple of half a diamond, and
 * on a bar of three to ten that grid is COARSE: the bullet the Basin wants is
 * a third of the way between one and one and a half, and the two candidates
 * are eight hits to kill the player and five and a bit. Rounding to nearest
 * picks whichever is closer, which means a world's difficulty is decided by a
 * rounding — and the two times it rounded UP, that world's duels went from a
 * third of the bar to over half and the harness lit up.
 *
 * So the bullet rounds DOWN. A world is at worst slightly gentler than the
 * curve asks for, never sharply meaner than it, and the shortfall is paid back
 * by the ramp in the back half of the world (`enemyGunDamageAt`) — which is
 * exactly the half-step the rounding just gave away.
 */
const toHalfDown = (n) => Math.max(0.5, Math.floor(n * 2) / 2);

/**
 * HOW MANY CONNECTED SHOTS IT SHOULD TAKE TO KILL EACH OF YOU
 * ---------------------------------------------------------------------------
 * The number this file exists to hold steady. A rival needs about six clean
 * hits to finish you: enough cushion that a duel is winnable from behind,
 * tight enough that a rider is a threat rather than a toll booth.
 *
 * IT IS A TARGET, NOT A FORMULA
 * ---------------------------------------------------------------------------
 * It used to decide the riders' damage — bullet = bar / six — and that was the
 * wrong way round once the road's two ladders were written down by hand. What
 * the bullet costs is `enemyGunDamage` and what a rider carries is
 * `enemyLives`; this is what the PLAYER'S bar is solved against, and what
 * `tools/sim.mjs asymmetry` gates: four to eight hits, in every world, or the
 * build fails.
 *
 * It comes out at six in the Dust Flats and drifts up to about seven and a
 * half by the Galaxy, and that drift is deliberate. A duel out there takes
 * three of your shots instead of two because the forge ladder has run out, so
 * the fight is half again as long, so the bar has to be deeper to cost the same
 * FRACTION of itself. What is actually being held steady is the price of a
 * duel — about a third of the bar, everywhere — and the hits-to-kill is how
 * that price is written down.
 *
 * THE OTHER SIDE OF IT IS THE LENGTH OF A FIGHT
 * ---------------------------------------------------------------------------
 * How many of YOUR shots a rider takes sets how long a duel runs, and length is
 * what a fight costs. Every extra round is another chance for their gun to be
 * loaded when yours is not. Measured, at the same everything else:
 *
 *   2.5 hits to kill a rider → 7 rounds → nearly half your bar per duel
 *   2.0                      → 5-6      → about a third
 *   1.5                      → 4-5      → about a fifth
 *
 * Two, for the four worlds where the gun can keep up, and then it drifts to
 * three as the life ladder climbs past the top of the forge. That drift is the
 * late game's difficulty curve and it is bounded: `tools/sim.mjs asymmetry`
 * fails the build outside one and a half to three and a half, because under
 * the floor a rider dies to the opening trade and over the ceiling every duel
 * is a war of attrition no amount of shopping covers.
 *
 * A boss is the same fight with half again as much of it — see BOSS_LIVES_MUL.
 */
export const HITS_TO_KILL_PLAYER = 7;

/**
 * SIX HITS IS SIX HITS IN A FIVE-ROUND FIGHT, AND A DIFFERENT NUMBER IN A TEN
 * ---------------------------------------------------------------------------
 * What the game is actually holding steady is the PRICE OF A DUEL — about a
 * third of the bar, in every world. Hits-to-kill is how that price is written
 * down, and it only means the same thing while fights are the same length.
 *
 * They are not, any more. A rider takes two of your shots for four worlds and
 * then three, because the forge ladder tops out at three and a half while the
 * life ladder keeps climbing (see `enemyLives`), and a fight that runs ten
 * rounds instead of five gives the man across the road twice as many chances
 * to land one. Measured on a flat six hits: the Dust Flats cost a third of the
 * bar a duel and the Galaxy cost SIXTY per cent.
 *
 * So the target scales with the length of the fight — three hits of headroom
 * for every shot it takes to put a rider down — and the Galaxy asks for nine
 * or ten where the Dust Flats asks for six. It is the same duel, priced the
 * same, written in the only unit the bar can express.
 */
export const HITS_PER_SHOT_ON_THEM = 3;

export function hitsToKillPlayer(worldId) {
  const power = EXPECTED_POWER[worldId] || EXPECTED_POWER[1];
  const shots = enemyLives(worldId) / power.damage;
  return Math.max(HITS_TO_KILL_PLAYER, HITS_PER_SHOT_ON_THEM * shots);
}

/**
 * How many riders a boss is worth.
 *
 * Half again, and the number is small because a boss fight's danger is its
 * LENGTH rather than its bar. Every boss carries its world's landmark, the
 * landmark's clock is real time, and a fight that runs thirteen rounds instead
 * of eight takes two more eruptions and a dozen more shots at the player. At
 * twice a rider — which is where this sat while a rider died in a hit and a
 * half, and which was the same fight — Old Scratch ran fourteen rounds, erupted
 * in nine fights out of ten and killed three quarters of everybody who reached
 * him.
 */
export const BOSS_LIVES_MUL = 1.5;

/**
 * The riders' own ladder: one diamond in the Dust Flats, two more every world.
 *
 * This used to be derived from the player's gun, which kept the shots-to-kill
 * pinned at exactly a hit and a half everywhere and made the life totals
 * whatever fell out — four in the Prairie, sixteen in the Galaxy. It is a
 * ladder in its own right now, because how much life the man across the road is
 * carrying is the most visible number in a fight and it should be a decision
 * rather than a remainder.
 *
 * What that costs is a shots-to-kill that drifts: two for four worlds, then two
 * and a half, then three, as the forge ladder runs out under a life total that
 * does not. `tools/sim.mjs asymmetry` prints the drift and fails the build if
 * it leaves 1.5–3.5 — a rider that dies to one shot has no fight in it, and one
 * that takes four turns every duel into a war of attrition the bar cannot pay
 * for.
 */
export const ENEMY_LIVES_BASE = 1;
export const ENEMY_LIVES_PER_WORLD = 2;

/**
 * WHAT A RIDER'S BULLET COSTS YOU: THE BAR, OVER SIX
 * ---------------------------------------------------------------------------
 * Derived again, and it went back to being derived the day the level curve
 * changed. A hand-written ladder (half a life in the Dust Flats and half a
 * life more every world) is the right shape only while the player's bar grows
 * at the same rate — and on a bar that now gains ONE life a level at three
 * levels every two worlds, a bullet climbing by a half every world would have
 * the Galaxy killing you in three and a half hits where the Dust Flats takes
 * six. The two cannot both be written down by hand; the bar is the one the
 * player can see, so the bullet is the one that follows.
 *
 * What comes out is a ladder that still climbs, just more slowly — a half in
 * the flats and the Prairie, a whole one through the pass and the Bayou, a
 * life and a half out in the Basin and the Galaxy — and six hits to kill you
 * in every world of the game, which is the number this file exists to hold.
 *
 * This is the FLOOR of it. Riders past the halfway mark of a world can be
 * carrying more; see `enemyGunDamageAt`, which is what actually arms an enemy.
 */
export function enemyGunDamage(worldId) {
  const power = EXPECTED_POWER[worldId] || EXPECTED_POWER[1];
  return toHalfDown(power.lives / hitsToKillPlayer(worldId));
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

/**
 * How many of the riders past that mark are carrying the heavier gun.
 *
 * It was half of them, on a bar that ran to twenty-three, where an extra half
 * a diamond a shot was a rounding. On the bar this game has now — three at the
 * start and ten at the end — half a diamond is the whole step between one rung
 * of the enemy ladder and the next, so a ramped rider does not hit "a little
 * harder", he hits like the world after this one. At one in two that made the
 * back half of every world a different game from the front half; at one in
 * three it is what it was meant to be, which is a warning.
 */
export const ENEMY_DAMAGE_RAMP_CHANCE = 1 / 3;

export function enemyGunDamageAt(worldId, progress = 0, upgraded = false) {
  const base = enemyGunDamage(worldId);
  const late = (Number(progress) || 0) >= ENEMY_DAMAGE_RAMP_AT;
  return late && upgraded ? base + ENEMY_DAMAGE_STEP : base;
}

/** How much life a rider of a given world carries, before its own spread. */
export function enemyLives(worldId) {
  const world = Math.max(1, Math.min(6, worldId || 1));
  return ENEMY_LIVES_BASE + (world - 1) * ENEMY_LIVES_PER_WORLD;
}

/** How much life that world's boss carries: half again its riders, always. */
export function bossLives(worldId) {
  return Math.max(2, Math.round(enemyLives(worldId) * BOSS_LIVES_MUL * 2) / 2);
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
export const INN_BASIC_FRACTION = 0.5;

export function innBasicHeal(worldId, maxLives = STARTING_LIVES) {
  const scaled = maxLives * INN_BASIC_FRACTION + (worldId - 1) * 0.15;
  return Math.max(1, Math.round(scaled * 2) / 2);
}

/**
 * What a healing item is actually worth to you, on the bar you are standing on.
 *
 * Two shapes, and the item says which it is (see the note over the three of
 * them in src/game/items.js). A flat `heal` is a flat number of diamonds — the
 * bandage's two, worth most of the bar in the Dust Flats and a ninth of it in
 * the Galaxy, which is the right shape for the cheapest thing on the counter.
 * A `healFraction` is a share of whatever bar you have grown, so the Med Kit is
 * half of you and the Potion three quarters wherever you are standing.
 *
 * Fractions round UP to a whole diamond. Half of nine is four and a half and
 * the grid can draw that, but "half your lives" is a promise a player checks
 * against their own bar, and a promise that lands a half short of what they
 * counted reads as a bug. Rounding up is also what makes the Med Kit worth
 * carrying on an odd bar.
 */
export function itemHeal(item, maxLives = STARTING_LIVES) {
  if (!item) return 0;
  if (!item.healFraction) return item.heal || 0;
  return Math.max(1, Math.ceil(maxLives * item.healFraction));
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
 *   level 0 → 1 |      90   a couple of Dust Flats purses
 *   level 1 → 2 |     130   the rest of the Dust Flats
 *   level 2 → 3 |     180   early Prairie
 *   level 3 → 4 |     255   late Prairie
 *   level 4 → 5 |     360   the pass
 *   level 5 → 6 |     505   the pass, and then it is done
 *
 * TWO RUNGS A WORLD, AND THEN THE FORGE IS FINISHED WITH YOU
 * ---------------------------------------------------------------------------
 * The curve is SOLVED for that against the gold the road actually pays
 * (`tools/sim.mjs asymmetry` prints both columns), and the whole ladder is
 * 1,520 of a full clear that pays about seventeen thousand.
 *
 * That is a deliberate and fairly drastic reversal. It used to run 40 → 16,605
 * — the whole run's savings for the last rung — and that made sense while a
 * rung was worth two whole lives a shot. A rung is worth half a life again now,
 * which is the size of the step the seven revolvers were designed around, and a
 * ladder of half-life steps cannot be priced like a monument: at sixteen
 * thousand for the top rung nobody would ever buy the gun the art was drawn
 * for.
 *
 * So the forge is an EARLY-GAME shop. It is the best gold on the road for three
 * worlds — a rung shortens every fight of the world it is bought in — and by
 * the Bayou there is nothing left on the plate. What the money does after that
 * is what the later worlds are actually about: med kits, beds, and the
 * legendaries that used to lose the argument with the next rung every time.
 */
export const GUN_COST_BASE = 90;
export const GUN_COST_GROWTH = 1.35;
export const GUN_COST_ESCALATION = 0.05;

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
