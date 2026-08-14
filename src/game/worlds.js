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
    /**
     * EVERY WORLD IS LONGER NOW, AND THIS ONE IS THE SHORTEST OF THEM
     * -----------------------------------------------------------------------
     * A world used to be four to six fights, which is a stretch of road you
     * cross rather than one you live on: the buildings came round every other
     * stop, a bar filled at the border was still most of the way full at the
     * boss's door, and the pacing rule the whole road is built on — counters
     * and beds kept apart by fights — had nothing to keep them apart WITH.
     * Five duels cannot hold five buildings two fights apart; the arithmetic
     * in src/explore/encounters.js (`bill`) collapses the gap to one and the
     * world comes out as a parade of doors.
     *
     * The six of them are 8, 11, 10, 11, 8 and 6 — near enough double, and the
     * number of counters and beds went up with them (`DUELS_PER_SERVICE`), so
     * a longer road is a road with more on it rather than a road with the same
     * two shops spread thinner.
     *
     * The Dust Flats gets the smallest share of that, and the reason is the bar
     * rather than the road: three diamonds is the shallowest this game ever is,
     * and the harness ends nearly a third of all beginner runs here whatever
     * the length. Taking this world from ten fights to eight moved a novice's
     * odds of ever seeing the Galaxy up by half. It is the world that teaches
     * the game, and a teaching world should be survivable.
     */
    encounters: { duels: 8 },
    rarity: { common: 78, rare: 20, legendary: 2 },
    enemy: {
      lives: { 1: 88, 2: 12 },
      abilityChance: 0.05,
      /**
       * Two tricks and both of them are weather: a gust that takes a round off
       * your belt and a handful of grit in your eyes. Big Jed's dynamite went
       * to Brimstone Basin along with the rest of the dynamite in the game —
       * see the note on it in src/game/world-abilities.js.
       */
      abilities: ['dustSnatch', 'sandBlind'],
      accuracy: 0.33,       // how often the AI reads your move correctly
      /** Who rides this stretch — see src/art/sprites-enemies.js. */
      roster: ['drifter', 'brawler', 'bandana', 'strawhat'],
      /** The world's special, and how many of its riders are carrying it. */
      special: 'duststorm',
      specialChance: 0.1,
    },
    boss: {
      name: 'Big Jed',
      archetype: 'bossJed',
      lives: 2,
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
    /**
     * The longest world in the game — with the Bayou — and the one that can
     * most afford to be.
     *
     * A Prairie duel is two shots and about an eighth of the bar: the forge
     * ladder is ahead of the riders out here and the gold is good, so length
     * costs less on this stretch than anywhere else on the road. It is also
     * where the money for the pass comes from, and the harness is blunt about
     * that — every fight taken off this world is a rung of revolver the player
     * does not have in the one they cannot afford to be under-armed in.
     */
    encounters: { duels: 11 },
    rarity: { common: 66, rare: 29, legendary: 5 },
    enemy: {
      lives: { 2: 25, 3: 50, 4: 25 },
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
      lives: 4.5,
      abilities: ['hornetSwarm', 'lassoPull'],
      accuracy: 0.55,
      special: 'hornetTree',
    },
  },
  {
    id: 3,
    name: 'Whitecrown Pass',
    subtitle: 'Above the trees, under the storm',
    /**
     * A fight shorter than the two long worlds on either side of it, and that
     * is the whole of what "the short world" means now.
     *
     * It used to be short because of a rounding — the pass landed on 5/6 of a
     * life a bullet and the half-diamond grid rounded it up. The spine is a
     * straight line now (see EXPECTED_POWER) and the pass gets exactly its
     * sixth like everybody else, but this is where the ramp starts to bite, and
     * the back half of the crossing is fights against riders carrying two whole
     * lives a shot.
     */
    biome: 'snow',
    tint: null,
    priceMul: 1.35,
    goldMul: 2.1,
    expMul: 1.9,
    encounters: { duels: 10 },
    rarity: { common: 54, rare: 36, legendary: 10 },
    enemy: {
      lives: { 4: 25, 5: 50, 6: 25 },
      abilityChance: 0.13,
      abilities: ['coldGrip', 'whiteout', 'deepFreeze'],
      accuracy: 0.46,
      roster: ['goggles', 'furhood', 'bonemarshal', 'drifter'],
      special: 'cornice',
      specialChance: 0.14,
    },
    /**
     * WATCH THIS ONE WHENEVER THE LADDERS MOVE
     * -----------------------------------------------------------------------
     * Kate is the boss the harness has caught twice, and always the same way:
     * she is the only one in the game holding a trick that takes a TURN off the
     * player rather than lives, and she stands under a landmark that erupts
     * every few seconds. A frozen turn is a free round for her, a free round is
     * another eruption, and one extra shot on her bar turns a seven-round fight
     * into a ten-round one — the last time that happened she killed a third of
     * everybody who reached her, more than twice the next worst boss.
     *
     * Taking the freeze out of her hand was tried and made it WORSE: with one
     * trick left she reaches for the whiteout every time and the fight goes
     * blind instead. So the thing to move is her bar, and to move it in whole
     * shots of whatever gun the pass hands the player.
     */
    boss: {
      name: 'Whiteout Kate',
      archetype: 'bossWhiteout',
      lives: 7.5,
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
    encounters: { duels: 11 },
    rarity: { common: 42, rare: 42, legendary: 16 },
    enemy: {
      lives: { 6: 30, 7: 40, 8: 25, 9: 5 },
      abilityChance: 0.28,
      abilities: ['poison', 'mireGrasp', 'willOWisp', 'swampFever'],
      accuracy: 0.5,
      roster: ['preacher', 'wraith', 'skeleton', 'gambler'],
      special: 'blackdamp',
      specialChance: 0.16,
    },
    boss: {
      name: 'Colonel Sable',
      /**
       * A shade over his derived total (ten and a half), and Old Scratch the
       * same, because these two are the only bosses in the game the harness
       * measures at a HUNDRED per cent for every skill band. They are fought
       * with a maxed gun on the deepest bar the player has ever had, and at the
       * derived figure they are a formality standing between two hard worlds.
       */
      archetype: 'bossSable',
      lives: 12.5,
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
    /**
     * EIGHT, BECAUSE A BASIN DUEL IS HALF AGAIN AS LONG AS A BAYOU ONE
     * -----------------------------------------------------------------------
     * This is where the forge ladder runs out (`EXPECTED_POWER`): the gun stops
     * at three and a half and the riders keep climbing, so a fight out here
     * takes two and a half shots instead of two and runs seven rounds instead
     * of five. A world costs duels times the cost of a duel, and when the
     * second number goes up by half the first one has to come down — so the
     * Basin gets three fights fewer than the Bayou it follows, and the road
     * starts narrowing towards the corridor at the end of it.
     */
    encounters: { duels: 8 },
    rarity: { common: 30, rare: 45, legendary: 25 },
    enemy: {
      lives: { 8: 30, 9: 40, 10: 25, 11: 5 },
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
      lives: 16,
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
    /**
     * The Galaxy is short and brutal: a corridor straight to the boss. Six is
     * the fewest fights in the game and still half again the corridor it used
     * to be — out here a rider carries eleven diamonds against a gun that
     * stopped at three and a half, and a single duel costs better than a third
     * of the bar. It is the one world whose length is held DOWN while the rest
     * of the road was let out, and the reason is the ending: at eight, the
     * share of expert runs that actually finish the game fell by half, and a
     * last world nobody sees the end of is a wall rather than a climax.
     */
    encounters: { duels: 6 },
    rarity: { common: 18, rare: 42, legendary: 40 },
    enemy: {
      lives: { 10: 30, 11: 40, 12: 22, 13: 8 },
      abilityChance: 0.48,
      abilities: ['gravityPull', 'voidMirror', 'meteorStrike', 'mindRift'],
      accuracy: 0.6,
      roster: ['starhelm', 'voidsheriff', 'nameless', 'ironkiln'],
      special: 'rift',
      specialChance: 0.22,
    },
    /**
     * Two phases — see src/duel/duel-engine.js `phases` — nine diamonds each,
     * a shade over the eight and a half his world's riders derive. Eighteen
     * across the pair is the largest bar in the game and it is the last fight
     * in it; ten each was tried and took the completion rate of everybody but
     * an expert to almost nothing, which is a wall rather than an ending.
     */
    boss: {
      name: 'THE STRANGER',
      lives: 9,
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
          lives: 9,
          accuracy: 0.72,
          abilities: ['voidMirror', 'meteorStrike'],
          special: 'rift',
        },
        {
          name: 'The Stranger · Unmasked',
          /** The cloak comes off: phase two is a different sprite, not a bar refill. */
          archetype: 'bossStrangerUnmasked',
          lives: 9,
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
