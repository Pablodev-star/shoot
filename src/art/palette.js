/**
 * SHOOT! — Master palette.
 *
 * Every sprite, UI accent and canvas scene in the game pulls its colors from
 * here so the whole product reads as one piece. Keep this file as the single
 * source of truth: if a color is not in this list, it should not appear on
 * screen.
 *
 * The palette is deliberately small (a "console-era" restricted palette) which
 * is what makes hand-drawn pixel art look cohesive.
 */

export const PALETTE = {
  // --- Neutrals / ink -----------------------------------------------------
  ink: '#1b1210',
  inkSoft: '#2e211c',
  shadow: '#0d0908',
  bone: '#f2e3c6',
  boneDark: '#d8c39c',
  grey: '#8a8079',
  greyDark: '#4d4642',

  // --- Sand / desert ------------------------------------------------------
  sandLight: '#f0d69a',
  sand: '#dcb46c',
  sandMid: '#c2914d',
  sandDark: '#9a6b34',
  sandDeep: '#6f4a24',

  // --- Wood / leather -----------------------------------------------------
  woodLight: '#a3703c',
  wood: '#7b4f27',
  woodDark: '#54331a',
  woodDeep: '#38210f',
  leather: '#8b5a2b',
  leatherDark: '#5c3a1a',

  // --- Reds (lives, blood, poncho) ---------------------------------------
  redLight: '#f0574f',
  red: '#c62f2a',
  redDark: '#8d1a18',
  redDeep: '#5a0f0e',

  // --- Greens (cactus, potion, poison) -----------------------------------
  greenLight: '#8fce6a',
  green: '#4f9a3c',
  greenDark: '#2f6127',
  poison: '#7ad46a',
  poisonDark: '#3f8f43',

  // --- Blues (sky, night, rare rarity) -----------------------------------
  skyDay: '#7fc7e8',
  skyDayHigh: '#4ea3d6',
  skyDusk: '#e08a4c',
  skyNight: '#1b2450',
  skyNightHigh: '#0d1231',
  blueLight: '#7fb8ff',
  blue: '#3a6fd8',
  blueDark: '#22407f',

  // --- Golds (coins, legendary, sun) -------------------------------------
  goldLight: '#ffe27a',
  gold: '#e8b12c',
  goldDark: '#a8760f',

  // --- Skin ---------------------------------------------------------------
  skin: '#e0a878',
  skinDark: '#b57a4d',

  // --- Horse --------------------------------------------------------------
  horseLight: '#a2703f',
  horse: '#7a4f2a',
  horseDark: '#52331a',
  mane: '#2f1d0e',

  // --- Misc / FX ----------------------------------------------------------
  white: '#ffffff',
  steel: '#b8bcc4',
  steelDark: '#6f757f',
  purple: '#8a5cd6',
  purpleDark: '#4c2f80',
  cosmic: '#2a1145',
  cosmicHigh: '#120626',
  star: '#fdf5d0',
};

/** Rarity → frame color. Used by item icons and shop cards alike. */
export const RARITY_COLORS = {
  common: PALETTE.grey,
  rare: PALETTE.blueLight,
  legendary: PALETTE.goldLight,
};

export const RARITY_ORDER = ['common', 'rare', 'legendary'];
