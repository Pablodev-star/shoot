/**
 * SHOOT! — World definitions (Block 5a).
 *
 * Five themed worlds plus the final "Galaxy". Each world is a single data
 * object that every other system reads:
 *
 *   biome       which landscape you walk through — see src/game/biomes.js
 *   encounters  parameters for the guided-random sequence generator
 *   rarity      shop rarity weights (higher worlds tilt towards legendary)
 *   priceMul    multiplier on top of the exponential price curve
 *   enemy       enemy life distribution + ability chances
 *   boss        the world's final fight
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
 * Two of those biomes exist: `desert` and `meadow`. The worlds whose landscape
 * has not been drawn yet ride the desert and say so in a comment above the
 * `biome` line — they are named for what they will be, and the wash is the
 * placeholder that hints at it. Building one of them is a matter of adding
 * `src/art/biomes/<id>.js` plus a weather table, then changing one line here;
 * no other system needs to know.
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
    encounters: { total: 10, minEnemies: 6, minShops: 2, minInns: 2 },
    rarity: { common: 78, rare: 20, legendary: 2 },
    enemy: {
      lives: { 1: 80, 2: 18, 3: 2 },
      abilityChance: 0.05,
      abilities: ['bulletSteal'],
      accuracy: 0.42,       // how often the AI reads your move correctly
      names: ['Drifter', 'Cattle Thief', 'Bar Brawler', 'Saddle Tramp'],
    },
    boss: { name: 'Big Jed', lives: 5, abilities: ['dynamite'], accuracy: 0.55 },
  },
  {
    id: 2,
    name: 'Wildgrass Prairie',
    subtitle: 'Green country, and none of it yours',
    biome: 'meadow',
    /**
     * No wash at all. The prairie is the first world with its own art, and a
     * colour laid over it would only be arguing with paint that is already
     * the right colour — the washes below exist because those worlds are
     * still wearing the desert.
     */
    tint: null,
    priceMul: 1.15,
    goldMul: 1.5,
    expMul: 1.4,
    encounters: { total: 12, minEnemies: 7, minShops: 2, minInns: 2 },
    rarity: { common: 66, rare: 29, legendary: 5 },
    enemy: {
      lives: { 1: 66, 2: 26, 3: 8 },
      abilityChance: 0.14,
      abilities: ['bulletSteal', 'poison'],
      accuracy: 0.48,
      names: ['Fence Cutter', 'Cattle Rustler', 'Creek Bandit', 'Hay Thief'],
    },
    boss: { name: 'Barbwire Bill', lives: 6, abilities: ['poison', 'bulletSteal'], accuracy: 0.6 },
  },
  {
    id: 3,
    name: 'Whitecrown Pass',
    subtitle: 'Above the trees, under the storm',
    /** TODO: a `snow` biome. Riding the desert until it is drawn. */
    biome: 'desert',
    tint: { color: '#9fc0e0', alpha: 0.24 },
    priceMul: 1.35,
    goldMul: 2.1,
    expMul: 1.9,
    encounters: { total: 15, minEnemies: 8, minShops: 3, minInns: 3 },
    rarity: { common: 54, rare: 36, legendary: 10 },
    enemy: {
      lives: { 1: 50, 2: 32, 3: 14, 4: 4 },
      abilityChance: 0.24,
      abilities: ['bulletSteal', 'poison', 'dynamite'],
      accuracy: 0.54,
      names: ['Snow Blind', 'Frost Trapper', 'Pass Wolfer', 'Avalanche Kid'],
    },
    boss: { name: 'Whiteout Kate', lives: 7, abilities: ['dynamite', 'poison'], accuracy: 0.64 },
  },
  {
    id: 4,
    name: 'Blackwater Bayou',
    subtitle: 'The water keeps what it takes',
    /** TODO: a `swamp` biome. Riding the desert until it is drawn. */
    biome: 'desert',
    tint: { color: '#4a6a52', alpha: 0.32 },
    priceMul: 1.6,
    goldMul: 2.9,
    expMul: 2.5,
    encounters: { total: 16, minEnemies: 9, minShops: 3, minInns: 3 },
    rarity: { common: 42, rare: 42, legendary: 16 },
    enemy: {
      lives: { 1: 36, 2: 34, 3: 22, 4: 8 },
      abilityChance: 0.34,
      abilities: ['bulletSteal', 'poison', 'dynamite', 'mindControl'],
      accuracy: 0.6,
      names: ['Marsh Runner', 'Reed Ghost', 'Swamp Preacher', 'Gator Bait'],
    },
    boss: { name: 'Colonel Sable', lives: 8, abilities: ['mindControl', 'dynamite'], accuracy: 0.68 },
  },
  {
    id: 5,
    name: 'Brimstone Basin',
    subtitle: 'Hell got tired of waiting',
    /** TODO: an `inferno` biome. Riding the desert until it is drawn. */
    biome: 'desert',
    tint: { color: '#b83a22', alpha: 0.36 },
    priceMul: 1.9,
    goldMul: 3.8,
    expMul: 3.2,
    encounters: { total: 17, minEnemies: 10, minShops: 3, minInns: 3 },
    rarity: { common: 30, rare: 45, legendary: 25 },
    enemy: {
      lives: { 1: 24, 2: 32, 3: 28, 4: 12, 5: 4 },
      abilityChance: 0.45,
      abilities: ['bulletSteal', 'poison', 'dynamite', 'mindControl'],
      accuracy: 0.66,
      names: ['Cinder Rider', 'Ash Widow', 'Smoke Eater', 'The Kiln'],
    },
    boss: { name: 'Old Scratch', lives: 10, abilities: ['mindControl', 'poison', 'dynamite'], accuracy: 0.72 },
  },
  {
    id: 6,
    name: 'Galaxy',
    subtitle: 'Past the last horizon',
    /** TODO: a `void` biome. The Galaxy has its own intro scene either way. */
    biome: 'desert',
    tint: { color: '#4c2f80', alpha: 0.45 },
    priceMul: 2.4,
    goldMul: 5,
    expMul: 4.5,
    /** The Galaxy is short and brutal: a corridor straight to the boss. */
    encounters: { total: 7, minEnemies: 5, minShops: 1, minInns: 1 },
    rarity: { common: 18, rare: 42, legendary: 40 },
    enemy: {
      lives: { 2: 30, 3: 34, 4: 24, 5: 12 },
      abilityChance: 0.6,
      abilities: ['bulletSteal', 'poison', 'dynamite', 'mindControl'],
      accuracy: 0.72,
      names: ['Star Reaver', 'Void Sheriff', 'Comet Rustler', 'The Unnamed'],
    },
    /** Two phases — see src/duel/duel-engine.js `phases`. */
    boss: {
      name: 'THE STRANGER',
      lives: 9,
      abilities: ['mindControl', 'dynamite', 'poison'],
      accuracy: 0.78,
      phases: [
        { name: 'The Stranger', lives: 9, accuracy: 0.78, abilities: ['poison', 'dynamite'] },
        {
          name: 'The Stranger · Unmasked',
          lives: 12,
          accuracy: 0.88,
          abilities: ['mindControl', 'dynamite', 'poison', 'bulletSteal'],
          /** Phase two starts with a bullet already chambered and fires faster. */
          startBullets: 2,
          abilityChanceMul: 1.6,
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
