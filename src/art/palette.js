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

  // The rock the sand came off: the mesas and buttes on the desert horizon.
  // Red-ochre rather than another step of brown, because a skyline drawn out
  // of the ground's own ramp is the same colour as the ground and the eye
  // reads the whole picture as one flat dune. Iron is what makes desert rock
  // red, and it is the one hue that can sit behind sand without arguing.
  mesaLight: '#c4794a',
  mesa: '#9a552f',
  mesaDark: '#6d371e',

  // --- Grass / prairie ----------------------------------------------------
  // A five-step green ramp, exactly parallel to the sand ramp above: the two
  // biomes are the same picture painted in two families, so anything authored
  // against sandLight..sandDeep has a green counterpart at the same value.
  grassLight: '#a9d95f',
  grass: '#79b544',
  grassMid: '#559133',
  grassDark: '#3a6d28',
  grassDeep: '#24491c',
  moss: '#4e8a3a',
  mossLight: '#7fb85a',

  // Turned earth: the trail worn through the grass, and what buildings stand on.
  soilLight: '#b98f5d',
  soil: '#8f6a3f',
  soilDark: '#5f4527',
  soilDeep: '#3f2d18',

  // The distant hills, drained towards the sky the further back they sit.
  hillHazeLight: '#b7cfb8',
  hillHaze: '#8fae97',
  hillHazeDark: '#6a8b7c',

  // Wildflowers. Three heads only — a meadow with a dozen flower colours in it
  // reads as confetti, not as a field.
  bloomPink: '#f08ab0',
  bloomBlue: '#8fb4ff',
  bloomCream: '#fdf3cf',

  // --- Snow / ice / spruce (Whitecrown Pass) ------------------------------
  // A five-step cold ramp, parallel to the sand and grass ones. It runs a lot
  // wider in value than either — snow in sun is the brightest thing the game
  // ever draws and snow in shadow is nearly blue-black — because that spread
  // is the only way a white landscape has any form in it at all.
  snowLight: '#ffffff',
  snow: '#e9f2fc',
  snowMid: '#c7d9ee',
  snowShade: '#9cb4d2',
  snowDeep: '#6c84a6',
  // Ice is not snow with the saturation up: it is the one thing up there you
  // can see *into*, so it keeps its own colder, greener ramp.
  iceLight: '#c2ecf7',
  ice: '#7ac8e2',
  iceDark: '#3f82a6',
  // Spruce. The grass greens are too warm to sit under snow — they go khaki
  // the moment the light drops — so the conifers get a blue-green of their own.
  pineLight: '#4e8763',
  pine: '#2d5c44',
  pineDeep: '#193a2c',

  // --- Bog (Blackwater Bayou) ---------------------------------------------
  // Standing water that has not moved in a hundred years. The lightest step is
  // the scum on top of it, not a highlight: black water has no highlight
  // except the sky lying on it, and that comes from the sky.
  bogLight: '#55705f',
  bog: '#2f4a45',
  bogDark: '#1b2f2e',
  bogDeep: '#0f1f1f',
  algae: '#86ab4e',
  lichen: '#a3b177',
  bogHaze: '#53706a',
  rot: '#6b5f43',

  // --- Brimstone (Brimstone Basin) ----------------------------------------
  // Molten rock, and the rock it broke out of. The char ramp is deliberately
  // violet-grey rather than neutral: basalt beside orange light goes blue, and
  // a neutral grey next to magma reads as dirty snow.
  magma: '#ff7f22',
  magmaDeep: '#c33a0d',
  emberGlow: '#ffbe52',
  charLight: '#584b53',
  char: '#3a3038',
  charDark: '#231d26',
  sulfur: '#d9c34b',
  sulfurLight: '#f4e281',

  // --- The hollow (Gallows Hollow) ----------------------------------------
  // The sixth world, and the only one whose ramp is a colour DRAINING rather
  // than a colour. Grey with the last of a green in it: dead grass, turned
  // earth that has been turned too often, and old timber gone silver.
  //
  // It sits deliberately between the bayou and the basin without touching
  // either. The bog is dark teal and WET; the char is violet and BURNT; this
  // is dry, pale and lightless, which is what a place looks like when nothing
  // has happened in it for a long time.
  pall: '#a7ac9c',
  pallMid: '#7d8375',
  gloam: '#5a6055',
  gloamDark: '#3b4039',
  gloamDeep: '#242822',
  // Grave timber: fence rail, coffin lid, gallows post. Warmer than the ground
  // so a stake standing in it reads as a made thing rather than as a shadow.
  gravewood: '#4b423a',
  gravewoodLight: '#6d6156',
  // THE ONE LIVE COLOUR IN THE WORLD, AND THE ONE IT DOES NOT HAVE
  // -------------------------------------------------------------------------
  // Corpse light: the green in a lantern nobody lit, in the eye sockets on the
  // road, in the gallows when it wakes. It is the ONLY saturated thing the
  // Hollow is allowed, and that is a rule with a reason — there is no red
  // anywhere in this world's art, in its props, in its riders or in its sky.
  // So when two red pixels open on the road (see src/explore/scare.js), they
  // are the first red the player has seen since they left the basin.
  corpseLight: '#b8f2c8',
  corpse: '#6bd6a4',
  corpseDeep: '#2f7a5c',

  // --- The void (the Galaxy) ----------------------------------------------
  // Broken violet stone lit by nothing in particular, and the cold aquamarine
  // that everything alive out here glows in. The two are opposites on the
  // wheel, which is what keeps a scene with no sun in it readable.
  voidRockLight: '#6b50a0',
  voidRock: '#493471',
  voidRockDark: '#2c1c4c',
  astralLight: '#a2f7ec',
  astral: '#4fcac6',
  astralDark: '#2a7f88',

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
