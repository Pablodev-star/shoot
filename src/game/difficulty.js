/**
 * SHOOT! — The two roads.
 *
 * Every number in this game already lives in a data file, and the difficulty of
 * it is the emergent sum of about forty of them. This is the one place that is
 * allowed to bend that sum, and it does it the way the Admin Panel does: a flat
 * table of named knobs read at the point of use, never a second copy of the
 * curve. `src/game/progression.js` still owns what a bandage is worth and
 * `src/duel/duel-ai.js` still owns how the man across the road thinks — they
 * simply ask here what road they are standing on first.
 *
 * WHY IT IS A TABLE OF MULTIPLIERS AND NOT A SECOND SET OF TABLES
 * ---------------------------------------------------------------------------
 * The obvious way to build a hard mode is to write a second `WORLDS`, a second
 * item catalogue and a second price curve. It is also the way hard modes rot:
 * two ladders drift, the tuning harness only ever measures one of them, and the
 * day somebody retunes the Bayou for the ordinary road the hard one quietly
 * becomes either a formality or a wall. Here there is one road with a
 * multiplier on it, so a change to the Bayou is a change to both crossings of
 * it and `node tools/sim.mjs hard` measures the same game the player plays.
 *
 * WHAT MAKES IT HARD, IN THE ORDER IT IS FELT
 * ---------------------------------------------------------------------------
 *   THE MAN ACROSS THE ROAD. He reads a pattern off two repeats instead of
 *   three, answers it more often, plays off a read more often, and owns his
 *   shield for a slightly larger share of the fight. He still never looks at
 *   your cylinder — the one line this game will not cross (see the note at the
 *   top of src/duel/duel-ai.js) — so he is smarter rather than psychic, and
 *   everything he does is still escapable by not repeating yourself.
 *
 *   HOW MUCH OF HIM THERE IS. More life on every rider and on every boss, more
 *   of them carrying a trick, and more of the back half of every world carrying
 *   the heavier gun. A fight that took two shots takes three, and a fight that
 *   runs longer is a fight with more of his rounds in it.
 *
 *   WHAT EVERYTHING COSTS. Every counter in the game asks about half again —
 *   the stall, the inn and the forge alike — and the half-price tag turns up
 *   half as often. A body is worth more out here, and it does not cover it.
 *
 *   WHAT YOU GET FOR IT. The cheap bed is a smaller share of you, the expensive
 *   one no longer restores every life — which is the single change that stops a
 *   full purse being a full bar — and what is in the bag does less: the kit,
 *   the bottle, the meal and the totem. (Not the bandage. Two diamonds is two
 *   diamonds on any grid the interface can draw, and a heal that rounded down
 *   to a diamond and a half would take a quarter off the cheapest thing on the
 *   counter — which is the one purchase a broke run can always make.)
 *
 * AND IT IS STILL WINNABLE, WHICH IS THE ONLY LINE THAT MATTERS
 * ---------------------------------------------------------------------------
 * A hard mode nobody finishes is a wall with a name on it. The harness runs the
 * whole thing (`node tools/sim.mjs hard`) and `npm test` gates it, so the two
 * roads are measured on every build rather than the ordinary one being measured
 * and the hard one being hoped about. Every number in the table below came out
 * of that harness rather than out of a guess — the first four attempts at it
 * are described over the `hard` column, and all four were walls.
 *
 * WHERE THE MODE LIVES
 * ---------------------------------------------------------------------------
 * On the SLOT, not on the device. It is chosen once when a run is created and
 * written into the save payload, so a slot is a Normal run or a Hard run for
 * as long as it exists and picking it back up puts the same road under you.
 * `run.js` sets it at both doors into a run and puts it back to Normal on the
 * way out, exactly like the Admin Panel's overrides, so nothing outside a run
 * is ever quietly reading a hard-mode price.
 */

/**
 * The only thing this file is allowed to import.
 *
 * Half the game's curves read the table below — `src/game/progression.js` most
 * of all — so anything imported here is imported by everything, and a single
 * edge back into the game would close a cycle through the price curve. The
 * profile is a leaf (storage and the audio mixer, nothing else), so it is safe;
 * the achievement ledger is not, which is why the grandfather clause for
 * players who finished the game before this existed lives in the boot sequence
 * (`src/main.js`) rather than in `isHardUnlocked` below.
 */
import { getProfile, updateProfile } from '../core/settings.js';

/**
 * The two modes as the interface presents them.
 *
 * `blurb` is one line for a card. `changes` is the honest list, and it is here
 * rather than in the screen that draws it because three screens draw it — the
 * picker, the unlock cut-scene and the slot card's tooltip — and a promise
 * about the road that is written down three times is a promise that will
 * eventually be wrong in two of them.
 */
export const DIFFICULTIES = [
  {
    id: 'normal',
    name: 'Normal',
    blurb: 'The road as it was built. Long, and it kills most runs.',
    changes: [],
  },
  {
    id: 'hard',
    name: 'Hard',
    blurb: 'The same road, and nothing on it is on your side.',
    changes: [
      'Riders carry more life, and the man across the road reads a repeated move off two instead of three.',
      'Bosses are bigger, more riders carry a trick, and more of them carry the heavier gun.',
      'Every counter asks about half again — the stall, the inn and the forge — and half-price tags are rare.',
      'The cheap bed puts back less, and the expensive one no longer restores every life.',
      'Med kits, bottles, meals and the Dusk Totem are all worth less than they say.',
      'A body is worth more gold out here. It does not cover it.',
    ],
  },
];

export const DEFAULT_DIFFICULTY = 'normal';

const BY_ID = new Map(DIFFICULTIES.map((d) => [d.id, d]));

/**
 * EVERY KNOB IN THE GAME, WITH THE ORDINARY ROAD WRITTEN OUT IN FULL
 * ---------------------------------------------------------------------------
 * `normal` is not an empty object with defaults hiding in the readers. It is
 * the complete list, at the values the game already ships, because a table
 * where one column is implicit is a table nobody can diff — and because the
 * only way to see what hard mode actually does is to read the two columns side
 * by side.
 *
 * Anything named `...Mul` multiplies. Anything named `...Bonus` is added.
 * Everything else is an absolute value the reader would otherwise hold as a
 * constant of its own.
 */
const TUNING = {
  normal: {
    // --- the man across the road ------------------------------------------
    /** Extra life on every rolled rider, as a multiple of what they rolled. */
    enemyLivesMul: 1,
    /** …and on every boss, which is a longer fight to begin with. */
    bossLivesMul: 1,
    /** Added to the accuracy that scales how often the AI plays off a read. */
    enemyAccuracyBonus: 0,
    /** How many riders are carrying a trick at all. */
    enemyAbilityChanceMul: 1,
    /** …and how many are carrying the world's landmark. */
    enemySpecialChanceMul: 1,
    /** How often a rider who has a trick reaches for it, per round. */
    enemyCastMul: 1,
    /** Share of the riders past halfway carrying the next rung of the gun. */
    enemyRampChance: 1 / 3,

    // --- how the agent thinks ---------------------------------------------
    /** The most of its turns it can ever play off a read of the player. */
    aiReadCeiling: 0.62,
    /** Ceiling on the share of turns spent behind a shield. */
    aiShieldCeiling: 0.2,
    /** Repeats before it starts expecting another one. */
    aiStreakTrigger: 3,
    /** How much a streak that long adds to the chance of answering it. */
    aiStreakBonus: 0.34,
    /** Added to the odds it takes a finishing shot when one is there. */
    aiFinisherBonus: 0,

    // --- the ledger --------------------------------------------------------
    /** On top of SHOP_MARKUP and the world's own curve. */
    priceMul: 1,
    /** Beds ride their own curve, so they get their own dial. */
    innPriceMul: 1,
    /**
     * …and so does the forge, which is the one counter whose prices are not on
     * the item curve at all (`gunUpgradeCost`). It needs its own dial for a
     * reason that only shows up on the hard road: a rider there is worth more
     * gold, because a kill is priced in riders and they are bigger — so a
     * ladder left at the ordinary price would be CLIMBED FASTER on the harder
     * mode, and the one purchase that shortens every fight in the game would
     * arrive a world early. The forge has to move with the purse or the road
     * pays for its own way out.
     */
    gunCostMul: 1,
    /** How often anything on a counter is half price. */
    discountChanceMul: 1,
    /** What a kill is worth. */
    goldMul: 1,
    expMul: 1,
    /** The purse a run opens with. */
    startingGold: 60,

    // --- what a life costs -------------------------------------------------
    /** Share of the bar the cheap bed puts back (INN_BASIC_FRACTION). */
    innBasicFraction: 0.5,
    /**
     * Share of the bar the good bed puts back. One means "every life", which
     * is what the premium bed has always promised — and the one promise hard
     * mode takes away, because a bed that fills the bar makes a full purse
     * into a full bar and there is nothing left for the road to threaten.
     */
    innPremiumFraction: 1,
    /** Everything in the bag that puts lives back. */
    itemHealMul: 1,
    /** …and everything that fills the gauge. */
    foodMul: 1,
    /** …and the gold diamonds a bottle hangs on the end of the bar. */
    bonusLivesMul: 1,
    /** What you come back on when the totem breaks. */
    totemReviveMul: 1,
    /** How fast the gauge empties while walking. */
    hungerDrainMul: 1,
  },

  /**
   * WHY THESE LOOK SO MILD, AND WHY THEY ARE NOT
   * -------------------------------------------------------------------------
   * Nothing here is a doubling. A rider carries a tenth more life; a bandage is
   * worth a tenth less; the agent's read ceiling moves by three points. Read
   * cold, this table looks like a rounding error.
   *
   * It is not, and the reason is the shape of a run. Finishing this game is a
   * chain of about fifty survival checks with permadeath at the end of every
   * one, and a chain compounds: on the ordinary road an expert reaches the
   * Galaxy on three runs in five, which is a per-duel death rate of about one
   * per cent. Triple that rate — which is what a handful of tenths comes to
   * once they are multiplied together — and three runs in five becomes one in
   * five. MEASURED, `node tools/sim.mjs hard`, 400 runs a skill:
   *
   *              reaches the Galaxy     finishes the game
   *   expert       59%  →  23%            14%  →  1.8%
   *   average      17%  →   2%             1%  →    0%
   *   novice        7%  →   1%             0%  →    0%
   *
   * That is the whole design of this column: an expert on the hard road plays
   * roughly the game an average player has on the ordinary one, and the ending
   * is something an expert reaches about once in a long evening rather than
   * once a week.
   *
   * THE FIRST FOUR PASSES AT THIS WERE ALL WALLS, IN THE SAME WAY
   * -------------------------------------------------------------------------
   * They were built by picking numbers that sounded hard — a quarter more life,
   * prices up half, heals down a third — and every one of them measured out
   * between 0% and 8% for an expert, which is a mode with an outfit at the end
   * of it that nobody will ever wear. The harness was run knob-group by knob-
   * group to find out why, and the answer was worth writing down:
   *
   *   the combat knobs alone      60% → 35%
   *   the price knobs alone       60% → 45%   (with the purse raised to match)
   *   the ITEM AND BED knobs      60% → 19%
   *
   * What kills a run on this road is not the man across it and it is not the
   * price tag. It is how little a bandage puts back, because that is the number
   * every one of those fifty checks is paid for out of. So the value knobs are
   * the gentlest column in the table and the price knobs are the boldest — the
   * exact opposite of what the first four passes assumed.
   *
   * AND THE PURSE GOES UP, WHICH IS NOT A MISTAKE
   * -------------------------------------------------------------------------
   * `goldMul` is 1.45 against prices at 1.4, so a hard run is carrying bigger
   * numbers than an ordinary one and they buy it about four per cent more. Then
   * everything that gold is spent ON is worth a tenth less and the discount
   * comes up half as often, so the real figure is about ELEVEN PER CENT LESS
   * HEALING PER GOLD — plus the tougher riders, plus the sharper opponent.
   *
   * It is written this way because a run has to be able to *pay* for the road
   * it is on. The version with the purse left alone had prices at 1.4 and an
   * expert reaching the Galaxy 7% of the time, and every one of those deaths
   * was somebody standing at a counter unable to afford the thing that would
   * have saved them. A hard mode where the correct decision is unavailable is
   * not testing the player's decisions. This one is: the money is bigger, the
   * shelf is dearer, and what you carry away from it does less.
   *
   * It is also why the forge moves with the rest of it (`gunCostMul`). Leaving
   * that ladder at the ordinary price while the purse went up by half would
   * have handed the hard road a maxed revolver a world early, which is the one
   * purchase in the game big enough to undo everything above.
   */
  hard: {
    // --- the man across the road ------------------------------------------
    /**
     * A tenth, and it lands on the half-diamond grid by rounding DOWN — see
     * `scaleLives` in src/game/enemies.js. The Dust Flats therefore comes out
     * untouched, which is deliberate: three diamonds is the shallowest the bar
     * ever is, and the pass that rounded to nearest ended ninety-five per cent
     * of all hard runs in the first world.
     */
    enemyLivesMul: 1.1,
    /** A boss fight is the longest fight in its world, so it gets less. */
    bossLivesMul: 1.08,
    enemyAccuracyBonus: 0.03,
    enemyAbilityChanceMul: 1.15,
    enemySpecialChanceMul: 1.1,
    enemyCastMul: 1.05,
    /** Better than a third of the back half of every world, not a third. */
    enemyRampChance: 0.36,

    // --- how the agent thinks ---------------------------------------------
    //
    // The cheapest lethality in the table and the most VISIBLE change in the
    // game: two of these four are about punishing a repeated move, which is
    // something the player can watch happening and can stop doing. It still
    // never looks at your cylinder.
    aiReadCeiling: 0.65,
    aiShieldCeiling: 0.21,
    /** Two repeats, not three. The rival notices a pattern sooner. */
    aiStreakTrigger: 2,
    aiStreakBonus: 0.38,
    aiFinisherBonus: 0.04,

    // --- the ledger --------------------------------------------------------
    priceMul: 1.4,
    innPriceMul: 1.55,
    gunCostMul: 1.4,
    /** Half as many half-price tags on the road. */
    discountChanceMul: 0.55,
    goldMul: 1.45,
    expMul: 1,
    /**
     * Left where it is, and it is the one knob in this column that does not
     * move. Sixty gold at these prices already buys a third less than sixty
     * gold on the ordinary road, and the opening purse is what stands between
     * a new run and the first shop — cutting it as well would decide runs in
     * the first two minutes, which is the one place this road is not trying to.
     */
    startingGold: 60,

    // --- what a life costs -------------------------------------------------
    //
    // The gentlest column, for the reason measured above: this is the group
    // that decides how long a run lives. A tenth off each of them is already
    // most of the difference between the two roads.
    innBasicFraction: 0.45,
    innPremiumFraction: 0.92,
    itemHealMul: 0.9,
    foodMul: 0.9,
    bonusLivesMul: 0.8,
    totemReviveMul: 0.85,
    hungerDrainMul: 1.05,
  },
};

/**
 * The road currently under the player's boots.
 *
 * Module state, exactly like `OVERRIDES` in src/admin/overrides.js and for the
 * same reason: every curve in the game is a pure function of its arguments and
 * threading a mode through forty call sites would mean changing forty
 * signatures to say one thing. `run.js` sets it at both doors into a run and
 * clears it on the way out.
 */
let current = DEFAULT_DIFFICULTY;

/** @returns {'normal'|'hard'} */
export function getDifficulty() {
  return current;
}

/**
 * Put a road under the game. Anything unknown — an edited save, a payload from
 * a future release — walks in on the ordinary one rather than throwing.
 * @param {string} id
 */
export function setDifficulty(id) {
  current = BY_ID.has(id) ? id : DEFAULT_DIFFICULTY;
  return current;
}

/** True while the hard road is under the player. */
export function isHard() {
  return current === 'hard';
}

/** The knobs for the road currently under the player. */
export function tuning() {
  return TUNING[current] || TUNING[DEFAULT_DIFFICULTY];
}

/** The knobs for a named road, whatever is currently set. Used by the harness. */
export function tuningFor(id) {
  return TUNING[BY_ID.has(id) ? id : DEFAULT_DIFFICULTY];
}

/** Name, blurb and the honest list of what changes. Never null. */
export function difficultyInfo(id = current) {
  return BY_ID.get(id) || BY_ID.get(DEFAULT_DIFFICULTY);
}

// ---------------------------------------------------------------------------
// The lock
// ---------------------------------------------------------------------------

/**
 * WHY THE UNLOCK IS ON THE PROFILE AND NOT ON A SLOT
 * ---------------------------------------------------------------------------
 * Finishing the game is the last thing that happens to a run, and the run it
 * happened to is finished. Hanging the unlock off it would mean the reward for
 * completing the game is a thing you can only spend by not erasing the file
 * that proves you did — so it goes on the device, next to the outfit, the
 * receipts and the ledger, all of which outlive the slot for exactly the same
 * reason (see the note at the top of src/game/wardrobe.js).
 */
export function isHardUnlocked() {
  return !!getProfile().hardUnlocked;
}

/**
 * Write the unlock down.
 *
 * Called from two places. `run.js` calls it when the Stranger goes down, and
 * takes the return value as its cue to play the announcement. `main.js` calls
 * it during boot for anybody whose ledger already says they finished the game
 * before this mode existed — which unlocks the road AND quietly spends the
 * first-time flag, so a player who beat the game last month is not shown an
 * announcement about something they are already holding.
 *
 * @returns {Promise<boolean>} true only the FIRST time, which is what decides
 *   whether the cut-scene plays. A player who finishes the game again is not
 *   shown the announcement again — they already know.
 */
export async function unlockHardMode() {
  if (getProfile().hardUnlocked) return false;
  await updateProfile({ hardUnlocked: true });
  return true;
}
