/**
 * SHOOT! — Achievements.
 *
 * A ledger of everything the road has seen you do. It lives OUTSIDE the save
 * slots, next to the profile and the settings: a run can die and take its slot
 * with it (see `die` in src/game/run.js), and the whole point of an achievement
 * is that it survives that. It goes through the same storage driver as
 * everything else, so it migrates to an account with the rest of it.
 *
 * HOW IT IS WIRED
 * ---------------------------------------------------------------------------
 * Nearly all of it listens rather than being told. The game already announces
 * everything worth hearing on the event bus — a level, a world, a boon, a
 * storm, a totem — so most of this file is a subscription list and nothing in
 * the game had to learn that achievements exist. The handful of moments the bus
 * does not carry (a purchase, a bed, a rung of gun, the shape of a duel that
 * was just won) come in through `track`, which is the ONE function the rest of
 * the game calls.
 *
 * WHAT AN ACHIEVEMENT IS ALLOWED TO ASK FOR
 * ---------------------------------------------------------------------------
 * Every one of these is something an ordinary player will do by playing —
 * there is no "win a duel without reloading in the Galaxy on one life", and
 * nothing here needs a tool, a guide or a trick. What is NOT easy is having all
 * of them at once, and that is deliberate: the counting ones (a hundred duels,
 * ten thousand gold, every boss in the game) are several runs of honest
 * playing, and the road kills most runs long before the last horizon — the
 * balance harness puts a finished run at 3% for an average player and 15% for
 * an expert. So the list is generous per line and long as a whole.
 *
 * REWARDS
 * ---------------------------------------------------------------------------
 * Thirty of these hand over a piece of clothing:
 * `reward: { kind: 'clothing', slot, id }`, naming a garment in
 * `src/game/wardrobe.js`. THIS IS THE ONLY PLACE THE LINK IS WRITTEN DOWN. The
 * wardrobe reads the list backwards to find out what each garment is waiting
 * for, so a reward can be moved from one line to another here and nothing else
 * in the game has to be told. The rest of the list pays in bragging rights,
 * which is the right price for "lose a duel".
 *
 * The rewards are spread on purpose: no slot is filled by one category, so a
 * player who only ever duels and a player who only ever walks are both dressed
 * by the end, in visibly different clothes. Four of them are HARNESSES — tack
 * for the horse — and they are spread the same way, one apiece off the road,
 * the duels, the purse and the ladder.
 *
 * WHAT THIS LIST DELIBERATELY DOES NOT PAY OUT
 * ---------------------------------------------------------------------------
 * The clothing shop's stock. Everything marked `source: 'shop'` in the wardrobe
 * hangs on no line in here and never will: it is the half of the wardrobe that
 * is bought rather than earned, and the two must not overlap or the shop is
 * selling something the ledger might hand over for free next week. The two
 * lines below that mention the shop pay nothing at all.
 */

import { EVENTS, emit, on } from '../core/events.js';
import { read, write } from '../core/storage.js';
import { FINAL_WORLD } from './worlds.js';
import { GUN_MAX_LEVEL } from './progression.js';
import { ITEMS } from './items.js';

const KEY = 'achievements';
const STATE_VERSION = 1;

/**
 * A "mile" is a hundred source pixels of road — the same unit the victory card
 * has always shown as "Distance". A world is roughly seventy of them.
 */
const PIXELS_PER_MILE = 100;

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

/** The sections of the list, in the order the screen draws them. */
export const CATEGORIES = [
  { id: 'beginnings', name: 'Beginnings', blurb: 'The first time you do anything.' },
  { id: 'road', name: 'The Road', blurb: 'Seven worlds, and the miles between them.' },
  { id: 'duelling', name: 'Duelling', blurb: 'What happens at ten paces.' },
  { id: 'fortune', name: 'Fortune', blurb: 'Gold, guns, and everything bought with them.' },
  { id: 'survival', name: 'Survival', blurb: 'Hunger, weather, and staying upright.' },
  { id: 'bag', name: 'The Bag', blurb: 'What you carry, and what you do with it.' },
];

/**
 * Every achievement in the game.
 *
 * `id`      never changes — it is the key it is stored under.
 * `test`    optional. A predicate over the counters below, checked after every
 *           change; achievements without one are unlocked by name at the moment
 *           they happen.
 * `reward`  always null for now. See the note at the top of the file.
 */
export const ACHIEVEMENTS = [
  // --- Beginnings --------------------------------------------------------
  {
    id: 'firstRun',
    category: 'beginnings',
    name: 'Boots On',
    description: 'Start your first run.',
    reward: null,
  },
  {
    id: 'firstWin',
    category: 'beginnings',
    name: 'First Blood',
    description: 'Win your first duel.',
    reward: null,
  },
  {
    id: 'firstLoss',
    category: 'beginnings',
    name: 'Buried Boots',
    description: 'Lose a duel. It happens to everybody once.',
    reward: null,
  },
  {
    id: 'firstShop',
    category: 'beginnings',
    name: 'Window Shopping',
    description: 'Walk into a shop.',
    reward: null,
  },
  {
    id: 'firstBuy',
    category: 'beginnings',
    name: 'Paying Customer',
    description: 'Buy something over a counter.',
    reward: null,
  },
  /**
   * The clothing shop turns up once in a whole run, in a world the seed picks
   * (see src/shops/tailor.js) — so this is the one line on the list that is
   * mostly a matter of walking far enough to meet it. It pays nothing, on
   * purpose: everything behind that door is already a reward, and an
   * achievement that handed over a garment for finding the place that sells
   * garments would be paying twice.
   */
  {
    id: 'firstTailor',
    category: 'beginnings',
    name: 'Something Pressed',
    description: 'Find the clothing shop.',
    reward: null,
  },
  {
    id: 'firstInn',
    category: 'beginnings',
    name: 'A Roof For The Night',
    description: 'Take a bed at an inn.',
    reward: null,
  },
  {
    id: 'firstForge',
    category: 'beginnings',
    name: 'Sparks',
    description: 'Step inside a forge.',
    reward: null,
  },
  {
    id: 'firstUpgrade',
    category: 'beginnings',
    name: 'Tempered',
    description: 'Pay a smith to work on your revolver.',
    reward: null,
  },
  {
    id: 'firstLevel',
    category: 'beginnings',
    name: 'Growing Up',
    description: 'Reach level 2.',
    test: (p) => p.level >= 2,
    reward: null,
  },
  {
    id: 'firstBoss',
    category: 'beginnings',
    name: 'Boss Of Nothing',
    description: 'Put down your first world boss.',
    test: (p) => p.bossesBeaten >= 1,
    reward: null,
  },
  {
    id: 'named',
    category: 'beginnings',
    name: 'Known By Name',
    description: 'Give the gunslinger a name of your own.',
    reward: null,
  },
  {
    id: 'dressed',
    category: 'beginnings',
    name: 'Dressed For It',
    description: 'Wear something you earned.',
    reward: null,
  },

  // --- The Road ----------------------------------------------------------
  {
    id: 'world1',
    category: 'road',
    name: 'Dust Flats',
    description: 'Set foot on the road where every story starts.',
    test: (p) => p.worldsReached.includes(1),
    reward: null,
  },
  {
    id: 'world2',
    category: 'road',
    name: 'Wildgrass Prairie',
    description: 'Ride into world 2.',
    test: (p) => p.worldsReached.includes(2),
    reward: { kind: 'clothing', slot: 'hat', id: 'sombrero' },
  },
  {
    id: 'world3',
    category: 'road',
    name: 'Whitecrown Pass',
    description: 'Ride into world 3.',
    test: (p) => p.worldsReached.includes(3),
    reward: { kind: 'clothing', slot: 'hat', id: 'fur' },
  },
  {
    id: 'world4',
    category: 'road',
    name: 'Blackwater Bayou',
    description: 'Ride into world 4.',
    test: (p) => p.worldsReached.includes(4),
    reward: { kind: 'clothing', slot: 'boots', id: 'waders' },
  },
  {
    id: 'world5',
    category: 'road',
    name: 'Brimstone Basin',
    description: 'Ride into world 5.',
    test: (p) => p.worldsReached.includes(5),
    reward: { kind: 'clothing', slot: 'hat', id: 'horns' },
  },
  /**
   * THE SIXTH LINE MOVED, AND THE SEVENTH IS NEW
   * -------------------------------------------------------------------------
   * `world6` used to mean the Galaxy, because the Galaxy used to be world six.
   * Gallows Hollow is world six now and the Galaxy is world seven, so this line
   * is about the Hollow and `world7` below is about the Galaxy.
   *
   * The id is deliberately NOT renamed. Ids are what profiles are made of: a
   * player who unlocked `world6` on the old road keeps the tick, and what it
   * says over it changes. That is the honest trade — the alternative is
   * silently un-earning a line somebody already earned — and it costs nothing,
   * because both versions of `world6` mean the same thing in the only sense the
   * player cares about: they got past the Basin.
   */
  {
    id: 'world6',
    category: 'road',
    name: 'Gallows Hollow',
    description: 'Ride into world 6, where they stopped filling the holes in.',
    test: (p) => p.worldsReached.includes(6),
    reward: { kind: 'clothing', slot: 'hat', id: 'shroud' },
  },
  {
    id: 'world7',
    category: 'road',
    name: 'Past The Last Horizon',
    description: 'Reach the Galaxy.',
    test: (p) => p.worldsReached.includes(FINAL_WORLD),
    reward: { kind: 'clothing', slot: 'hat', id: 'starcrown' },
  },
  {
    id: 'finished',
    category: 'road',
    name: 'The Stranger Falls',
    description: 'Complete every world and finish the game.',
    test: (p) => p.gamesFinished >= 1,
    reward: { kind: 'clothing', slot: 'shirt', id: 'voidrobe' },
  },
  /**
   * THE HARD ROAD, IN THREE STEPS
   * -------------------------------------------------------------------------
   * Written as a ladder rather than as one all-or-nothing line, and the reason
   * is the same one the whole list is built on: every rung has to be something
   * an ordinary player reaches by playing. Starting a hard run is a decision;
   * getting a hard run as far as the Galaxy is a very good run that may still
   * die on the last corridor; finishing one is the largest thing anybody does
   * in this game, and it is the only line on the list that pays out five
   * garments at once.
   *
   * The first two pay in bragging rights on purpose. A player who is handed
   * clothes for merely CHOOSING hard mode has been paid for an intention.
   */
  {
    id: 'hardRoad',
    category: 'road',
    name: 'Nothing On Your Side',
    description: 'Set out on the hard road.',
    test: (p) => p.hardRuns >= 1,
    reward: null,
  },
  {
    id: 'hardGalaxy',
    category: 'road',
    name: 'The Long Way Round',
    description: 'Reach the Galaxy on the hard road.',
    test: (p) => p.hardWorlds.includes(FINAL_WORLD),
    reward: null,
  },
  /**
   * The Ember Reaver. Five pieces off one line — see `rewardPieces` in
   * src/game/wardrobe.js for why that shape exists and why it exists exactly
   * once. The outfit is the only thing in the wardrobe with live fire on it
   * (src/art/ember-aura.js), and this is the only way to get any of it.
   */
  {
    id: 'hardFinished',
    category: 'road',
    name: 'Ember Reaver',
    description: 'Finish the game on the hard road.',
    test: (p) => p.hardFinishes >= 1,
    reward: {
      kind: 'clothing',
      pieces: [
        { slot: 'hat', id: 'reaver' },
        { slot: 'shirt', id: 'reaver' },
        { slot: 'pants', id: 'reaver' },
        { slot: 'boots', id: 'reaver' },
        { slot: 'horse', id: 'reaver' },
      ],
    },
  },
  {
    id: 'allBosses',
    category: 'road',
    name: 'Six Feet Under',
    description: 'Defeat the boss of all seven worlds — across as many runs as it takes.',
    test: (p) => p.bossWorlds.length >= FINAL_WORLD,
    reward: { kind: 'clothing', slot: 'shirt', id: 'bones' },
  },
  {
    id: 'miles50',
    category: 'road',
    name: 'Stretching The Legs',
    description: 'Cover 50 miles of road.',
    test: (p) => p.miles >= 50,
    reward: { kind: 'clothing', slot: 'horse', id: 'drover' },
  },
  {
    id: 'miles250',
    category: 'road',
    name: 'Long Walk',
    description: 'Cover 250 miles of road.',
    test: (p) => p.miles >= 250,
    reward: { kind: 'clothing', slot: 'shirt', id: 'duster' },
  },
  {
    id: 'miles1000',
    category: 'road',
    name: 'Saddle Sore',
    description: 'Cover 1,000 miles of road.',
    test: (p) => p.miles >= 1000,
    reward: { kind: 'clothing', slot: 'boots', id: 'snow' },
  },
  {
    id: 'nightRider',
    category: 'road',
    name: 'Night Rider',
    description: 'Still be walking when the sun goes down.',
    reward: null,
  },
  {
    id: 'weatherEye',
    category: 'road',
    name: 'Weather Eye',
    description: 'Travel through rain, snow and a sandstorm.',
    test: (p) => ['rain', 'snow', 'sandstorm'].every((w) => p.weatherSeen.includes(w)),
    reward: { kind: 'clothing', slot: 'shirt', id: 'parka' },
  },
  {
    id: 'threeSlots',
    category: 'road',
    name: 'Three Stories',
    description: 'Start a run in each of the three save slots.',
    test: (p) => p.slotsUsed.length >= 3,
    reward: null,
  },

  // --- Duelling ----------------------------------------------------------
  {
    id: 'wins10',
    category: 'duelling',
    name: 'Ten Notches',
    description: 'Win 10 duels.',
    test: (p) => p.duelsWon >= 10,
    reward: { kind: 'clothing', slot: 'boots', id: 'spurs' },
  },
  {
    id: 'wins25',
    category: 'duelling',
    name: 'Hand Of The Road',
    description: 'Win 25 duels.',
    test: (p) => p.duelsWon >= 25,
    reward: { kind: 'clothing', slot: 'shirt', id: 'sheriffVest' },
  },
  {
    id: 'wins50',
    category: 'duelling',
    name: 'Fifty Men Down',
    description: 'Win 50 duels.',
    test: (p) => p.duelsWon >= 50,
    reward: { kind: 'clothing', slot: 'hat', id: 'sheriff' },
  },
  {
    id: 'wins100',
    category: 'duelling',
    name: 'Legend Of The Road',
    description: 'Win 100 duels.',
    test: (p) => p.duelsWon >= 100,
    reward: { kind: 'clothing', slot: 'boots', id: 'star' },
  },
  {
    id: 'bosses3',
    category: 'duelling',
    name: 'Bossed Around',
    description: 'Beat 3 world bosses.',
    test: (p) => p.bossesBeaten >= 3,
    reward: null,
  },
  {
    id: 'bosses10',
    category: 'duelling',
    name: 'Undertaker',
    description: 'Beat 10 world bosses.',
    test: (p) => p.bossesBeaten >= 10,
    reward: { kind: 'clothing', slot: 'horse', id: 'star' },
  },
  {
    id: 'flawless',
    category: 'duelling',
    name: 'Untouched',
    description: 'Win a duel without losing a single life.',
    reward: null,
  },
  {
    id: 'flawlessBoss',
    category: 'duelling',
    name: 'Not A Scratch',
    description: 'Beat a world boss without losing a single life.',
    reward: { kind: 'clothing', slot: 'shirt', id: 'ember' },
  },
  {
    id: 'quickdraw',
    category: 'duelling',
    name: 'Quickdraw',
    /**
     * Four, not three. A revolver starts empty and a rider in the Dust Flats
     * takes two hits, so reload-shoot-reload-shoot is the FLOOR of an honest
     * duel — asking for three would ask for a Traveller's Feast, which is a
     * legendary, and an achievement nobody can earn without one particular
     * item in the shop is not one this list is allowed to have. At four it
     * means what it says: both shots landed and neither was wasted on a
     * shield.
     */
    description: 'Win a duel in four rounds or fewer.',
    reward: { kind: 'clothing', slot: 'hat', id: 'bandana' },
  },
  {
    id: 'sharpshooter',
    category: 'duelling',
    name: 'Sharpshooter',
    description: 'Win a duel with every shot you fired landing.',
    reward: null,
  },
  {
    id: 'lastStand',
    category: 'duelling',
    name: 'Last Stand',
    description: 'Win a duel on your last half a life.',
    reward: { kind: 'clothing', slot: 'boots', id: 'ember' },
  },
  {
    id: 'longFight',
    category: 'duelling',
    name: 'War Of Attrition',
    description: 'Win a duel that ran fifteen rounds or longer.',
    reward: { kind: 'clothing', slot: 'pants', id: 'ash' },
  },
  {
    id: 'firstCast',
    category: 'duelling',
    name: 'Card Up The Sleeve',
    description: 'Cast an ability in a duel.',
    reward: null,
  },
  {
    id: 'castWin',
    category: 'duelling',
    name: 'Trick Shooter',
    description: 'Win a duel in which you cast two abilities.',
    reward: null,
  },
  {
    id: 'bothSlots',
    category: 'duelling',
    name: 'Both Barrels',
    description: 'Go into a fight with an ability in both hands.',
    reward: null,
  },

  // --- Fortune -----------------------------------------------------------
  {
    id: 'purse500',
    category: 'fortune',
    name: 'Full Purse',
    description: 'Hold 500 gold at once.',
    test: (p) => p.goldPeak >= 500,
    reward: { kind: 'clothing', slot: 'pants', id: 'stripe' },
  },
  {
    id: 'purse1200',
    category: 'fortune',
    name: 'Heavy Pockets',
    description: 'Hold 1,200 gold at once.',
    test: (p) => p.goldPeak >= 1200,
    reward: { kind: 'clothing', slot: 'hat', id: 'tophat' },
  },
  {
    id: 'earned2500',
    category: 'fortune',
    name: 'Working Wage',
    description: 'Earn 2,500 gold in total.',
    test: (p) => p.goldEarned >= 2500,
    reward: { kind: 'clothing', slot: 'boots', id: 'gilded' },
  },
  {
    id: 'earned10000',
    category: 'fortune',
    name: 'Gold Rush',
    description: 'Earn 10,000 gold in total.',
    test: (p) => p.goldEarned >= 10000,
    reward: { kind: 'clothing', slot: 'shirt', id: 'gambler' },
  },
  {
    id: 'bought25',
    category: 'fortune',
    name: 'Regular',
    description: 'Buy 25 things from shops.',
    test: (p) => p.itemsBought >= 25,
    reward: { kind: 'clothing', slot: 'horse', id: 'brass' },
  },
  /**
   * Bought, not earned — and it is the only line on the list that is about
   * something you keep across runs. No reward for the same reason as
   * `firstTailor`: the garment IS the reward, and it is already paid for.
   */
  {
    id: 'boughtClothes',
    category: 'fortune',
    name: 'Off The Rail',
    description: 'Buy something to wear.',
    reward: null,
  },
  {
    id: 'sold',
    category: 'fortune',
    name: 'Trader',
    description: 'Sell something back out of your bag.',
    reward: null,
  },
  {
    id: 'gun3',
    category: 'fortune',
    name: 'Ivory Hand',
    description: 'Get your revolver to the third rung of the ladder.',
    test: (p) => p.gunLevel >= 3,
    reward: null,
  },
  {
    id: 'gunMax',
    category: 'fortune',
    name: 'The Nova',
    description: 'Take a revolver all the way to the top of the ladder.',
    test: (p) => p.gunLevel >= GUN_MAX_LEVEL,
    reward: { kind: 'clothing', slot: 'pants', id: 'star' },
  },
  {
    id: 'level5',
    category: 'fortune',
    name: 'Seasoned',
    description: 'Reach level 5.',
    test: (p) => p.level >= 5,
    reward: null,
  },
  {
    id: 'level8',
    category: 'fortune',
    name: 'Hardened',
    description: 'Reach level 8.',
    test: (p) => p.level >= 8,
    reward: { kind: 'clothing', slot: 'horse', id: 'iron' },
  },

  // --- Survival ----------------------------------------------------------
  {
    id: 'hungry',
    category: 'survival',
    name: 'Empty Belly',
    description: 'Walk your hunger all the way down to nothing.',
    reward: null,
  },
  {
    id: 'starveSurvivor',
    category: 'survival',
    name: 'Running On Fumes',
    description: 'Have starvation take a life, and eat your way back out of it.',
    reward: null,
  },
  {
    id: 'patchedUp',
    category: 'survival',
    name: 'Patched Up',
    description: 'Put a bandage on in the middle of a fight.',
    reward: null,
  },
  {
    id: 'totem',
    category: 'survival',
    name: 'Dusk Falls',
    description: 'Have a Dusk Totem break instead of you.',
    reward: null,
  },
  {
    id: 'fed',
    category: 'survival',
    name: 'Never Hungry',
    description: 'Eat 25 times on the road.',
    test: (p) => p.mealsEaten >= 25,
    reward: null,
  },
  {
    id: 'rested10',
    category: 'survival',
    name: 'Well Rested',
    description: 'Sleep at an inn 10 times.',
    test: (p) => p.bedsTaken >= 10,
    reward: { kind: 'clothing', slot: 'pants', id: 'quilted' },
  },
  {
    id: 'lives8',
    category: 'survival',
    name: 'Iron Constitution',
    description: 'Walk the road with a bar of 8 lives or more.',
    test: (p) => p.maxLives >= 8,
    reward: { kind: 'clothing', slot: 'pants', id: 'iron' },
  },

  // --- The Bag -----------------------------------------------------------
  {
    id: 'horse',
    category: 'bag',
    name: 'Hoof It',
    description: 'Buy yourself a horse.',
    reward: { kind: 'clothing', slot: 'pants', id: 'chaps' },
  },
  {
    id: 'legendary',
    category: 'bag',
    name: 'One Of A Kind',
    description: 'Get a legendary item into your bag.',
    reward: null,
  },
  {
    id: 'feast',
    category: 'bag',
    name: "Traveller's Feast",
    description: 'Sit down to a meal that stays with you for the next few fights.',
    reward: null,
  },
  {
    id: 'mapRead',
    category: 'bag',
    name: 'Cartographer',
    description: 'Open the trail map and read the road ahead.',
    reward: null,
  },
  {
    id: 'wellStocked',
    category: 'bag',
    name: 'Well Stocked',
    description: 'Carry six different things at once.',
    reward: null,
  },
  {
    id: 'kitted',
    category: 'bag',
    name: 'Kitted Out',
    description: 'Own the vest, the canteen and the diadem at the same time.',
    reward: null,
  },
];

/** Fast lookup, and the guard that catches a typo in a `track` call. */
const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Counters the threshold achievements read.
 *
 * These are LIFETIME numbers on this device and they are not the same thing as
 * the profile's lifetime record — that one exists to be shown on a card, this
 * one exists to be tested against, and the two are allowed to drift apart the
 * day one of them is reset.
 */
function blankProgress() {
  return {
    runs: 0,
    duelsWon: 0,
    duelsLost: 0,
    bossesBeaten: 0,
    itemsBought: 0,
    mealsEaten: 0,
    bedsTaken: 0,
    goldEarned: 0,
    goldPeak: 0,
    miles: 0,
    level: 1,
    maxLives: 3,
    gunLevel: 0,
    gamesFinished: 0,
    /**
     * The hard road, counted separately from everything above it. A hard run
     * is a run and a hard clear is a clear, so those counters move too — these
     * three are the ones the hard-road lines test against, and they exist
     * because "did this happen on the hard road" is not recoverable from a
     * total after the fact.
     */
    hardRuns: 0,
    hardFinishes: 0,
    /** Sets, stored as arrays because JSON has no set. */
    worldsReached: [],
    /** Worlds reached on the hard road, kept apart from `worldsReached`. */
    hardWorlds: [],
    bossWorlds: [],
    weatherSeen: [],
    slotsUsed: [],
  };
}

let state = {
  version: STATE_VERSION,
  unlocked: {},
  progress: blankProgress(),
};

let loaded = false;
let saveTimer = null;

/**
 * Read the ledger off the device. Called once, during boot, before any screen
 * can ask for it.
 */
export async function loadAchievements() {
  const stored = await read(KEY);
  state = {
    version: STATE_VERSION,
    unlocked: { ...(stored?.unlocked || {}) },
    progress: { ...blankProgress(), ...(stored?.progress || {}) },
  };
  // Sets that arrived from an older file as anything but an array are dropped
  // rather than trusted — every reader below calls `.includes` on them.
  for (const key of ['worldsReached', 'hardWorlds', 'bossWorlds', 'weatherSeen', 'slotsUsed']) {
    if (!Array.isArray(state.progress[key])) state.progress[key] = [];
  }
  loaded = true;
  return state;
}

/**
 * Write it back.
 *
 * Debounced, because the road moves the distance counter every frame and a
 * localStorage write per frame is a stutter you can see. An unlock always
 * flushes immediately — that is the one thing that must be on the device
 * before the player can close the tab in celebration.
 */
function persist({ now = false } = {}) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (now) return write(KEY, state);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    write(KEY, state);
  }, 1200);
  return Promise.resolve();
}

/** Everything the menu screen needs, in one call. */
export function getAchievementState() {
  const list = ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: !!state.unlocked[def.id],
    at: state.unlocked[def.id] || 0,
  }));
  const unlockedCount = list.filter((a) => a.unlocked).length;
  return {
    list,
    unlockedCount,
    total: TOTAL_ACHIEVEMENTS,
    /** Rounded down, so 99% never means "all of them". */
    percent: TOTAL_ACHIEVEMENTS ? Math.floor((unlockedCount / TOTAL_ACHIEVEMENTS) * 100) : 0,
    progress: { ...state.progress },
  };
}

export function isUnlocked(id) {
  return !!state.unlocked[id];
}

/**
 * Award one. Silent and harmless if it was already held — every caller below
 * fires far more often than the achievement can be earned, on purpose: it is
 * cheaper to ask every time than to make each caller remember.
 */
export function unlock(id) {
  const def = BY_ID.get(id);
  if (!def) {
    console.warn(`[achievements] unknown achievement "${id}"`);
    return false;
  }
  if (state.unlocked[id]) return false;
  state.unlocked[id] = Date.now();
  persist({ now: true });
  const { unlockedCount, percent } = getAchievementState();
  emit(EVENTS.ACHIEVEMENT_UNLOCKED, {
    achievement: def,
    unlockedCount,
    total: TOTAL_ACHIEVEMENTS,
    percent,
  });
  return true;
}

/** Run every threshold test. Cheap — sixty predicates over a flat object. */
function evaluate() {
  for (const def of ACHIEVEMENTS) {
    if (!def.test || state.unlocked[def.id]) continue;
    let met = false;
    try {
      met = !!def.test(state.progress);
    } catch (err) {
      console.error(`[achievements] test for "${def.id}" threw`, err);
    }
    if (met) unlock(def.id);
  }
}

/** Counters only ever go up. */
function bump(key, amount = 1) {
  if (!loaded) return;
  state.progress[key] = (state.progress[key] || 0) + amount;
  after();
}

/** High-water marks — a level, a bar, a purse at its fullest. */
function raise(key, value) {
  if (!loaded) return;
  if (!(value > (state.progress[key] || 0))) return;
  state.progress[key] = value;
  after();
}

/** Add to one of the array-backed sets. */
function include(key, value) {
  if (!loaded || value == null) return;
  const set = state.progress[key];
  if (set.includes(value)) return;
  set.push(value);
  after();
}

function after() {
  evaluate();
  persist();
}

// ---------------------------------------------------------------------------
// The hook the rest of the game calls
// ---------------------------------------------------------------------------

/**
 * Tell the ledger something happened that the event bus does not carry.
 *
 * One function and a string, so a screen that wants to report a purchase does
 * not have to import half of this file — and so an achievement can be retuned
 * (or dropped) without going back around the game to find its call site.
 *
 * @param {string} what
 * @param {object} [detail]
 */
export function track(what, detail = {}) {
  if (!loaded) return;
  switch (what) {
    // --- the run ---------------------------------------------------------
    case 'runStarted':
      beginRun(0);
      bump('runs');
      include('slotsUsed', detail.slot);
      if (detail.difficulty === 'hard') bump('hardRuns');
      unlock('firstRun');
      break;

    /**
     * A slot picked back up. It counts as no achievement of its own — it is
     * here so the run-scoped state starts from where the run actually is
     * rather than from nothing. See `beginRun`.
     */
    case 'runResumed':
      beginRun(detail.distance);
      break;

    case 'gameFinished':
      bump('gamesFinished');
      // …and the hard road's own count, which is what the Ember Reaver hangs
      // on. A hard clear counts as both, because it is both.
      if (detail.difficulty === 'hard') bump('hardFinishes');
      break;

    // --- shops, inns, forges --------------------------------------------
    case 'itemBought':
      bump('itemsBought');
      unlock('firstBuy');
      break;

    /**
     * A garment over a counter. It is NOT counted as an item bought: the
     * "Regular" line is about the road's shops, and a clothing shop that
     * appears once a run cannot be a quarter of a twenty-five purchase count.
     */
    case 'clothingBought':
      unlock('boughtClothes');
      break;

    case 'itemSold':
      unlock('sold');
      break;

    case 'bedTaken':
      bump('bedsTaken');
      unlock('firstInn');
      break;

    case 'gunUpgraded':
      raise('gunLevel', detail.level ?? 0);
      unlock('firstUpgrade');
      break;

    case 'mapOpened':
      unlock('mapRead');
      break;

    /**
     * Reported by the wardrobe when an outfit is saved, and only when it is
     * something other than the clothes everybody starts in — putting the trail
     * hat back on is not getting dressed.
     */
    case 'outfitSaved':
      if (detail.dressedUp) unlock('dressed');
      break;

    case 'totemBroken':
      unlock('totem');
      break;

    // --- duels -----------------------------------------------------------
    case 'abilityCast':
      unlock('firstCast');
      break;

    case 'abilitiesEquipped':
      if (detail.count >= 2) unlock('bothSlots');
      break;

    case 'bandageInDuel':
      unlock('patchedUp');
      break;

    /**
     * The shape of a fight that just ended, reported once by the duel screen.
     * Everything the combat achievements ask about is in here, because the
     * screen is the only place that knows all of it at once — the engine's
     * round log, the bar it walked in with and the bar it walked out on.
     */
    case 'duelEnded':
      recordDuel(detail);
      break;

    default:
      console.warn(`[achievements] unknown track("${what}")`);
  }
}

function recordDuel(d) {
  if (!d.won) {
    bump('duelsLost');
    unlock('firstLoss');
    return;
  }

  bump('duelsWon');
  unlock('firstWin');

  if (d.isBoss) {
    bump('bossesBeaten');
    include('bossWorlds', d.worldId);
    if (!d.tookDamage) unlock('flawlessBoss');
  }

  if (!d.tookDamage) unlock('flawless');
  if (d.rounds > 0 && d.rounds <= 4) unlock('quickdraw');
  if (d.rounds >= 15) unlock('longFight');
  /**
   * Every shot pulled had to land: none blocked by a shield, and none thrown
   * wide by a blind. Two of them at least, so a duel decided by a single lucky
   * round does not hand it over.
   */
  if (d.shotsFired >= 2 && d.shotsWide === 0 && d.shotsLanded >= d.shotsFired) {
    unlock('sharpshooter');
  }
  if (d.livesLeft > 0 && d.livesLeft <= 0.5) unlock('lastStand');
  if (d.abilitiesCast >= 2) unlock('castWin');
}

// ---------------------------------------------------------------------------
// Everything the bus already says
// ---------------------------------------------------------------------------

let wired = false;

/**
 * WHAT THE LEDGER KNOWS ABOUT THE RUN IN PROGRESS, AND ONLY THAT RUN
 * ---------------------------------------------------------------------------
 * Two pieces of state here are about the run rather than about the device, and
 * both of them were wrong across the seam between one run and the next until
 * `beginRun` existed to wipe them.
 *
 * `starved` is armed by a starvation tick and collected by the next meal. A
 * tick that KILLS the run leaves it armed with nobody left to feed — so the
 * first apple of the following run used to collect an achievement earned by a
 * corpse. The condition is one run's worth of nearly dying and eating your way
 * back out of it, so it cannot be allowed to outlive the run.
 *
 * `lastDistance` is the mark the road's next total is measured against, and it
 * has to start where the run starts: at zero for a new one, and at whatever
 * was already walked for a loaded one.
 */
let starved = false;
let lastDistance = 0;

/**
 * A run just began — either fresh, or picked back up off a slot.
 * @param {number} distance how far this run has already come
 */
function beginRun(distance = 0) {
  starved = false;
  lastDistance = Math.max(0, Number(distance) || 0);
}

/**
 * Subscribe to the game. Called once at boot, after `loadAchievements`.
 *
 * Nothing here reaches into another system: it reads the payloads the game was
 * already publishing for the HUD.
 */
export function initAchievements() {
  if (wired) return;
  wired = true;

  // --- the road --------------------------------------------------------
  on(EVENTS.WORLD_CHANGED, ({ world, difficulty }) => {
    include('worldsReached', world);
    if (difficulty === 'hard') include('hardWorlds', world);
  });

  on(EVENTS.GAME_COMPLETED, ({ difficulty } = {}) => {
    track('gameFinished', { difficulty });
  });

  on(EVENTS.ENCOUNTER_REACHED, ({ type }) => {
    if (type === 'shop') unlock('firstShop');
    else if (type === 'forge') unlock('firstForge');
    else if (type === 'tailor') unlock('firstTailor');
  });

  /**
   * Distance arrives as the RUN's total, several times a second, so the
   * lifetime figure is built out of the differences against `lastDistance`.
   *
   * WHICH IS WHY A RESUMED RUN HAS TO SET THE MARK FIRST
   * ---------------------------------------------------------------------
   * A loaded save comes back mid-road with thousands of pixels already on it,
   * and against a mark of zero the first step of the walk reads as the entire
   * saved journey travelled again. Every mileage line in the list could be
   * unlocked by loading the same run four times — so `runResumed` puts the
   * mark where the run actually is before a step is taken (see `beginRun`).
   *
   * The guard below is the other direction and stays: a total that went DOWN
   * is a road that started over, because the road only ever goes one way.
   */
  on(EVENTS.DISTANCE_CHANGED, ({ distance }) => {
    if (distance < lastDistance) lastDistance = 0;
    const delta = distance - lastDistance;
    lastDistance = distance;
    if (delta > 0) bump('miles', delta / PIXELS_PER_MILE);
  });

  on(EVENTS.TIME_OF_DAY_CHANGED, ({ phase }) => {
    if (phase === 'night') unlock('nightRider');
  });

  on(EVENTS.WEATHER_CHANGED, ({ id }) => {
    if (id && id !== 'clear' && id !== 'cloudy') include('weatherSeen', id);
  });

  // --- the player ------------------------------------------------------
  on(EVENTS.LEVEL_UP, ({ level, maxLives }) => {
    raise('level', level);
    raise('maxLives', maxLives);
  });

  on(EVENTS.LIVES_CHANGED, ({ maxLives }) => {
    raise('maxLives', maxLives);
  });

  on(EVENTS.GOLD_CHANGED, ({ gold, delta }) => {
    raise('goldPeak', gold);
    if (delta > 0) bump('goldEarned', delta);
  });

  on(EVENTS.HORSE_ACQUIRED, () => {
    unlock('horse');
  });

  on(EVENTS.BOON_CHANGED, ({ boon }) => {
    if (boon) unlock('feast');
  });

  on(EVENTS.INVENTORY_CHANGED, ({ inventory }) => {
    inspectBag(inventory);
  });

  on(EVENTS.ITEM_USED, ({ effect }) => {
    if (effect === 'food') bump('mealsEaten');
    // Eating on an empty gauge after starvation had already bitten is the
    // whole of "Running On Fumes": the tick is what arms it, the meal is what
    // collects it, and both have to be the same run.
    if (effect === 'food' && starved) {
      starved = false;
      unlock('starveSurvivor');
    }
  });

  // --- survival --------------------------------------------------------
  on(EVENTS.HUNGER_EMPTY, () => {
    unlock('hungry');
  });

  on(EVENTS.STARVATION_TICK, () => {
    starved = true;
  });

  // The totem is not listened for: TOTEM_TRIGGERED is the road's half of it
  // only, and a totem that breaks in a duel never fires it. `breakTotem` in
  // src/game/player.js is where both roads meet, so that is where it reports
  // from — through `track('totemBroken')`.
}

/**
 * Read the bag on every change. Three achievements live in here and all of them
 * are about what is being CARRIED rather than what was bought, so the bag is
 * the only honest place to ask.
 */
function inspectBag(inventory) {
  if (!Array.isArray(inventory)) return;
  const ids = inventory.filter((e) => e.qty > 0).map((e) => e.id);
  if (ids.length >= 6) unlock('wellStocked');
  if (['vest', 'canteen', 'diadem'].every((id) => ids.includes(id))) unlock('kitted');
  if (ids.some(isLegendary)) unlock('legendary');
}

/**
 * Which ids are legendary, asked of the catalogue rather than listed here —
 * an item promoted to legendary next month should count the day it is, without
 * anybody remembering this file exists.
 */
let legendaryIds = null;
function isLegendary(id) {
  if (!legendaryIds) {
    legendaryIds = new Set(
      Object.entries(ITEMS)
        .filter(([, item]) => item && item.rarity === 'legendary')
        .map(([key]) => key),
    );
  }
  return legendaryIds.has(id);
}
