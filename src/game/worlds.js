/**
 * SHOOT! — World definitions (Block 5a).
 *
 * Five themed worlds plus the final "Galaxy". Each world is a single data
 * object that every other system reads:
 *
 *   biome       which landscape you walk through — see src/game/biomes.js
 *   encounters  how many duels the road holds; the shops and inns around them
 *               are rolled per run — see src/explore/encounters.js
 *   rarity      shop rarity weights (higher worlds tilt towards legendary)
 *   priceMul    multiplier on top of the exponential price curve
 *   enemy       enemy life distribution, ability chances, and the ROSTER of
 *               archetypes that ride here — see src/art/sprites-enemies.js.
 *               A world's cast is a list of looks, and each look brings its
 *               own names with it, so nobody is ever called something the
 *               sprite does not show. `abilities` names this world's THEMED
 *               tricks and `special` its one landmark ability — both defined
 *               in src/game/world-abilities.js — and `specialChance` is how
 *               many of its riders are carrying that landmark.
 *   boss        the world's final fight, including the archetype it wears
 *               and the special it always has
 *   tint        canvas colour wash that gives each world its identity
 *
 * Everything is parameterised — to rebalance the game you edit numbers here,
 * never formulas elsewhere.
 *
 * BIOME AND WORLD ARE NOT THE SAME THING
 * ---------------------------------------------------------------------------
 * The game used to be six stretches of the same desert wearing six colour
 * washes, which is why worlds 2 to 5 were all named after rock and sand: the
 * names were describing the art, not the journey. Each world now names a place
 * the ride could plausibly reach, and points at the biome that draws it.
 *
 * All six of those biomes are now drawn: `desert`, `meadow`, `snow`, `swamp`,
 * `inferno` and `void`.
 *
 * WHAT A TINT IS FOR, NOW THAT IT IS NOT A PLACEHOLDER
 * ---------------------------------------------------------------------------
 * The washes used to be stand-ins for art that did not exist: four worlds wore
 * the desert, and a blue one said "this is the cold place" over a picture of
 * sand. Every one of those is gone, because a wash laid over a landscape that
 * is already the right colour does nothing but drain it — the pass is white
 * because it is drawn white.
 *
 * Three worlds keep one, and for the opposite reason: the *sky* over them is
 * not Earth's. The sky is deliberately shared by the whole game (see the note
 * in src/explore/parallax.js) — the sun setting the same way in all six worlds
 * is part of what makes the journey one journey — so the only way to say "the
 * air here is not air" is to put the world's own colour over the top of it.
 * A bayou needs the blue taken down, the basin should not have a summer sky at
 * all, and the Galaxy has no sky in the first place.
 */

import { getBiome } from './biomes.js';

export const FINAL_WORLD = 6;

export const WORLDS = [
  {
    id: 1,
    name: 'Dust Flats',
    subtitle: 'Where every story starts',
    biome: 'desert',
    tint: null,
    priceMul: 1,
    goldMul: 1,
    expMul: 1,
    encounters: { duels: 7 },
    rarity: { common: 78, rare: 20, legendary: 2 },
    enemy: {
      lives: { 2: 80, 3: 18, 4: 2 },
      abilityChance: 0.05,
      /**
       * Two tricks and both of them are weather: a gust that takes a round off
       * your belt and a handful of grit in your eyes. Big Jed's dynamite went
       * to Brimstone Basin along with the rest of the dynamite in the game —
       * see the note on it in src/game/world-abilities.js.
       */
      abilities: ['dustSnatch', 'sandBlind'],
      accuracy: 0.38,       // how often the AI reads your move correctly
      /** Who rides this stretch — see src/art/sprites-enemies.js. */
      roster: ['drifter', 'brawler', 'bandana', 'strawhat'],
      /** The world's special, and how many of its riders are carrying it. */
      special: 'duststorm',
      specialChance: 0.1,
    },
    boss: {
      name: 'Big Jed',
      archetype: 'bossJed',
      lives: 4,
      abilities: ['dustSnatch', 'sandBlind'],
      accuracy: 0.5,
      special: 'duststorm',
    },
  },
  {
    id: 2,
    name: 'Wildgrass Prairie',
    subtitle: 'Green country, and none of it yours',
    biome: 'meadow',
    tint: null,
    priceMul: 1.15,
    goldMul: 1.5,
    expMul: 1.4,
    encounters: { duels: 8 },
    rarity: { common: 66, rare: 29, legendary: 5 },
    enemy: {
      lives: { 2: 60, 3: 30, 4: 10 },
      abilityChance: 0.14,
      abilities: ['lassoPull', 'hornetSwarm'],
      accuracy: 0.42,
      roster: ['sombrero', 'scarecrow', 'gambler', 'strawhat', 'bandana'],
      special: 'hornetTree',
      specialChance: 0.12,
    },
    boss: {
      name: 'Barbwire Bill',
      archetype: 'bossBarbwire',
      lives: 6,
      abilities: ['hornetSwarm', 'lassoPull'],
      accuracy: 0.55,
      special: 'hornetTree',
    },
  },
  {
    id: 3,
    name: 'Whitecrown Pass',
    subtitle: 'Above the trees, under the storm',
    biome: 'snow',
    tint: null,
    priceMul: 1.35,
    goldMul: 2.1,
    expMul: 1.9,
    encounters: { duels: 8 },
    rarity: { common: 54, rare: 36, legendary: 10 },
    enemy: {
      lives: { 3: 46, 4: 34, 5: 16, 6: 4 },
      abilityChance: 0.2,
      abilities: ['coldGrip', 'whiteout', 'deepFreeze'],
      accuracy: 0.46,
      roster: ['goggles', 'furhood', 'bonemarshal', 'drifter'],
      special: 'cornice',
      specialChance: 0.14,
    },
    boss: {
      name: 'Whiteout Kate',
      archetype: 'bossWhiteout',
      lives: 6,
      abilities: ['deepFreeze', 'whiteout'],
      accuracy: 0.58,
      special: 'cornice',
    },
  },
  {
    id: 4,
    name: 'Blackwater Bayou',
    subtitle: 'The water keeps what it takes',
    biome: 'swamp',
    /** The blue taken out of the sky, and a little green put into the air. */
    tint: { color: '#5c7f6a', alpha: 0.2 },
    priceMul: 1.6,
    goldMul: 2.9,
    expMul: 2.5,
    encounters: { duels: 9 },
    rarity: { common: 42, rare: 42, legendary: 16 },
    enemy: {
      lives: { 3: 36, 4: 34, 5: 22, 6: 8 },
      abilityChance: 0.28,
      abilities: ['poison', 'mireGrasp', 'willOWisp', 'swampFever'],
      accuracy: 0.5,
      roster: ['preacher', 'wraith', 'skeleton', 'gambler'],
      special: 'blackdamp',
      specialChance: 0.16,
    },
    boss: {
      name: 'Colonel Sable',
      archetype: 'bossSable',
      lives: 10,
      abilities: ['willOWisp', 'swampFever', 'poison'],
      accuracy: 0.62,
      special: 'blackdamp',
    },
  },
  {
    id: 5,
    name: 'Brimstone Basin',
    subtitle: 'Hell got tired of waiting',
    biome: 'inferno',
    /**
     * The basin's own light. Strong enough to take the summer out of the sky
     * and turn the sun the colour of the ground, and no stronger — past about
     * a third the black rock goes brown and the whole world reads as rust.
     */
    tint: { color: '#c2451c', alpha: 0.26 },
    priceMul: 1.9,
    goldMul: 3.8,
    expMul: 3.2,
    encounters: { duels: 10 },
    rarity: { common: 30, rare: 45, legendary: 25 },
    enemy: {
      lives: { 4: 26, 5: 32, 6: 26, 7: 12, 8: 4 },
      abilityChance: 0.36,
      abilities: ['dynamite', 'magmaSpout', 'cinderSnatch', 'hellWhisper'],
      accuracy: 0.55,
      roster: ['emberrider', 'ashwidow', 'ironkiln', 'horned', 'bonemarshal'],
      /** The volcano. See src/game/world-abilities.js. */
      special: 'volcano',
      specialChance: 0.18,
    },
    boss: {
      name: 'Old Scratch',
      archetype: 'bossScratch',
      lives: 11,
      abilities: ['magmaSpout', 'hellWhisper', 'dynamite'],
      accuracy: 0.66,
      special: 'volcano',
    },
  },
  {
    id: 6,
    name: 'Galaxy',
    subtitle: 'Past the last horizon',
    /** The walk is the void; the intro card is still the galaxy scene. */
    biome: 'void',
    /**
     * The heaviest wash in the game, and the only one doing structural work:
     * out here the "sky" is a blue gradient with a sun crossing it, and this
     * is what makes it space. It goes over the sun as well, which is correct —
     * whatever that is, it is not the star the first five worlds walked under.
     */
    tint: { color: '#4c2f80', alpha: 0.45 },
    priceMul: 2.4,
    goldMul: 5,
    expMul: 4.5,
    /** The Galaxy is short and brutal: a corridor straight to the boss. */
    encounters: { duels: 6 },
    rarity: { common: 18, rare: 42, legendary: 40 },
    enemy: {
      lives: { 5: 34, 6: 34, 7: 20, 8: 12 },
      abilityChance: 0.48,
      abilities: ['gravityPull', 'voidMirror', 'meteorStrike', 'mindRift'],
      accuracy: 0.6,
      roster: ['starhelm', 'voidsheriff', 'nameless', 'ironkiln'],
      special: 'rift',
      specialChance: 0.22,
    },
    /** Two phases — see src/duel/duel-engine.js `phases`. */
    boss: {
      name: 'THE STRANGER',
      lives: 7,
      abilities: ['mindRift', 'meteorStrike', 'voidMirror'],
      accuracy: 0.72,
      archetype: 'bossStranger',
      /** He opens the rift himself. The phase change does not close it. */
      special: 'rift',
      /** The second line of the name card the entrance slams up. */
      cardSub: 'PAST THE LAST HORIZON',

      /**
       * THE ENTRANCE
       * -----------------------------------------------------------------
       * The cut-scene that plays before the last fight in the game, as data:
       * a list of lines, each one a speaker, a camera framing and a sentence.
       * The machinery is in src/duel/boss-intro.js and knows nothing about
       * the Stranger — give any boss an `intro` and it gets an entrance.
       *
       * `shot` names a framing (`eyes`, `face`, `wide`, `low`) and `shake`
       * kicks the camera on the beat the line lands. The player answers, and
       * the answer cuts to the player's own face: a conversation shot from
       * one angle is a monologue with an audience.
       *
       * The lines are written to be read in about a second each. Every one of
       * them is doing a job — the first says he has been watching, the second
       * says the whole journey was his, the third makes it personal, the
       * player's says no, and the last is the only order he gives.
       */
      intro: {
        lines: [
          { who: 'enemy', shot: 'low', text: 'Six worlds. Six roads. I laid every one of them for you.' },
          { who: 'enemy', shot: 'bust', text: 'You buried the men I sent. You ate, you slept, you grew.' },
          { who: 'enemy', shot: 'face', text: 'A gun is a small thing to carry that far.', shake: 260, rumble: true },
          { who: 'player', shot: 'bust', text: 'I did not walk it to stand still at the end of it.', cut: true },
          { who: 'enemy', shot: 'eyes', text: 'No. You walked it so I could see what I made.', shake: 420, cut: true },
          { who: 'enemy', shot: 'face', text: 'Draw.', shake: 700, cut: true },
        ],
      },
      phases: [
        {
          name: 'The Stranger',
          archetype: 'bossStranger',
          lives: 7,
          accuracy: 0.72,
          abilities: ['voidMirror', 'meteorStrike'],
          special: 'rift',
        },
        {
          name: 'The Stranger · Unmasked',
          /** The cloak comes off: phase two is a different sprite, not a bar refill. */
          archetype: 'bossStrangerUnmasked',
          lives: 8,
          accuracy: 0.74,
          abilities: ['mindRift', 'meteorStrike', 'voidMirror', 'gravityPull'],
          special: 'rift',
          /** Phase two starts with a bullet already chambered and fires faster. */
          startBullets: 2,
          abilityChanceMul: 1.3,
        },
      ],
    },
  },
];

export function getWorld(id) {
  return WORLDS.find((w) => w.id === id) || WORLDS[0];
}

/** The biome record a world is set in. Never null — falls back to the desert. */
export function getWorldBiome(id) {
  return getBiome(getWorld(id).biome);
}

export const WORLD_COUNT = WORLDS.length;
