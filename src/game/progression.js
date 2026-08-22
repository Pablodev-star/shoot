/**
 * SHOOT! — Progression maths (Block 5a).
 *
 * Pure functions only: no state, no side effects. Every curve in the game lives
 * here so balancing is a matter of editing constants in one file.
 */

import { getWorld, FINAL_WORLD } from './worlds.js';
import { SELL_RATIO } from './items.js';
import { OVERRIDES } from '../admin/overrides.js';
/**
 * THE SECOND HAND ON EVERY CURVE IN THIS FILE
 * ---------------------------------------------------------------------------
 * Read exactly like `OVERRIDES` above, and for the same reason: these are pure
 * functions of their arguments, and threading "which road is this" through
 * forty call sites would change forty signatures to say one thing. On the
 * ordinary road every knob below is 1 and every line reading one is a
 * multiplication by one — see src/game/difficulty.js for the whole table.
 */
import { tuning, isHard } from './difficulty.js';

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
 * the bar reads 3, 4, 6, 7, 9, 10, 12 at the seven borders.
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
 *   level 2 |     45 · the first fight     level  6 | 1,255 · middle of world 4
 *   level 3 |    230 · end of world 1      level  7 | 1,851 · world 5
 *   level 4 |    478 · middle of world 2   level  8 | 2,650 · middle of world 5
 *   level 5 |    810 · world 3             level  9 | 3,721 · the Hollow
 *                                          level 10 | 5,157 · the Galaxy
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
 * whole climb is three diamonds to ten.
 *
 * AND THE ROAD OUTGROWS IT ON PURPOSE
 * ---------------------------------------------------------------------------
 * For a while the rider's bullet was DERIVED from this bar, which held the
 * price of a duel at about a third of it in every world. It is a hand-written
 * ladder again (`enemyGunDamage`): half a life in the Dust Flats and half a
 * life more every world, one rung of ENEMY_GUNS per world, because that ladder
 * is the only difficulty signal in the game the player can SEE — it is the gun
 * in the man's hand — and a derived bullet stood still for three worlds at a
 * time.
 *
 * The bar gains about two thirds of a life a world and the bullet gains a
 * half, so the two diverge, and the road gets steeper the further along it you
 * are: six connected hits deep in the Dust Flats, about three and a half from
 * the Bayou on. Nothing here compensates for that and nothing is meant to —
 * see the note over TARGETS in tools/sim.mjs for how far a run now gets, which
 * is the number that decision is written in.
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
 * The player's two: a bar that starts at three and grows one a level on a curve
 * that pays out about three levels every two worlds, and a forge ladder worth
 * half a life a rung that a run finishes buying around the Bayou.
 *
 *   world | you have      | a rider hits for | and carries | hits to kill you
 *   ------+---------------+------------------+-------------+-----------------
 *     1   |  3 lives  0.5 |       0.5        |   1 life    | 6
 *     2   |  4 lives  1.5 |       1          |   3 lives   | 4
 *     3   |  6 lives  2.5 |       1.5        |   5 lives   | 4
 *     4   |  7 lives  3.5 |       2          |   7 lives   | 3.5
 *     5   |  9 lives  3.5 |       2.5        |   9 lives   | 3.6
 *     6   | 10 lives  3.5 |       3          |  11 lives   | 3.3
 *     7   | 12 lives  3.5 |       3.5        |  12 lives   | 3.4
 *
 * The last column is the whole story of this road: it starts at six, which is a
 * fight you can afford to misplay twice, and it settles at three and a half,
 * which is a fight you cannot. And a rider in the back half of a world is
 * carrying the NEXT world's bullet a third of the time (`enemyGunDamageAt`),
 * so the second half of a crossing takes another half-hit off it — and on the
 * hard road every rider on it is already a rung up before the coin is flipped.
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
  /**
   * The seventh row, and it is the reason the Galaxy could be moved up a rung
   * without the ending becoming a wall. A player who has crossed the Hollow
   * arrives at the last world on twelve diamonds rather than ten — the level
   * curve pays out about three levels every two worlds and the Hollow is
   * another world — against riders who carry two more than they used to. The
   * two sides moved together, which is the only way this file allows either of
   * them to move at all.
   */
  7: { lives: 12, damage: 3.5 },
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
 * IT IS A TARGET, AND THE ROAD NO LONGER MEETS IT
 * ---------------------------------------------------------------------------
 * It used to decide the riders' damage — bullet = bar / six. It does not any
 * more: what the bullet costs is a hand-written ladder (`enemyGunDamage`) and
 * what a rider carries is another (`enemyLives`), and neither is solved against
 * this number. What is left of it is a yardstick — `tools/sim.mjs asymmetry`
 * prints the hits-to-kill each world actually delivers beside what this target
 * would pay for, and the gap between them is the measure of how far the road
 * has been pushed past its own economy. The build only fails if a world drops
 * under THREE connected hits, which is where a duel stops being one.
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
 * …and the last rung of it is ONE, not two.
 *
 * The kink is not a fudge, it is the forge ladder arriving in the arithmetic.
 * A rider's life total climbs by two a world while the player's gun climbs by
 * half a life a rung — and the gun STOPS, at three and a half, somewhere in the
 * Basin. Every world after that costs an extra shot per duel, and the harness
 * bounds that drift hard (1.5 to 3.5 of your shots to kill a rider; see
 * `HITS_PER_SHOT_ON_THEM`). On six worlds a straight +2 ladder finished at 3.2
 * and fitted. On seven it finishes at 3.7 and does not: the last world's duels
 * become a war of attrition that no amount of shopping can shorten, because
 * there is nothing left in the shop to buy.
 *
 * Two ways out of that. Give the forge an eighth rung — which makes every world
 * after the Basin easier as well, and the late game's only remaining difficulty
 * curve is precisely that the gun has stopped. Or let the RIDERS' ladder take a
 * smaller last step, which changes exactly one world. This is the second.
 */
export const ENEMY_LIVES_FINAL_STEP = 1;

/**
 * WHAT A RIDER'S BULLET COSTS YOU: ONE RUNG OF THE GUN LADDER PER WORLD
 * ---------------------------------------------------------------------------
 * Half a life in the Dust Flats and half a life more every world after it, all
 * the way to three and a half in the Galaxy. It is written down by hand, and
 * it is written down by hand ON PURPOSE — this is the one enemy number the
 * player is shown rather than told, because a rider's bullet comes with the
 * gun that fires it (ENEMY_GUNS in src/game/gun-tiers.js) and that ladder is
 * seven rungs long. One world, one rung: the Dust Flats carry the short steel
 * sixgun, the Prairie the brass one, the Pass the longbarrel, and the thing
 * standing in the Galaxy is holding a Nova frame. A player who has crossed two
 * worlds can read the road ahead off the silhouette in the man's hand.
 *
 * WHAT IT REPLACED, AND WHY
 * ---------------------------------------------------------------------------
 * It used to be DERIVED — bar over six, rounded down — which held the price of
 * a duel at about a third of the bar in every world and produced a ladder with
 * flat spots in it: two worlds at a half, two at a whole, three at a life and
 * a half. That is the right curve for the spreadsheet and the wrong one for the
 * road, because three worlds running with the same bullet is three worlds
 * running with the same gun in the man's hand, and the one difficulty signal
 * the game shows rather than states stops moving for half the run.
 *
 * The cost of writing it by hand is real and it is not hidden: the bullet now
 * climbs faster than the bar does (the bar gains about two thirds of a life a
 * world; the bullet gains a half), so the back half of the game is meaner than
 * it was. `tools/sim.mjs asymmetry` prints the hits-to-kill this produces in
 * every world and its band was widened to admit it — see the note there.
 *
 * This is the FLOOR of it. Riders past the halfway mark of a world can be
 * carrying more, and on the hard road every one of them is; see
 * `enemyGunDamageAt`, which is what actually arms an enemy.
 */
export const ENEMY_BULLET_STEP = 0.5;

export function enemyGunDamage(worldId) {
  const world = Math.max(1, Math.min(FINAL_WORLD, Math.round(worldId) || 1));
  return world * ENEMY_BULLET_STEP;
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

/**
 * …and what it actually is right now, which is the same number on the ordinary
 * road and one in two on the hard one. Every caller that FLIPS the coin goes
 * through here; the constant above is kept as the ordinary road's value and as
 * the thing the note is written about.
 */
export function enemyRampChance() {
  return tuning().enemyRampChance;
}

/**
 * THE HARD ROAD IS ALWAYS ONE RUNG AHEAD
 * ---------------------------------------------------------------------------
 * Every other knob in src/game/difficulty.js is a multiplier of a few per cent,
 * because that is what a chain of fifty survival checks needs (see the long
 * note over the `hard` column there). This one is not a multiplier and it is
 * not subtle: on the hard road the man across from you is carrying the NEXT
 * world's gun, from the first rider in the Dust Flats to the thing at the end
 * of the Galaxy, and he is carrying it where the player can see it.
 *
 * It is here rather than in the tuning table for the same reason the ramp is:
 * the ladder is the thing that has a picture of itself. A rider one rung up is
 * a different silhouette in the hand, so "hard" is legible on the road instead
 * of being a number the player is told about on a card and never sees again.
 *
 * The two shifts stack. A hard rider past halfway in the Prairie is on the
 * Prairie's whole life, plus a rung for the road, plus the coin — one and a
 * half, or two.
 */
export function enemyBulletFloor(worldId) {
  const base = enemyGunDamage(worldId);
  return isHard() ? base + ENEMY_DAMAGE_STEP : base;
}

export function enemyGunDamageAt(worldId, progress = 0, upgraded = false) {
  const floor = enemyBulletFloor(worldId);
  const late = (Number(progress) || 0) >= ENEMY_DAMAGE_RAMP_AT;
  return late && upgraded ? floor + ENEMY_DAMAGE_STEP : floor;
}

/** How much life a rider of a given world carries, before its own spread. */
export function enemyLives(worldId) {
  const world = Math.max(1, Math.min(FINAL_WORLD, worldId || 1));
  const fullSteps = Math.min(world, FINAL_WORLD - 1) - 1;
  return ENEMY_LIVES_BASE + fullSteps * ENEMY_LIVES_PER_WORLD
    + (world === FINAL_WORLD ? ENEMY_LIVES_FINAL_STEP : 0);
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
  const size = 1 + (Math.max(1, Math.min(FINAL_WORLD, worldId)) - 1) * 0.65;
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
  // The admin multiplier is folded in here rather than at the one caller, so
  // that anything else which ever pays exp — a future bounty, the harness —
  // is bent by the same dial. It is 1 unless a tester has moved it.
  return Math.round(
    base * world.expMul * (isBoss ? 3.2 : 1) * OVERRIDES.economy.expMul * tuning().expMul,
  );
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
  return Math.round(
    base * world.goldMul * (isBoss ? 4 : 1) * OVERRIDES.economy.goldMul * tuning().goldMul,
  );
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

/** How much prices inflate per world, on top of each world's priceMul. */
export const PRICE_GROWTH = 1.42;

/**
 * WHAT EVERY COUNTER IN THE GAME CHARGES OVER THE CATALOGUE
 * ---------------------------------------------------------------------------
 * Double, and it exists because the road got longer rather than because
 * anything on the shelf changed. A world is close to twice the fights it used
 * to be, so it pays close to twice the purse — and a shop whose prices were
 * solved against the old income is a shop that runs out of things to sell.
 * Measured on the long road at the old prices, the careful player crossed the
 * Bayou with a maxed gun, a full bag and gold they had nothing to do with, and
 * went on to reach the Galaxy in five runs out of six: the ledger, which is
 * where this game says the skill lives, had quietly switched itself off for the
 * back half of the run. At double it is a live decision again in every world,
 * and the three skill bands are back where `TARGETS` in tools/sim.mjs wants
 * them.
 *
 * ONE NUMBER RATHER THAN FORTY
 * ---------------------------------------------------------------------------
 * Every `basePrice` in src/game/items.js could have been rewritten instead, and
 * that would have moved something it should not: `sellPrice` is a fraction of
 * an item's base value, so doubling the catalogue would have doubled what the
 * saddlebag is worth as well and left the buy-low-sell-high hole this game
 * closed years ago half open. A markup on the ASKING price only cannot do that
 * — it makes the shop dearer and leaves what a shopkeeper pays you exactly
 * where it was.
 */
export const SHOP_MARKUP = 2;

/**
 * Shop price for an item in a given world.
 * price = basePrice * SHOP_MARKUP * PRICE_GROWTH^(world-1) * world.priceMul
 */
export function itemPrice(item, worldId) {
  const world = getWorld(worldId);
  const raw = item.basePrice * SHOP_MARKUP * Math.pow(PRICE_GROWTH, worldId - 1) * world.priceMul
    * OVERRIDES.economy.priceMul * tuning().priceMul;
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

/**
 * THE TWO BEDS ARE FOUR TIMES APART, NOT THREE HALVES
 * ---------------------------------------------------------------------------
 * A straw mattress and a real room used to be 45 and 130, which is close
 * enough that the choice made itself: the premium was under three times the
 * price for twice the lives on any bar worth sleeping on, so a player with the
 * money always took it and a player without one always took the other. Two
 * prices that near each other are one price with a discount on it.
 *
 * They are a cheap bed and an expensive one now. The straw mattress came DOWN —
 * it is the thing you can always afford, the one purchase on the road that a
 * broke run can still make — and the room went up by better than a third, which
 * is what it is worth when it is the night before a boss and the bar is nearly
 * gone. In between there is an actual decision: half of you now and gold left
 * over for the counter, or all of you and nothing to buy bandages with.
 *
 * Both still ride the same curve as everything else on the road, so the gap
 * grows with the world: forty against a hundred and seventy-five in the Dust
 * Flats, and five hundred against two thousand four hundred in the Galaxy.
 */
export const INN_BASIC_BASE = 40;
export const INN_PREMIUM_BASE = 175;

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
  const scaled = maxLives * tuning().innBasicFraction + (worldId - 1) * 0.15;
  return Math.max(1, Math.round(scaled * 2) / 2);
}

/**
 * WHAT THE EXPENSIVE BED IS WORTH, AND THE ONE PROMISE HARD MODE TAKES BACK
 * ---------------------------------------------------------------------------
 * Infinity, on the ordinary road, and that is not a placeholder — the premium
 * bed has restored EVERY life since the day inns existed, the card says so, and
 * the number the caller wants for "all of it" is a number no bar can exceed.
 *
 * On the hard road it is three quarters of the bar, and it is the single most
 * consequential line in the whole mode. A bed that fills the bar makes gold and
 * lives the same resource: a run with a full purse walks into every boss at
 * full, and every other system that exists to make you ration something — the
 * bandage, the totem, the vest, the decision to walk past a fight — is arguing
 * with a shop that sells the argument away. Take the last quarter off and the
 * bar only ever comes all the way back at a world border, which is exactly how
 * far apart the game's own difficulty ladder assumes those moments are.
 */
export function innPremiumHeal(maxLives = STARTING_LIVES) {
  const fraction = tuning().innPremiumFraction;
  if (fraction >= 1) return Infinity;
  return Math.max(1, Math.round(maxLives * fraction * 2) / 2);
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
  const raw = item.healFraction
    ? Math.max(1, Math.ceil(maxLives * item.healFraction))
    : item.heal || 0;
  return scaleToBar(raw, tuning().itemHealMul);
}

/**
 * The gauge a meal fills, and the gold diamonds a bottle hangs on the end of
 * the bar. Both are read through here for one reason: hard mode nerfs what is
 * in the bag, and "what is in the bag" is three fields on three items rather
 * than one number anybody could have multiplied at the call site.
 *
 * They round DOWN to whole units and never to nothing — a bottle that hands
 * over zero lives is an item that does not work, which is a bug wearing a
 * difficulty setting.
 */
export function itemFood(item) {
  if (!item || !item.food) return 0;
  /**
   * A FULL POT IS A FULL POT ON BOTH ROADS
   * -------------------------------------------------------------------------
   * The stew and the Traveller's Feast are not "a bigger apple" — their whole
   * identity is that they fill the gauge to the TOP, which is what a meal is
   * worth when the next counter is eleven duels away (see the note over them in
   * src/game/items.js). `food: 100` is a fill rather than a quantity, and the
   * cards say so in as many words.
   *
   * Multiplying it left a shop selling "fills the hunger gauge to the top,
   * whatever was left in it" directly above a line reading "on this road: 90%
   * hunger", which is not a nerf, it is a contradiction. So the multiplier
   * applies to the things measured in percentages — the carrot and the apple,
   * which is where hunger pressure actually comes from — and the two meals that
   * promise the whole gauge keep the promise.
   */
  if (item.food >= HUNGER_MAX) return item.food;
  return Math.max(1, Math.round(item.food * tuning().foodMul));
}

export function itemBonusLives(item) {
  if (!item || !item.bonusLives) return 0;
  return Math.max(1, Math.round(item.bonusLives * tuning().bonusLivesMul));
}

/**
 * Anything measured in diamonds, bent by a difficulty knob and put back on the
 * half-diamond grid the interface can actually draw. Never below half a
 * diamond, for the same reason `toHalf` is not: a heal the bar cannot show is a
 * heal the player will report as broken.
 */
function scaleToBar(value, mul) {
  if (!value || mul === 1) return value;
  return Math.max(0.5, Math.round(value * mul * 2) / 2);
}

/**
 * THE COUNTER IS NOT ALLOWED TO LIE ABOUT WHAT IT IS SELLING
 * ---------------------------------------------------------------------------
 * Every `desc` in src/game/items.js states a number — "restores 20% hunger",
 * "patches you up for 2 lives", "three extra lives in gold" — and on the hard
 * road three of those numbers are no longer true. The alternative to this
 * function was rewriting forty description strings to be vague, which would
 * have made the ordinary road's shop worse in order to make the hard one
 * honest.
 *
 * So the description stays exactly as written and a second line goes under it
 * saying what this road actually pays. It returns null whenever the item is
 * worth what its card says, which on the ordinary road is always — so nothing
 * changes for a player who never unlocks the other mode.
 *
 * @returns {string|null}
 */
export function itemEffectNote(item, maxLives = STARTING_LIVES) {
  if (!item) return null;
  /**
   * It speaks only when the number ACTUALLY MOVED, which is not the same as
   * "the multiplier is not one". Everything here lands on a grid — half a
   * diamond for lives, a whole point for the gauge — and on the shallow end of
   * the road those grids are coarse enough to swallow a tenth whole: a Med Kit
   * on a three-diamond bar is two lives on either road, so a line under it
   * announcing two lives is a line that says nothing except "something is
   * different", which is the most alarming thing a card can say.
   */
  if (item.food) {
    const now = itemFood(item);
    return now === item.food ? null : `On this road: ${now}% hunger.`;
  }
  if (item.bonusLives) {
    const now = itemBonusLives(item);
    if (now === item.bonusLives) return null;
    return `On this road: ${now} gold ${now === 1 ? 'life' : 'lives'}.`;
  }
  if (item.heal || item.healFraction) {
    const now = itemHeal(item, maxLives);
    const ordinary = item.healFraction
      ? Math.max(1, Math.ceil(maxLives * item.healFraction))
      : item.heal || 0;
    if (now === ordinary) return null;
    return `On this road: ${now} ${now === 1 ? 'life' : 'lives'} back.`;
  }
  return null;
}

export function innBasicPrice(worldId) {
  const world = getWorld(worldId);
  const raw = INN_BASIC_BASE * Math.pow(PRICE_GROWTH, worldId - 1) * world.priceMul
    * tuning().innPriceMul;
  return Math.round(raw / 5) * 5;
}

export function innPremiumPrice(worldId) {
  const world = getWorld(worldId);
  const raw = INN_PREMIUM_BASE * Math.pow(PRICE_GROWTH, worldId - 1) * world.priceMul
    * tuning().innPriceMul;
  return Math.round(raw / 5) * 5;
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
  const raw = GUN_COST_BASE * Math.pow(GUN_COST_GROWTH, level) * (1 + level * GUN_COST_ESCALATION)
    * tuning().gunCostMul;
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
 * The gloom, and it is the odd one out: nothing is blowing, nothing is cold and
 * there is nothing in the air to breathe through. What it costs is the walking
 * — a road you cannot see the far end of is a road taken slowly and doubled
 * back on — so it is the lightest of the four, and it is on the list at all
 * because a sky that changes the duel and the view but not the ledger is a sky
 * the player has no reason to be afraid of.
 */
export const HUNGER_DRAIN_GLOOM_MUL = 1.2;
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
  /**
   * The floor moves with the mode as well as the ceiling. Two diamonds on the
   * ordinary road is "enough to reach the next shop"; on the hard one the
   * totem gives back less of the bar, and a floor that stayed at two would
   * quietly make the nerf invisible for the first four worlds — which is most
   * of where a totem is ever bought.
   */
  const mul = tuning().totemReviveMul;
  return Math.max(mul >= 1 ? 2 : 1.5, Math.round(Math.round(maxLives) / 2 * mul * 2) / 2);
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
