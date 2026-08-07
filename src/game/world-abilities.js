/**
 * SHOOT! — World abilities.
 *
 * Every trick anybody can pull in a duel, and the one landmark each world can
 * put on the road behind it.
 *
 * AN ABILITY IS A MECHANIC, NOT A COAT OF PAINT
 * ---------------------------------------------------------------------------
 * The first version of this file had four effects — steal a round, poison,
 * dynamite, scramble a move — and eighteen names over the top of them. Every
 * world had a poison called something else, in a different colour, costing the
 * same life at the same moment. That is a reskin, and a reskin is exactly as
 * interesting as its tooltip: once a player has read "swamp rot: a life three
 * rounds later" they have read every ability in the game and there is nothing
 * left to learn on the road.
 *
 * So there are FOURTEEN mechanics now, and each one does something the others
 * cannot:
 *
 *   steal    takes rounds out of their cylinder; `take` of them into yours
 *   empty    takes ALL of them
 *   swap     trades cylinders — yours for theirs, whatever is in each
 *   blast    damage now, and A SHIELD STOPS IT (the dynamite)
 *   pierce   damage now, straight through a shield
 *   venom    1 damage EVERY round for `turns` rounds (the poison)
 *   drain    a life off them and onto you
 *   freeze   they lose their next `turns` turns entirely — they stand there
 *   jam      they cannot shoot for `turns` rounds
 *   panic    their shield does not protect for `turns` rounds
 *   blind    their next `turns` shots miss
 *   mark     everything that hits them costs one extra for `turns` rounds
 *   doubleTap your next `turns` shots cost them one extra
 *   reflect  the next shot that hits you goes back at whoever fired it
 *
 * Four of those are damage and ten are not, which is the point: an ability is
 * usually a thing done to the *shape of the fight* rather than to the life bar,
 * and two of them (freeze, mind you) hand the other side turns to use as they
 * like. See src/duel/duel-engine.js — every one is a counter on a side, and the
 * round resolution reads them.
 *
 * THERE ARE NO BANDS ANY MORE
 * ---------------------------------------------------------------------------
 * The old file tuned each effect three times, once per pair of worlds, because
 * the same effect turned up in five of them. Each ability belongs to exactly
 * one world now, so its numbers are written once, on the ability, and the
 * "it gets better as you go" curve is simply that the later worlds' entries are
 * stronger. One place to read a number, one place to change it.
 *
 * USING ONE COSTS THE ENEMY ITS TURN
 * ---------------------------------------------------------------------------
 * The rule that makes all of this survivable, and it is symmetrical in the
 * engine even though it is asymmetrical to play (see `playRound`):
 *
 *   · an enemy that casts is DOING that instead of drawing — no shot, no
 *     shield, and it is open all round
 *   · a player who casts forces the enemy to reload that round
 *   · the player is never restricted: cast and still shoot, shield, reload,
 *     or cast the other slot
 *
 * That is why the strong ones cost five or six rounds of charge. An ability is
 * not extra damage bolted onto a turn — it is a turn taken away from somebody.
 *
 * POISON AND DYNAMITE ARE WORLD ABILITIES, NOT SHOP STAPLES
 * ---------------------------------------------------------------------------
 * They used to be throwables anybody could buy anywhere, which made two of the
 * six worlds' signatures into general stock. Poison belongs to the Blackwater
 * Bayou and dynamite to Brimstone Basin: they are sold in that world's shop and
 * nowhere else, they are carried by that world's riders and nobody else's, and
 * both were rewritten to be worth the trip — poison bites every round for three
 * rounds instead of once, dynamite takes three lives at a stroke instead of
 * one. Both cost more charge than anything else in the game, and the enemies
 * that have them reach for them rarely (`weight`), because a trick that lands
 * every other round at that size is not a signature, it is a tax.
 *
 * THE PLAYER BUYS ALL OF IT
 * ---------------------------------------------------------------------------
 * Every entry here is sold, in the world it belongs to, as equipment kept for
 * the rest of the run (src/game/items.js builds the shop entries from this
 * file). What the player buys is not a copy to throw — it is a thing that
 * CHARGES: one point a round, and when it is full you spend it.
 */

import { PALETTE } from '../art/palette.js';

/**
 * The mechanics, and what each one reads off its ability.
 *
 * `blocks` is the one thing the duel screen needs from this table that the
 * engine does not: whether a shield is any use against it, which is the first
 * question a player asks about anything pointed at them.
 */
export const EFFECTS = {
  steal: { label: 'Theft', blocks: false },
  empty: { label: 'Theft', blocks: false },
  swap: { label: 'Trade', blocks: false },
  blast: { label: 'Damage', blocks: true },
  pierce: { label: 'Damage', blocks: false },
  venom: { label: 'Damage over time', blocks: false },
  drain: { label: 'Damage', blocks: false },
  freeze: { label: 'Control', blocks: false },
  jam: { label: 'Control', blocks: false },
  panic: { label: 'Control', blocks: false },
  blind: { label: 'Control', blocks: false },
  mark: { label: 'Curse', blocks: false },
  doubleTap: { label: 'Buff', blocks: false },
  reflect: { label: 'Guard', blocks: false },
};

export const EFFECT_LIST = Object.keys(EFFECTS);

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
 *
 * `hold` is the other half, and the new one: the colour a fighter is TINTED
 * for as long as the status lasts. A freeze that is only an animation is a
 * freeze the player has forgotten about by the time it costs them a turn — the
 * ice stays on the sprite until it thaws.
 */
const fx = (motion, colors, extra = {}) => ({ motion, colors, count: 26, ...extra });

/**
 * Every ability in the game.
 *
 * Fields, beyond the obvious: `effect` is the mechanic, `amount`/`turns`/`take`
 * are its numbers, `charge` is how many rounds the player waits to spend it,
 * and `weight` is how often an enemy holding it reaches for it (1 is normal).
 */
export const ABILITIES = {
  // --- 1 · Dust Flats -------------------------------------------------------
  /** The wind does the stealing out here, and it takes it off your belt. */
  dustSnatch: {
    effect: 'steal',
    world: 1,
    amount: 1,
    take: 0,
    charge: 3,
    label: 'Dust Snatch',
    tip: 'A gust off the flats takes a round out of the gun',
    icon: 'dustSnatch',
    banner: 'DUST SNATCH!',
    fx: fx('streak', [PALETTE.sandLight, PALETTE.sand, PALETTE.sandDark], { count: 34 }),
  },
  /** Grit in the eyes. The gun still works; the aim does not. */
  sandBlind: {
    effect: 'blind',
    world: 1,
    turns: 1,
    charge: 3,
    label: 'Sand in the Eyes',
    tip: 'Their next shot goes wide',
    icon: 'sandBlind',
    banner: 'BLINDED!',
    fx: fx('swarm', [PALETTE.sand, PALETTE.sandLight, PALETTE.sandDeep], { count: 30 }),
  },

  // --- 2 · Wildgrass Prairie ------------------------------------------------
  /** A rope on the gun arm. They can reload and they can duck; they cannot fire. */
  lassoPull: {
    effect: 'jam',
    world: 2,
    turns: 2,
    charge: 4,
    label: 'Lasso',
    tip: 'A rope on the gun arm — they cannot shoot for two rounds',
    icon: 'lassoPull',
    banner: 'ROPED!',
    fx: fx('streak', [PALETTE.boneDark, PALETTE.bone, PALETTE.woodDark], { count: 24 }),
  },
  /** Nobody keeps a shield up with their hands full of hornets. */
  hornetSwarm: {
    effect: 'panic',
    world: 2,
    turns: 2,
    charge: 4,
    label: 'Hornet Swarm',
    tip: 'Their shield stops nothing for two rounds',
    icon: 'hornetSting',
    banner: 'SWARMED!',
    fx: fx('swarm', [PALETTE.gold, PALETTE.ink, PALETTE.goldLight], { count: 34 }),
  },

  // --- 3 · Whitecrown Pass --------------------------------------------------
  /** Snow across the whole pass. Two shots into it and neither one arrives. */
  whiteout: {
    effect: 'blind',
    world: 3,
    turns: 2,
    charge: 3,
    label: 'Whiteout',
    tip: 'Their next two shots go wide',
    icon: 'frostbite',
    banner: 'WHITEOUT!',
    fx: fx('swarm', [PALETTE.snowLight, PALETTE.iceLight, PALETTE.snowShade], { count: 40 }),
  },
  /** The cylinder freezes shut and everything in it is lost. */
  coldGrip: {
    effect: 'empty',
    world: 3,
    take: 0,
    charge: 5,
    label: 'Cold Grip',
    tip: 'Their cylinder freezes solid — every round in it is gone',
    icon: 'coldGrip',
    banner: 'FROZEN SHUT!',
    fx: fx('streak', [PALETTE.iceLight, PALETTE.ice, PALETTE.snowMid], { count: 28 }),
  },
  /**
   * THE ONE THAT HANDS OVER TURNS
   * -------------------------------------------------------------------------
   * Two rounds in which the other side does nothing at all: no shot, no
   * shield, no reload. Whoever cast it has two turns to do as they like with
   * an opponent standing still in front of them, which is the most any single
   * thing in this game does — hence five rounds of charge, and hence the ice
   * that stays on the sprite until it lets go, so nobody is ever surprised by
   * their own turn being skipped.
   */
  deepFreeze: {
    effect: 'freeze',
    world: 3,
    turns: 2,
    charge: 5,
    label: 'Deep Freeze',
    tip: 'They are frozen solid: two rounds in which they do nothing at all',
    icon: 'iceFall',
    banner: 'FROZEN!',
    hold: { color: PALETTE.iceLight, alpha: 0.55 },
    fx: fx('fall', [PALETTE.iceLight, PALETTE.snowLight, PALETTE.ice], { count: 44, shake: 300 }),
  },

  // --- 4 · Blackwater Bayou -------------------------------------------------
  /**
   * POISON.
   *
   * It used to be a stick you could buy in any shop in the game for one life
   * three rounds later. It is the bayou's now, it is sold nowhere else, and it
   * bites EVERY round for three of them — so it is worth three lives if the
   * fight lasts and one if it does not, which is the most interesting thing a
   * damage effect can be. Six rounds of charge, the joint-longest in the game,
   * and the riders down here reach for it about a third as often as anything
   * else.
   */
  poison: {
    effect: 'venom',
    world: 4,
    turns: 3,
    charge: 6,
    weight: 0.35,
    label: 'Poison',
    tip: 'One life a round for three rounds. No shield stops it',
    icon: 'poison',
    banner: 'POISONED!',
    hold: { color: PALETTE.poison, alpha: 0.4 },
    fx: fx('rise', [PALETTE.poison, PALETTE.poisonDark, PALETTE.greenLight], { count: 34 }),
  },
  /** Something under the water takes a life, and it does not waste it. */
  mireGrasp: {
    effect: 'drain',
    world: 4,
    amount: 1,
    charge: 5,
    label: 'Mire Grasp',
    tip: 'Takes a life off them and gives it to you',
    icon: 'mireGrasp',
    banner: 'DRAGGED UNDER!',
    fx: fx('rise', [PALETTE.bogLight, PALETTE.bogDark, PALETTE.algae], { count: 30 }),
  },
  /** The wisp leads a hand somewhere else — and comes back with the wrong gun. */
  willOWisp: {
    effect: 'swap',
    world: 4,
    charge: 4,
    label: "Will-o'-Wisp",
    tip: 'Trades cylinders with them, whatever is in each',
    icon: 'willOWisp',
    banner: 'SWAPPED!',
    fx: fx('spiral', [PALETTE.algae, PALETTE.bogLight, PALETTE.white], { count: 30 }),
  },
  /** Marked by the fever: everything that lands on them lands harder. */
  swampFever: {
    effect: 'mark',
    world: 4,
    turns: 3,
    charge: 4,
    label: 'Swamp Fever',
    tip: 'For three rounds, everything that hits them costs one extra life',
    icon: 'swampRot',
    banner: 'FEVERED!',
    hold: { color: PALETTE.algae, alpha: 0.35 },
    fx: fx('swarm', [PALETTE.algae, PALETTE.bog, PALETTE.lichen], { count: 32 }),
  },

  // --- 5 · Brimstone Basin --------------------------------------------------
  /**
   * DYNAMITE.
   *
   * Also no longer general stock. Three lives at a stroke — far and away the
   * biggest single hit in the game — and the only ability of the fourteen that
   * A SHIELD STOPS. That is the whole design: it is the hardest thing to be
   * hit by and the easiest thing to be ready for, so throwing it is a read
   * rather than a purchase. Six rounds of charge, and the basin's riders throw
   * it about a third as often as anything else they carry.
   */
  dynamite: {
    effect: 'blast',
    world: 5,
    amount: 3,
    charge: 6,
    weight: 0.35,
    label: 'Dynamite',
    tip: 'Three lives at once — but a raised shield stops it dead',
    icon: 'dynamite',
    banner: 'DYNAMITE!',
    fx: fx('burst', [PALETTE.goldLight, PALETTE.red, PALETTE.grey], { count: 46, shake: 420 }),
  },
  /** The ground opens under their boots. No shield is over that. */
  magmaSpout: {
    effect: 'pierce',
    world: 5,
    amount: 2,
    charge: 5,
    label: 'Magma Spout',
    tip: 'Two lives from underneath. A shield is no use over it',
    icon: 'magmaSpout',
    banner: 'MAGMA SPOUT!',
    fx: fx('rise', [PALETTE.emberGlow, PALETTE.magma, PALETTE.magmaDeep], { count: 40, shake: 320 }),
  },
  /** Their rounds come out glowing, and one of them is yours now. */
  cinderSnatch: {
    effect: 'steal',
    world: 5,
    amount: 2,
    take: 1,
    charge: 3,
    label: 'Cinder Snatch',
    tip: 'Takes two rounds out of their gun and loads one into yours',
    icon: 'cinderSnatch',
    banner: 'CINDER SNATCH!',
    fx: fx('streak', [PALETTE.emberGlow, PALETTE.magma, PALETTE.magmaDeep], { count: 30 }),
  },
  /** Something tells you where to put the next two, and it is right. */
  hellWhisper: {
    effect: 'doubleTap',
    world: 5,
    turns: 2,
    /**
     * Five rather than four. Two shots at double is two extra lives on a road
     * where the average rider has two and a half of them, and at four rounds
     * it landed in nearly every duel — measured, it was worth twenty points of
     * win rate on its own, which is more than the volcano.
     */
    charge: 5,
    label: 'Hell Whisper',
    tip: 'Your next two shots cost them an extra life each',
    icon: 'hellWhisper',
    banner: 'WHISPERED TO!',
    hold: { color: PALETTE.magma, alpha: 0.3, self: true },
    fx: fx('spiral', [PALETTE.magma, PALETTE.charDark, PALETTE.sulfurLight], { count: 28 }),
  },

  // --- 6 · Galaxy -----------------------------------------------------------
  /** Everything in the cylinder leaves it, and two of them arrive in yours. */
  gravityPull: {
    effect: 'empty',
    world: 6,
    take: 2,
    charge: 5,
    label: 'Gravity Pull',
    tip: 'Empties their gun and two of the rounds end up in yours',
    icon: 'gravityPull',
    banner: 'PULLED!',
    fx: fx('streak', [PALETTE.astralLight, PALETTE.astral, PALETTE.purple], { count: 34 }),
  },
  /** The next thing fired at you arrives at the man who fired it. */
  voidMirror: {
    effect: 'reflect',
    world: 6,
    turns: 1,
    charge: 4,
    label: 'Void Mirror',
    tip: 'The next shot that would hit you goes back at them instead',
    icon: 'starRot',
    banner: 'MIRRORED!',
    hold: { color: PALETTE.astralLight, alpha: 0.35, self: true },
    fx: fx('burst', [PALETTE.astralLight, PALETTE.astral, PALETTE.white], { count: 30 }),
  },
  /** A rock out of nothing at all. Three lives, and no shield is over it. */
  meteorStrike: {
    effect: 'pierce',
    world: 6,
    amount: 3,
    charge: 5,
    label: 'Meteor Strike',
    tip: 'Three lives out of the sky. A shield is no use under it',
    icon: 'meteorStrike',
    banner: 'METEOR!',
    fx: fx('fall', [PALETTE.astralLight, PALETTE.purple, PALETTE.white], { count: 44, shake: 420 }),
  },
  /** The space between a thought and a hand comes apart for two rounds. */
  mindRift: {
    effect: 'freeze',
    world: 6,
    turns: 2,
    charge: 5,
    label: 'Mind Rift',
    tip: 'Two rounds in which they can do nothing at all',
    icon: 'mindRift',
    banner: 'RIFTED!',
    hold: { color: PALETTE.purple, alpha: 0.5 },
    fx: fx('spiral', [PALETTE.purple, PALETTE.astralLight, PALETTE.cosmic], { count: 36, shake: 300 }),
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
 * Look an ability up by id. Never null: an unknown id comes back inert rather
 * than undefined, which is what keeps a half-finished theme from taking the
 * duel down with it.
 */
export function getAbility(id) {
  const entry = ABILITIES[id];
  if (entry) return { id, ...entry };
  return { id, effect: null, label: id, tip: '', icon: id, banner: null, fx: null };
}

/** What an ability id actually does to the duel. */
export function effectOf(id) {
  return getAbility(id).effect;
}

/** True when a raised shield is any use against this ability. Only blast is. */
export function isBlockable(id) {
  const effect = effectOf(id);
  return !!(effect && EFFECTS[effect]?.blocks);
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
 * The numbers on each entry above were set against the four figures that
 * actually constrain them, measured off src/game/worlds.js and
 * src/game/progression.js:
 *
 *   world | avg enemy lives | boss lives | gold a world pays | rare / legendary
 *      1  |      1.2        |     3      |       287         |   130 /   260
 *      3  |      1.7        |     4      |     1,010         |   355 /   710
 *      5  |      2.4        |     6      |     2,628         | 1,005 / 2,010
 *      6  |      3.2        |    5+7     |     1,715         | 1,800 / 3,600
 *
 * Four rules came out of that, and every number follows them.
 *
 * 1. AN ABILITY IS A THIRD OF A WORLD'S WAGES. A basic is a rare and a special
 *    is a legendary, so the existing price curve already puts one at roughly a
 *    third of what a world pays out and the other at most of it. Nothing new
 *    was invented for pricing: the curve that sells a vest sells these.
 *
 * 2. IT IS RATIONED BY TIME, NOT BY STOCK. A duel runs six or seven rounds, so
 *    a three-round charge is two uses, a four is one or two, and a six is one —
 *    late, and only if the fight lasts. That is the whole balance mechanism.
 *
 * 3. THE COST IS THE SIZE OF WHAT IT TAKES AWAY. Not damage — turns. Anything
 *    that hands its caster free turns (freeze, and the empty that leaves a gun
 *    with nothing in it) costs five. Poison and dynamite cost six, the longest
 *    in the game, because three lives is most of any enemy in the first four
 *    worlds. The cheap ones at three are the ones that only bend a round:
 *    a stolen bullet, a shot sent wide.
 *
 * 4. IT IS SUPPOSED TO DECIDE BOSSES, NOT DRIFTERS. A one-life drifter dies to
 *    anything and always did. The figure watched while tuning is what a full
 *    charge is worth against a BOSS: about a third of Big Jed, about two thirds
 *    of Old Scratch by the time the basin's kit is affordable. A boss is still
 *    a fight you can lose with a volcano in your pocket.
 *
 * WHY THE NUMBERS ARE ON THE ABILITY AND NOT IN A BAND TABLE
 * ---------------------------------------------------------------------------
 * They used to be tuned three times over, once per pair of worlds, because the
 * same four effects turned up in all six. Each ability is its own mechanic now
 * and belongs to exactly one world, so "it gets better as you go" is simply
 * that the later entries are stronger — Dust Snatch takes one round, Gravity
 * Pull takes the whole cylinder. One number, in one place, on the thing it
 * describes.
 */

/** Shop base prices. The world curve in progression.js does the rest. */
export const ABILITY_PRICE = { basic: 130, special: 260 };

/**
 * The player's version of one ability: exactly the entry above, plus the
 * sentence the shop prints under it. Player and enemy fire the same numbers —
 * the asymmetry is in the turn rule (see the header), not in the tuning.
 *
 * @param {string} id an ABILITIES key
 */
export function playerAbility(id) {
  const ability = getAbility(id);
  if (!ability.effect || !ability.world) return null;
  return { ...ability, kind: 'basic', desc: describeAbility(ability) };
}

/** The one-line description, written from the numbers so it can never drift. */
export function describeAbility(a) {
  const lives = (n) => `${n} ${n === 1 ? 'life' : 'lives'}`;
  const rounds = (n) => `${n} ${n === 1 ? 'round' : 'rounds'}`;
  const after = ` Charges in ${a.charge} rounds.`;
  switch (a.effect) {
    case 'steal':
      return `Takes ${rounds(a.amount)} out of their gun${
        a.take ? ` and loads ${a.take} into yours` : ''
      }.${after}`;
    case 'empty':
      return `Empties their cylinder${a.take ? `, and ${a.take} of them end up in yours` : ''}.${after}`;
    case 'swap':
      return `Trades cylinders with them, whatever is in each.${after}`;
    case 'blast':
      return `${lives(a.amount)} at once — but a raised shield stops it dead.${after}`;
    case 'pierce':
      return `${lives(a.amount)}, straight through any shield.${after}`;
    case 'venom':
      return `One life a round for ${rounds(a.turns)}. No shield stops it.${after}`;
    case 'drain':
      return `Takes ${lives(a.amount)} off them and gives it to you.${after}`;
    case 'freeze':
      return `They do nothing at all for ${rounds(a.turns)} — the turns are yours.${after}`;
    case 'jam':
      return `They cannot shoot for ${rounds(a.turns)}.${after}`;
    case 'panic':
      return `Their shield stops nothing for ${rounds(a.turns)}.${after}`;
    case 'blind':
      return `Their next ${a.turns === 1 ? 'shot goes' : `${a.turns} shots go`} wide.${after}`;
    case 'mark':
      return `For ${rounds(a.turns)}, everything that hits them costs one extra life.${after}`;
    case 'doubleTap':
      return `Your next ${a.turns === 1 ? 'shot costs' : `${a.turns} shots cost`} them an extra life.${after}`;
    case 'reflect':
      return `The next shot that would hit you goes back at them instead.${after}`;
    default:
      return `Charges in ${a.charge} rounds.`;
  }
}

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
 *   worlds 1-2  6 rounds → 2 lives
 *   worlds 3-4  5 rounds → 3 lives
 *   worlds 5-6  5 rounds → 4 lives
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

const specialBand = (worldId) => (worldId <= 2 ? 0 : worldId <= 4 ? 1 : 2);

/** The player's version of one world special. */
export function playerSpecial(id) {
  const spec = getSpecial(id);
  if (!spec) return null;
  const row = PLAYER_SPECIAL[specialBand(spec.world || 1)];
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

/** Every themed ability a given world's shop can sell. */
export function abilitiesForWorld(worldId) {
  return Object.keys(ABILITIES).filter((id) => ABILITIES[id].world === worldId);
}

/**
 * How often an enemy holding a mixed hand reaches for each of them.
 *
 * Uniform until poison and dynamite arrived at three lives apiece. Those two
 * carry `weight: 0.35`, so a bayou rider with poison and three other tricks
 * plays poison about one time in ten rather than one in four — which is what
 * makes it the thing you remember about the bayou instead of the thing you
 * dread every round.
 */
export function pickWeighted(ids, roll) {
  const weights = ids.map((id) => getAbility(id).weight ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = roll * total;
  for (let i = 0; i < ids.length; i++) {
    t -= weights[i];
    if (t <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}