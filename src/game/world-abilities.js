/**
 * SHOOT! — World abilities.
 *
 * Every trick anybody can pull in a duel, and the one landmark each world can
 * put on the road behind it.
 *
 * WHY A DUEL ABILITY IS NOW A PLACE AS WELL AS A RULE
 * ---------------------------------------------------------------------------
 * The game had four abilities — bullet steal, poison, dynamite, mind control —
 * and every enemy in every world drew from the same four. That is one rule set
 * wearing six skins: a drifter in the Dust Flats and a horned thing in
 * Brimstone Basin poisoned you with the same green icon and the same nothing on
 * screen, so the worlds were only ever different to look at while you were
 * walking, and identical the moment anybody drew.
 *
 * So an ability is split in two here:
 *
 *   BASE     what it does to the duel. Still exactly four things, still
 *            resolved by src/duel/duel-engine.js, still balanced by the
 *            per-world numbers in src/game/worlds.js.
 *   THEME    what it *is*: its name, its icon, the colour and the motion of
 *            the thing that crosses the screen when it goes off, and the word
 *            the fight shouts.
 *
 * The bayou does not have poison, it has swamp rot, and swamp rot comes up out
 * of the ground as green gas. Brimstone Basin does not have poison either, it
 * has an ember that went in under your collar and is still burning. They cost
 * the same life three rounds later, and nothing about the fight is the same.
 *
 * Adding a themed ability is one entry in ABILITIES, one icon in
 * src/art/sprites-abilities.js, and its id in that world's list in
 * src/game/worlds.js. No engine change: the engine reads `base`.
 *
 * THE SPECIAL IS NOT A BIGGER ABILITY. IT IS THE MAP CHANGING.
 * ---------------------------------------------------------------------------
 * Each world also has ONE special, and it works nothing like the four above.
 * An enemy carrying it can spend it once, at any point in the duel — usually
 * early, because it is worth more the longer it is out — and it does not
 * resolve and finish. It raises something behind the road, and that thing is
 * there for the rest of the fight, on a clock of its own:
 *
 *   dormant  ~20 seconds. It is drawn, it is quiet, and you fight normally.
 *   warning  the sky goes the colour of what is about to happen.
 *   active   it throws. Rocks, hornets, snow, gas — a handful of strikes
 *            spread across the window, each one taking a life.
 *   dormant  and round it goes, for as long as the duel lasts.
 *
 * That clock is REAL TIME, not rounds, which is the whole point of it: the
 * duel is a game of unhurried decisions and a volcano does not wait for you to
 * pick one. See src/duel/duel-hazard.js for the clock and
 * src/duel/duel-scene.js for what it looks like.
 *
 * A special is deliberately expensive to be hit by — three lives is most of a
 * young run — so it is rolled per enemy from `specialChance` in
 * src/game/worlds.js rather than carried by everybody, and every boss has one.
 * If it ever wants to be gentler, `damage` and `strikes` below are the two
 * numbers to move; nothing else in the game reads them.
 *
 * AND THE PLAYER CAN BUY BOTH
 * ---------------------------------------------------------------------------
 * Every ability in here is sold, in the world it belongs to, as a piece of
 * equipment you keep for the rest of the run (src/game/items.js builds the shop
 * entries from this file). What the player buys is not a copy to throw — it is
 * a thing that CHARGES: one point a round, and when it is full you spend it.
 *
 * The enemy's version and the player's version are the same effect and are
 * tuned differently on purpose, because the two sides are not symmetrical:
 *
 *   the enemy  rolls its abilities at random and cannot choose a moment, so
 *              they are cheap, frequent and individually small
 *   the player picks the moment exactly, so the same effect has to be rationed
 *              by a charge bar — and the moment is most of its value
 *
 * The player-side numbers are `PLAYER_BASIC` and `PLAYER_SPECIAL` at the
 * bottom of this file, along with the reasoning and the figures they were
 * balanced against. They are the only place player power is written down.
 */

import { PALETTE } from '../art/palette.js';

/**
 * The four things an ability can actually DO. The engine switches on these and
 * on nothing else; every id below names one of them in `base`.
 */
export const BASE_EFFECTS = ['bulletSteal', 'poison', 'dynamite', 'mindControl'];

/**
 * How a themed ability crosses the screen. `motion` picks one of six particle
 * behaviours drawn by src/duel/duel-scene.js:
 *
 *   streak  flies across the road from the caster to the target
 *   swarm   converges on the target from all sides, wandering
 *   fall    comes down on the target out of the sky
 *   rise    comes up out of the ground under the target
 *   burst   blows outward from the target
 *   spiral  winds into the target's head
 */
const fx = (motion, colors, extra = {}) => ({ motion, colors, count: 26, ...extra });

/**
 * Every ability in the game, themed and otherwise.
 *
 * The first four are the originals. They are still here because the player's
 * own dynamite and poison come out of the saddlebag under those names, and
 * because a themed id is only ever a *label* on one of them — anything that
 * cannot find a theme falls back to the base and still works.
 */
export const ABILITIES = {
  // --- the four base effects, unthemed -------------------------------------
  bulletSteal: {
    base: 'bulletSteal',
    label: 'Bullet Steal',
    tip: 'They can take one of your bullets',
    icon: 'bulletSteal',
    banner: 'ROUND TAKEN!',
    fx: fx('streak', [PALETTE.goldLight, PALETTE.gold, PALETTE.goldDark]),
  },
  poison: {
    base: 'poison',
    label: 'Poison',
    tip: 'Poison costs you a life three rounds later',
    icon: 'poison',
    banner: 'POISONED!',
    fx: fx('rise', [PALETTE.poison, PALETTE.poisonDark, PALETTE.greenLight]),
  },
  dynamite: {
    base: 'dynamite',
    label: 'Dynamite',
    tip: 'Dynamite ignores your shield',
    icon: 'dynamite',
    banner: 'DYNAMITE!',
    fx: fx('burst', [PALETTE.goldLight, PALETTE.red, PALETTE.grey], { shake: 320 }),
  },
  mindControl: {
    base: 'mindControl',
    label: 'Mind Control',
    tip: 'They can scramble your chosen move',
    icon: 'mindControl',
    banner: 'MIND CONTROL!',
    fx: fx('spiral', [PALETTE.purple, PALETTE.purpleDark, PALETTE.white]),
  },

  // --- 1 · Dust Flats -------------------------------------------------------
  /** The wind does the stealing out here, and it takes it off your belt. */
  dustSnatch: {
    base: 'bulletSteal',
    world: 1,
    label: 'Dust Snatch',
    tip: 'A gust off the flats takes a round from your belt',
    icon: 'dustSnatch',
    banner: 'DUST SNATCH!',
    fx: fx('streak', [PALETTE.sandLight, PALETTE.sand, PALETTE.sandDark], { count: 34 }),
  },

  // --- 2 · Wildgrass Prairie ------------------------------------------------
  lassoPull: {
    base: 'bulletSteal',
    world: 2,
    label: 'Lasso Pull',
    tip: 'A rope out of the grass whips a round out of your hand',
    icon: 'lassoPull',
    banner: 'ROPED!',
    fx: fx('streak', [PALETTE.boneDark, PALETTE.bone, PALETTE.woodDark], { count: 22 }),
  },
  hornetSting: {
    base: 'poison',
    world: 2,
    label: 'Hornet Sting',
    tip: 'Prairie hornets — the sting costs you a life three rounds later',
    icon: 'hornetSting',
    banner: 'STUNG!',
    fx: fx('swarm', [PALETTE.gold, PALETTE.ink, PALETTE.goldLight], { count: 30 }),
  },

  // --- 3 · Whitecrown Pass --------------------------------------------------
  coldGrip: {
    base: 'bulletSteal',
    world: 3,
    label: 'Cold Grip',
    tip: 'Your cylinder freezes and gives a round up',
    icon: 'coldGrip',
    banner: 'FROZEN SOLID!',
    fx: fx('streak', [PALETTE.iceLight, PALETTE.ice, PALETTE.snowMid]),
  },
  frostbite: {
    base: 'poison',
    world: 3,
    label: 'Frostbite',
    tip: 'The cold gets into you — a life three rounds later',
    icon: 'frostbite',
    banner: 'FROSTBITE!',
    fx: fx('swarm', [PALETTE.snowLight, PALETTE.iceLight, PALETTE.snowShade], { count: 34 }),
  },
  iceFall: {
    base: 'dynamite',
    world: 3,
    label: 'Ice Fall',
    tip: 'A slab comes off the crag. A shield is no use under it',
    icon: 'iceFall',
    banner: 'ICE FALL!',
    fx: fx('fall', [PALETTE.snowLight, PALETTE.snowMid, PALETTE.iceLight], { shake: 340 }),
  },

  // --- 4 · Blackwater Bayou -------------------------------------------------
  mireGrasp: {
    base: 'bulletSteal',
    world: 4,
    label: 'Mire Grasp',
    tip: 'Something under the water takes a round off you',
    icon: 'mireGrasp',
    banner: 'DRAGGED UNDER!',
    fx: fx('rise', [PALETTE.bogLight, PALETTE.bogDark, PALETTE.algae]),
  },
  swampRot: {
    base: 'poison',
    world: 4,
    label: 'Swamp Rot',
    tip: 'Black water in the lungs — a life three rounds later',
    icon: 'swampRot',
    banner: 'ROTTING!',
    fx: fx('rise', [PALETTE.algae, PALETTE.bog, PALETTE.lichen], { count: 32 }),
  },
  gasBurst: {
    base: 'dynamite',
    world: 4,
    label: 'Gas Burst',
    tip: 'A pocket of marsh gas goes up. A shield is no use over it',
    icon: 'gasBurst',
    banner: 'GAS BURST!',
    fx: fx('burst', [PALETTE.algae, PALETTE.lichen, PALETTE.bogLight], { shake: 320 }),
  },
  willOWisp: {
    base: 'mindControl',
    world: 4,
    label: "Will-o'-Wisp",
    tip: 'A light on the water leads your hand somewhere else',
    icon: 'willOWisp',
    banner: 'LED ASTRAY!',
    fx: fx('spiral', [PALETTE.algae, PALETTE.bogLight, PALETTE.white]),
  },

  // --- 5 · Brimstone Basin --------------------------------------------------
  cinderSnatch: {
    base: 'bulletSteal',
    world: 5,
    label: 'Cinder Snatch',
    tip: 'A round is pulled out of your gun and it is glowing',
    icon: 'cinderSnatch',
    banner: 'CINDER SNATCH!',
    fx: fx('streak', [PALETTE.emberGlow, PALETTE.magma, PALETTE.magmaDeep]),
  },
  emberBite: {
    base: 'poison',
    world: 5,
    label: 'Ember Bite',
    tip: 'An ember under your collar — a life three rounds later',
    icon: 'emberBite',
    banner: 'BURNING!',
    fx: fx('rise', [PALETTE.magma, PALETTE.emberGlow, PALETTE.magmaDeep], { count: 32 }),
  },
  magmaSpout: {
    base: 'dynamite',
    world: 5,
    label: 'Magma Spout',
    tip: 'The ground opens under your boots. A shield is no use over it',
    icon: 'magmaSpout',
    banner: 'MAGMA SPOUT!',
    fx: fx('rise', [PALETTE.emberGlow, PALETTE.magma, PALETTE.magmaDeep], {
      count: 40,
      shake: 360,
    }),
  },
  hellWhisper: {
    base: 'mindControl',
    world: 5,
    label: 'Hell Whisper',
    tip: 'Something says your name and your hand answers it',
    icon: 'hellWhisper',
    banner: 'WHISPERED TO!',
    fx: fx('spiral', [PALETTE.magma, PALETTE.charDark, PALETTE.sulfurLight]),
  },

  // --- 6 · Galaxy -----------------------------------------------------------
  gravityPull: {
    base: 'bulletSteal',
    world: 6,
    label: 'Gravity Pull',
    tip: 'A round leaves your cylinder and does not fall',
    icon: 'gravityPull',
    banner: 'PULLED!',
    fx: fx('streak', [PALETTE.astralLight, PALETTE.astral, PALETTE.purple]),
  },
  starRot: {
    base: 'poison',
    world: 6,
    label: 'Star Rot',
    tip: 'Something out here is inside you — a life three rounds later',
    icon: 'starRot',
    banner: 'STAR ROT!',
    fx: fx('swarm', [PALETTE.astral, PALETTE.purple, PALETTE.astralLight], { count: 30 }),
  },
  meteorStrike: {
    base: 'dynamite',
    world: 6,
    label: 'Meteor Strike',
    tip: 'A rock arrives out of nothing. A shield is no use under it',
    icon: 'meteorStrike',
    banner: 'METEOR!',
    fx: fx('fall', [PALETTE.astralLight, PALETTE.purple, PALETTE.white], { shake: 380 }),
  },
  mindRift: {
    base: 'mindControl',
    world: 6,
    label: 'Mind Rift',
    tip: 'The space between your thought and your hand comes apart',
    icon: 'mindRift',
    banner: 'RIFTED!',
    fx: fx('spiral', [PALETTE.purple, PALETTE.astralLight, PALETTE.cosmic]),
  },
};

/**
 * The six specials, one per world.
 *
 * Every one of them is the same machine with different weather: a landmark
 * drawn behind the road, a dormant stretch, a warning, and a window in which it
 * throws `strikes` things at the player for `damage` each. What separates them
 * is the art, the colour the sky goes, and the two extras below — `steal`
 * (rounds knocked out of the cylinder) and `poisons` — which exist so the six
 * are not the same three lives in six colours.
 *
 *   cycleMs   quiet time between the end of one eruption and the next warning
 *   warnMs    the sky changing, before anything is thrown
 *   activeMs  the window the strikes are spread across
 *   strikes   how many of them land on the player
 *   damage    lives per strike — so a volcano costs `strikes * damage` a cycle
 *
 * The volcano is the reference implementation and the numbers it was specified
 * with: twenty seconds quiet, then rocks, and three lives across the eruption.
 */
export const SPECIALS = {
  /** 1 · a twister standing off the flats, which strips the road when it comes. */
  duststorm: {
    id: 'duststorm',
    world: 1,
    label: 'Dust Devil',
    icon: 'duststorm',
    tip: 'Raises a twister for the rest of the duel. It sweeps the road every 22 seconds',
    banner: 'DUST DEVIL!',
    art: 'duststorm',
    /** The word the fight shouts when the sky turns and it comes in. */
    warnBanner: 'IT IS COMING',
    /** What it throws, and in what colours. See `stepHazard` in duel-scene.js. */
    motif: 'mote',
    debris: [PALETTE.sandLight, PALETTE.sand, PALETTE.sandDark],
    sky: { color: '#c2914d', alpha: 0.42 },
    cycleMs: 22000,
    warnMs: 2200,
    activeMs: 6000,
    strikes: 2,
    damage: 1,
    /** It does not only hit you: it empties the gun you were about to use. */
    steal: 1,
    sfx: 'wind',
  },

  /** 2 · the nest in the dead cottonwood. Everything in it comes out at once. */
  hornetTree: {
    id: 'hornetTree',
    world: 2,
    label: 'Hornet Tree',
    icon: 'hornetTree',
    tip: 'Wakes a hornet tree for the rest of the duel. The swarm comes out every 20 seconds',
    banner: 'HORNET TREE!',
    warnBanner: 'THE NEST IS AWAKE',
    art: 'hornetTree',
    motif: 'hornet',
    debris: [PALETTE.gold, PALETTE.ink, PALETTE.goldLight],
    sky: { color: '#d9c34b', alpha: 0.36 },
    cycleMs: 20000,
    warnMs: 2000,
    activeMs: 6500,
    strikes: 2,
    damage: 1,
    /** What is left in you after the swarm has gone. */
    poisons: true,
    sfx: 'wind',
  },

  /** 3 · the cornice over the pass. It comes off, and it comes off again. */
  cornice: {
    id: 'cornice',
    world: 3,
    label: 'Hanging Cornice',
    icon: 'cornice',
    tip: 'Cuts a cornice loose above the pass. It breaks every 22 seconds',
    banner: 'CORNICE!',
    warnBanner: 'THE SNOW IS MOVING',
    art: 'cornice',
    motif: 'flake',
    debris: [PALETTE.snowLight, PALETTE.snow, PALETTE.snowShade],
    sky: { color: '#9cb4d2', alpha: 0.5 },
    cycleMs: 22000,
    warnMs: 2400,
    activeMs: 5500,
    strikes: 2,
    damage: 1,
    sfx: 'rumble',
  },

  /** 4 · the drowned cypress, and what the bog keeps under it. */
  blackdamp: {
    id: 'blackdamp',
    world: 4,
    label: 'Blackdamp',
    icon: 'blackdamp',
    tip: 'Opens a gas vent for the rest of the duel. The bog breathes out every 20 seconds',
    banner: 'BLACKDAMP!',
    warnBanner: 'THE WATER IS BUBBLING',
    art: 'blackdamp',
    motif: 'gas',
    debris: [PALETTE.algae, PALETTE.lichen, PALETTE.bogLight],
    sky: { color: '#4e8a3a', alpha: 0.44 },
    cycleMs: 20000,
    warnMs: 2200,
    activeMs: 7000,
    strikes: 2,
    damage: 1,
    poisons: true,
    sfx: 'wind',
  },

  /**
   * 5 · THE VOLCANO.
   *
   * The one every other special was generalised out of. It stands on the
   * horizon from the moment it is called and does nothing at all; every twenty
   * seconds the sky goes red, the cone lights, and it throws rock across the
   * road — three of which find you, for a life each — and then it goes quiet
   * and starts counting again. What it leaves behind stays: the lava that came
   * down with the rock is still on the road at the end of the fight.
   */
  volcano: {
    id: 'volcano',
    world: 5,
    label: 'Volcano',
    icon: 'volcano',
    tip: 'Raises a volcano behind the road. It erupts every 20 seconds for the rest of the duel',
    banner: 'VOLCANO!',
    warnBanner: 'THE SKY IS RED',
    art: 'volcano',
    motif: 'rock',
    debris: [PALETTE.char, PALETTE.magma, PALETTE.emberGlow],
    sky: { color: '#c2451c', alpha: 0.52 },
    cycleMs: 20000,
    warnMs: 2400,
    activeMs: 8000,
    strikes: 3,
    damage: 1,
    /** Rock that lands stays lit on the road. See `drawHazardGround`. */
    lava: true,
    sfx: 'rumble',
  },

  /** 6 · a tear in the middle distance that keeps pulling things through it. */
  rift: {
    id: 'rift',
    world: 6,
    label: 'The Rift',
    icon: 'rift',
    tip: 'Tears the sky open for the rest of the duel. It empties every 18 seconds',
    banner: 'THE RIFT!',
    warnBanner: 'IT IS OPENING',
    art: 'rift',
    motif: 'shard',
    debris: [PALETTE.astralLight, PALETTE.astral, PALETTE.purple],
    sky: { color: '#4c2f80', alpha: 0.55 },
    cycleMs: 18000,
    warnMs: 2000,
    activeMs: 7000,
    strikes: 3,
    damage: 1,
    steal: 1,
    sfx: 'rumble',
  },
};

/**
 * WHEN THE ENEMY SPENDS IT
 * ---------------------------------------------------------------------------
 * A special is worth the whole duel if it is out early and almost nothing if
 * it is out on the last round, and an opponent that understood that would open
 * with it every single time — which would make it furniture rather than a
 * surprise. So it is a roll, weighted hard towards the opening: about four
 * fights in five see it inside the first five rounds, and the rest of the time
 * it lands whenever it lands.
 */
export const SPECIAL_TIMING = {
  /** Rounds counted as "the start of the fight". */
  earlyRounds: 5,
  /** Chance per round during those. */
  earlyChance: 0.3,
  /** Chance per round afterwards. */
  lateChance: 0.07,
};

/**
 * Look an ability up by id. Never null: an id with no entry is treated as a
 * base effect of its own name, which is what keeps a half-finished theme from
 * taking the duel down with it.
 */
export function getAbility(id) {
  const entry = ABILITIES[id];
  if (entry) return { id, ...entry };
  return {
    id,
    base: BASE_EFFECTS.includes(id) ? id : null,
    label: id,
    tip: '',
    icon: id,
    banner: null,
    fx: null,
  };
}

/** What an ability id actually does to the duel. */
export function baseEffectOf(id) {
  return getAbility(id).base;
}

/** Look a special up by id. Null when there is none. */
export function getSpecial(id) {
  return id ? SPECIALS[id] || null : null;
}

/** Every special's total cost per eruption, for tooltips and the fight card. */
export function specialDamage(spec) {
  return spec ? spec.strikes * spec.damage : 0;
}

// ---------------------------------------------------------------------------
// The player's half
// ---------------------------------------------------------------------------

/**
 * WHAT AN ABILITY IS WORTH, AND WHAT IT COSTS
 * ---------------------------------------------------------------------------
 * The numbers below were set against the four figures that actually constrain
 * them, measured off src/game/worlds.js and src/game/progression.js:
 *
 *   world | avg enemy lives | boss lives | gold a world pays | rare / legendary
 *      1  |      1.2        |     3      |       287         |   130 /   260
 *      3  |      1.7        |     4      |     1,010         |   355 /   710
 *      5  |      2.4        |     6      |     2,628         | 1,005 / 2,010
 *      6  |      3.2        |    5+7     |     1,715         | 1,800 / 3,600
 *
 * Three rules came out of that, and every number here follows them.
 *
 * 1. AN ABILITY IS A THIRD OF A WORLD'S WAGES. A basic is a rare and a special
 *    is a legendary, so the existing price curve already puts one at roughly a
 *    third of what a world pays out and the other at most of it. Nothing new
 *    was invented for pricing: the curve that sells a vest sells these.
 *
 * 2. IT IS RATIONED BY TIME, NOT BY STOCK. A duel runs six or seven rounds.
 *    A basic charging in three or four means one use, occasionally two; a
 *    special charging in five or six means once, late, and only if the fight
 *    lasts. That is the whole balance mechanism — an ability that could be
 *    spent every round would make the gun decorative.
 *
 * 3. IT IS SUPPOSED TO DECIDE BOSSES, NOT DRIFTERS. A one-life drifter dies to
 *    anything and always did. The number actually watched while tuning is what
 *    a full charge is worth against a BOSS: about a third of Big Jed, and about
 *    two thirds of Old Scratch by the time you can afford the basin's kit. A
 *    boss is still a fight you can lose with a special in your pocket, which is
 *    the line.
 *
 * WHY THREE BANDS AND NOT SIX STEPS
 * ---------------------------------------------------------------------------
 * Abilities improve in three steps, indexed by the world the ability comes
 * from: worlds 1-2, 3-4, 5-6. Six steps would need the player to re-buy in
 * every world to keep pace, at a third of their income each time, which is not
 * an upgrade path — it is a tax. Three means the kit you bought in the prairie
 * is still worth carrying through the pass, and the basin's version is a real
 * decision rather than an increment.
 */
const band = (worldId) => (worldId <= 2 ? 0 : worldId <= 4 ? 1 : 2);

/**
 * Player-side tuning for the four base effects, one row per band.
 *
 *   charge  rounds of the duel before it can be spent
 *   amount  lives, or rounds taken out of a gun — read per effect below
 *
 * `dynamite` charges a round slower than the rest at every band, because it is
 * the only one of the four that is damage on the spot: everything else asks the
 * player to still win the round they set up.
 */
export const PLAYER_BASIC = {
  /** Take rounds out of their gun; `take` of them end up in yours. */
  bulletSteal: [
    { charge: 4, amount: 1, take: 0 },
    { charge: 3, amount: 1, take: 1 },
    { charge: 3, amount: 2, take: 1 },
  ],
  /** `amount` lives, `delay` rounds later, through any shield. */
  poison: [
    { charge: 4, amount: 1, delay: 3 },
    { charge: 3, amount: 1, delay: 2 },
    { charge: 3, amount: 2, delay: 2 },
  ],
  /** `amount` lives now, through any shield. */
  dynamite: [
    { charge: 5, amount: 1 },
    { charge: 4, amount: 1 },
    { charge: 4, amount: 2 },
  ],
  /**
   * Their hand goes to the wrong thing: whatever they meant to do this round,
   * they reload instead — wide open to the shot you are about to take.
   *
   * The enemy's mind control scrambles the player at random and the player's
   * does not, for one reason: a scramble the player cannot see is not an
   * ability, it is a dice roll. Forcing a move you can plan around is the same
   * effect made legible.
   *
   * Only worlds 4-6 have a mind-control theme, so band 0 is unreachable and is
   * written to match band 1 rather than left undefined.
   */
  mindControl: [{ charge: 4 }, { charge: 4 }, { charge: 3 }],
};

/**
 * The player's special: the same landmark the enemy raises, aimed the other way
 * and lasting exactly one eruption.
 *
 * It does NOT stay. The enemy's is permanent because an enemy cannot choose a
 * moment and has to be given one that repeats; the player picks the moment, and
 * a permanent hazard on top of that would end fights before they started. What
 * a full charge buys is one eruption on the rival — `strikes` rocks, a life
 * each, over a couple of seconds.
 *
 *   band 0 (worlds 1-2)  6 rounds → 2 lives
 *   band 1 (worlds 3-4)  5 rounds → 3 lives
 *   band 2 (worlds 5-6)  5 rounds → 4 lives
 *
 * Four lives is two thirds of Old Scratch and it arrives at round five of a
 * fight that averages six and a half — so it lands in about half the duels you
 * carry it into, and in the ones where it matters.
 */
export const PLAYER_SPECIAL = [
  { charge: 6, strikes: 2 },
  { charge: 5, strikes: 3 },
  { charge: 5, strikes: 4 },
];

/** Shop base prices. The world curve in progression.js does the rest. */
export const ABILITY_PRICE = { basic: 130, special: 260 };

/**
 * The player's version of one themed ability: what it does, how long it takes
 * to charge, and the sentence the shop prints under it.
 * @param {string} id an ABILITIES key
 */
export function playerAbility(id) {
  const ability = getAbility(id);
  const tuning = ability.base ? PLAYER_BASIC[ability.base] : null;
  if (!tuning) return null;
  const row = tuning[band(ability.world || 1)];
  return { ...ability, kind: 'basic', ...row, desc: describeBasic(ability.base, row) };
}

/** The player's version of one world special. */
export function playerSpecial(id) {
  const spec = getSpecial(id);
  if (!spec) return null;
  const row = PLAYER_SPECIAL[band(spec.world || 1)];
  return {
    ...spec,
    kind: 'special',
    charge: row.charge,
    strikes: row.strikes,
    damage: 1,
    steal: 0,
    poisons: false,
    /**
     * One eruption and it is gone. The warning is short because the player
     * already knows it is coming — they pressed it.
     */
    oneShot: true,
    warnMs: 900,
    activeMs: 2600,
    cycleMs: 0,
    desc: `Calls it down on your rival: ${row.strikes} lives over one eruption. Charges in ${row.charge} rounds.`,
  };
}

function describeBasic(base, row) {
  const lives = (n) => `${n} ${n === 1 ? 'life' : 'lives'}`;
  const after = ` Charges in ${row.charge} rounds.`;
  switch (base) {
    case 'bulletSteal':
      return `Takes ${row.amount} ${row.amount === 1 ? 'round' : 'rounds'} out of their gun${
        row.take ? ` and loads ${row.take} into yours` : ''
      }.${after}`;
    case 'poison':
      return `${lives(row.amount)} ${row.delay} rounds later, through any shield.${after}`;
    case 'dynamite':
      return `${lives(row.amount)} on the spot, through any shield.${after}`;
    case 'mindControl':
      return `Their hand goes wrong: they reload this round instead, wide open.${after}`;
    default:
      return `Charges in ${row.charge} rounds.`;
  }
}

/** Every themed ability a given world's shop can sell. */
export function abilitiesForWorld(worldId) {
  return Object.keys(ABILITIES).filter((id) => ABILITIES[id].world === worldId);
}
