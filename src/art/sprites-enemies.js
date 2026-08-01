/**
 * SHOOT! — Enemy archetypes (Block 5a art).
 *
 * WHAT THIS FIXES
 * ---------------------------------------------------------------------------
 * Every enemy in the game used to be the player wearing a different colour of
 * poncho. Five colours, rolled at random, over one silhouette. So a "Snow
 * Blind" in the mountains, a "Swamp Preacher" in the bayou and a "Star Reaver"
 * past the last horizon were the same man, and the name over his head was the
 * only thing that had ever changed. A name that describes something the player
 * cannot see is not characterisation — it is a label on an empty box.
 *
 * An archetype is now a LOOK, and the name comes with it. `bonemarshal` is a
 * skull under a hat with a ribcage under a gun belt, and it is called the Bone
 * Marshal. `sombrero` has a brim that runs the full width of the sprite, and
 * it is called the Sombrero Outlaw. You can read the fight from the sprite,
 * and the name only confirms what you already saw.
 *
 * HOW ONE IS BUILT
 * ---------------------------------------------------------------------------
 * Three interchangeable pieces on the rig in src/art/sprites-character.js:
 *
 *   HEADS   11 rows — hat or hood or helm, and the face under it
 *   TORSOS   7 rows — what they are wearing from collar to belt
 *   LEGS     6 rows — trousers and boots, a skirt, or nothing at all
 *
 * plus a palette. Everything else — the walk, the four-frame draw, the recoil,
 * the hit stagger, the revolver and where it sits in the hand — comes from the
 * rig, so a new enemy is a head, a torso and eight colours, and it is animated
 * the moment it exists.
 *
 * THE COLOUR RULES ARE THE SAME AS EVERYTHING ELSE'S
 * ---------------------------------------------------------------------------
 * 1px ink outline, light from the top left, palette colours only. An enemy
 * that breaks those reads as a sprite from another game standing in this one.
 *
 * Key characters, so the parts below can be read:
 *   k K  ink, soft ink            h H  hat / hood, and its lit edge
 *   s d  skin, skin in shadow     p P q garment mid, dark, light
 *   w W  accent (cloth, bone)     b B  trousers, boot highlight
 *   t T  belt leather             l    buckle
 *   n N  hair, straw              x X  metal, dark metal
 *   z    something that glows on its own
 */

import { PALETTE } from './palette.js';
import { composeFighter } from './sprites-character.js';

// ---------------------------------------------------------------------------
// HEADS — 11 rows. Rows 1-6 are the hat, 7-9 the face, 10 the collar.
// ---------------------------------------------------------------------------

const HEADS = {
  /** The standard hat: a crown, a brim, and a kerchief under the jaw. */
  hat: [
    '................',
    '.....kkkkk......',
    '....kHHHHHk.....',
    '....khhhhhk.....',
    '..kkkhhhhhkkkk..',
    '.kHHHHHHHHHHHk..',
    '.kkkkkkkkkkkkk..',
    '....ksssssk.....',
    '....ksssksk.....',
    '....kdssssk.....',
    '...kpqqqqqqpk...',
  ],

  /** The same hat with the lower face covered. Reads as trouble at a glance. */
  masked: [
    '................',
    '.....kkkkk......',
    '....kHHHHHk.....',
    '....khhhhhk.....',
    '..kkkhhhhhkkkk..',
    '.kHHHHHHHHHHHk..',
    '.kkkkkkkkkkkkk..',
    '....ksssssk.....',
    '....ksssksk.....',
    '...kwwwwwwwk....',
    '...kwWWWWWWwk...',
  ],

  /** A brim that runs the full width of the sprite. Nothing else does. */
  sombrero: [
    '................',
    '.....kkkkk......',
    '....khhhhhk.....',
    '....khHHHhk.....',
    'kkkkkhhhhhkkkkk.',
    'kHHHHHHHHHHHHHk.',
    'kkkkkkkkkkkkkkk.',
    '....ksssssk.....',
    '....ksssksk.....',
    '....kdssssk.....',
    '...kpqqqqqqpk...',
  ],

  /** Straw: a shallow crown and a brim that has been coming apart for years. */
  straw: [
    '................',
    '................',
    '.....kkkkk......',
    '....kHHHHHk.....',
    '..kkkHHHHHkkkk..',
    '.kHHHHHHHHHHHk..',
    '.kkHkkHkkHkkHk..',
    '....ksssssk.....',
    '....ksssksk.....',
    '....kdssssk.....',
    '...kpqqqqqqpk...',
  ],

  /** A stovepipe. Undertakers, preachers, and anyone who wants to look like one. */
  topHat: [
    '....kkkkkk......',
    '....khhhhk......',
    '....khhhhk......',
    '....kHHHHk......',
    '..kkkhhhhkkkk...',
    '..khhhhhhhhhk...',
    '..kkkkkkkkkkk...',
    '....ksssssk.....',
    '....ksssksk.....',
    '....kdssssk.....',
    '...kwwwWWwwwk...',
  ],

  /** A bowler, and a string tie under it. */
  bowler: [
    '................',
    '................',
    '.....kkkkk......',
    '....khhhhhk.....',
    '...khHHHHHhk....',
    '..kkhhhhhhhkk...',
    '..kkkkkkkkkkk...',
    '....ksssssk.....',
    '....ksssksk.....',
    '....kdssssk.....',
    '...kwwkWkwwwk...',
  ],

  /** No hat at all. Whoever this is has already lost it. */
  bare: [
    '................',
    '................',
    '.....kkkkk......',
    '....knnnnnk.....',
    '....knnnnnk.....',
    '...knnnnnnnk....',
    '...kkkkkkkkk....',
    '....ksssssk.....',
    '....ksssksk.....',
    '....kdssssk.....',
    '...kpqqqqqqpk...',
  ],

  /** A fur hood closed around the face, for weather that kills people. */
  hood: [
    '................',
    '.....kkkkk......',
    '....khhhhhk.....',
    '...khhhhhhhk....',
    '..khhkkkkkhhk...',
    '..khhksssskhk...',
    '..khhksssskhk...',
    '..khhkdssskhk...',
    '..khhkkkkkhhk...',
    '...khhhhhhhk....',
    '...kwwwwwwwwk...',
  ],

  /** Snow goggles over a hood: two lenses and no eyes to read. */
  goggles: [
    '................',
    '.....kkkkk......',
    '....khhhhhk.....',
    '...khhhhhhhk....',
    '..kkhhhhhhhkk...',
    '..khhhhhhhhhk...',
    '..kkkkkkkkkkk...',
    '...kxxxxxxxk....',
    '...kXzXkXzXk....',
    '....kdssssk.....',
    '...kwwwwwwwwk...',
  ],

  /** A skull. Nothing on it, nothing in it. */
  skull: [
    '................',
    '................',
    '.....kkkkk......',
    '....kwwwwwk.....',
    '...kwwwwwwwk....',
    '...kwKKwKKwk....',
    '...kwKKwKKwk....',
    '....kwwKwwk.....',
    '....kwwwwwk.....',
    '....kKwKwKk.....',
    '.....kwwwk......',
  ],

  /** A skull that kept the hat. Somehow worse. */
  skullHat: [
    '................',
    '.....kkkkk......',
    '....kHHHHHk.....',
    '....khhhhhk.....',
    '..kkkhhhhhkkkk..',
    '.kHHHHHHHHHHHk..',
    '.kkkkkkkkkkkkk..',
    '....kwwwwwk.....',
    '....kKwwKwk.....',
    '....kwKKKwk.....',
    '...kpqqqqqqpk...',
  ],

  /** A burlap sack, stitched shut, with straw coming out of the seams. */
  sack: [
    '....n....n......',
    '...knk..knk.....',
    '....kwwwwwk.....',
    '...kwwwwwwwk....',
    '...kwKwwKwwk....',
    '...kwwwwwwwk....',
    '...kwKKKKKwk....',
    '...kwwwwwwwk....',
    '....kwwwwwk.....',
    '.....kkkkk......',
    '...knnnnnnnnk...',
  ],

  /** A hood with nothing inside it but two lights. */
  shade: [
    '................',
    '.....kkkkk......',
    '....khhhhhk.....',
    '...khhhhhhhk....',
    '...khKKKKKhk....',
    '...khKzKzKhk....',
    '...khKKKKKhk....',
    '...khhKKKhhk....',
    '....khhhhhk.....',
    '...khhhhhhhk....',
    '..khhhhhhhhhk...',
  ],

  /** A sealed helmet with the sky reflected in the visor. */
  helm: [
    '................',
    '.....kkkkk......',
    '....kxxxxxk.....',
    '...kxXXXXXxk....',
    '...kxBBBBBxk....',
    '...kxBzBBBxk....',
    '...kxBBBBzxk....',
    '...kxXXXXXxk....',
    '....kxxxxxk.....',
    '.....kkkkk......',
    '...kxxxxxxxxk...',
  ],

  /** A riveted furnace helm with a slit that is lit from the inside. */
  ironMask: [
    '................',
    '....kkkkkkk.....',
    '...kxxxxxxxk....',
    '...kxXxxxXxk....',
    '...kxxxxxxxk....',
    '...kzzzkzzzk....',
    '...kxxxxxxxk....',
    '...kxXxxxXxk....',
    '...kxxxxxxxk....',
    '....kxxxxxk.....',
    '...kxxxxxxxxk...',
  ],

  /** A wide hat with mourning crape hanging off it. */
  veil: [
    '................',
    '....kkkkkkk.....',
    '...khhhhhhhk....',
    '..kkhhhhhhhkk...',
    '.khhhhhhhhhhhk..',
    '.kkkkkkkkkkkkk..',
    '...kKKKKKKKk....',
    '...kKsKKsKKk....',
    '...kKKKKKKKk....',
    '...kKKKKKKKk....',
    '..kKKKKKKKKKk...',
  ],

  /** Horns through the crown of a hat, and eyes with something behind them. */
  horned: [
    '..k.........k...',
    '..khk.....khk...',
    '...khkkkkkhk....',
    '....khhhhhk.....',
    '..kkkhhhhhkkkk..',
    '.kHHHHHHHHHHHk..',
    '.kkkkkkkkkkkkk..',
    '....kdsssdk.....',
    '....kzsskzk.....',
    '....kdssssk.....',
    '...kpqqqqqqpk...',
  ],
};

// ---------------------------------------------------------------------------
// TORSOS — 7 rows. Row 6 is the belt line; the legs start immediately under it.
// ---------------------------------------------------------------------------

const TORSOS = {
  /** The serape the player wears. */
  serape: [
    '...kqqqqqqqqk...',
    '..kqppppppppqk..',
    '..kpwwwwwwwwpk..',
    '..kpPPPPPPPPpk..',
    '..kspPPPPPPpsk..',
    '...kPPPPPPPPk...',
    '...kTttllttTk...',
  ],

  /** A frock coat: lapels at the collar, and the opening running down. */
  coat: [
    '...kqqqqqqqqk...',
    '..kqpwppppwpqk..',
    '..kppwwPPwwppk..',
    '..kpPPwPPwPPpk..',
    '..kspPPwwPPpsk..',
    '...kPPPwwPPPk...',
    '...kTttllttTk...',
  ],

  /** Shirt under an open vest, with a star pinned to it. */
  vest: [
    '...kqqqqqqqqk...',
    '..kqpwwwwwwpqk..',
    '..kplwwwwwwPpk..',
    '..kpPwwwwwwPpk..',
    '..kspPwwwwPpsk..',
    '...kPPwwwwPPk...',
    '...kTttllttTk...',
  ],

  /** Wire wound round the chest, over the shirt. */
  barbed: [
    '...kqqqqqqqqk...',
    '..kqpxppxppxqk..',
    '..kpxwxwxwxwpk..',
    '..kpPxPPxPPxpk..',
    '..kspxPPPPxpsk..',
    '...kPxPPPPxPk...',
    '...kTttllttTk...',
  ],

  /** A ribcage: bars of bone with the dark of the chest cavity between them. */
  ribs: [
    '...kwwwwwwwwk...',
    '..kwKKKKKKKKwk..',
    '..kwwwwwwwwwwk..',
    '..kwKKKKKKKKwk..',
    '..kswwwwwwwwsk..',
    '...kKKKKKKKKk...',
    '...kTttllttTk...',
  ],

  /** Heavy pelts over the shoulders, the body of the coat under them. */
  furCoat: [
    '...khhhhhhhhk...',
    '..khHHHHHHHHhk..',
    '..khhpppppphhk..',
    '..khhpPPPPphhk..',
    '..kshpPPPPphsk..',
    '...khpPPPPphk...',
    '...kTttllttTk...',
  ],

  /** Sacking, tied at the waist, with straw working its way out of it. */
  burlap: [
    '...kqqqqqqqqk...',
    '..nqppppppppqn..',
    '..kpwwwwwwwwpk..',
    '..kpPPnnPPPPpk..',
    '..nspPPPPPPpsn..',
    '...kPPPPPPPPk...',
    '...knnnnnnnnk...',
  ],

  /** Rags, and the wind through them. */
  tatters: [
    '...kqqqqqqqqk...',
    '..kqppppppppqk..',
    '..kpPPPPPPPPpk..',
    '..kpPPPPPPPPpk..',
    '..kspPPPPPPpsk..',
    '..kPkPPkPPkPPk..',
    '..kPk.kPk.kPk...',
  ],

  /** A sealed suit with lamps down the chest. */
  suit: [
    '...kxxxxxxxxk...',
    '..kxXXXXXXXXxk..',
    '..kxXzXXXXzXxk..',
    '..kxXXXXXXXXxk..',
    '..ksxXXXXXXxsk..',
    '...kxXXXXXXxk...',
    '...kTttllttTk...',
  ],

  /** Mourning black, and the top of a skirt that goes all the way down. */
  dress: [
    '...kqqqqqqqqk...',
    '..kqppppppppqk..',
    '..kpPwwwwwwPpk..',
    '..kpPPPPPPPPpk..',
    '..kspPPPPPPpsk..',
    '..kPPPPPPPPPPk..',
    '.kPPPPPPPPPPPPk.',
  ],
};

// ---------------------------------------------------------------------------
// LEGS
//
// The rig's own legs are trousers and boots. Two archetypes do not have those:
// a woman in mourning has a skirt, and a shade has nothing below the hem but
// the last of itself trailing off. Both keep the four-pose cycle so they walk
// on the same beat as everyone else.
// ---------------------------------------------------------------------------

/** Skirt: the hem holds its shape and the boots move underneath it. */
function skirtLegs(boots) {
  return {
    stand: ['.kPPPPPPPPPPPPk.', 'kPPPPPPPPPPPPPPk', 'kkkkkkkkkkkkkkkk', ...boots.stand],
    contactA: ['.kPPPPPPPPPPPPk.', 'kPPPPPPPPPPPPPPk', 'kkkkkkkkkkkkkkkk', ...boots.contactA],
    passingA: ['.kPPPPPPPPPPPPk.', 'kPPPPPPPPPPPPPPk', 'kkkkkkkkkkkkkkkk', ...boots.passingA],
    contactB: ['.kPPPPPPPPPPPPk.', 'kPPPPPPPPPPPPPPk', 'kkkkkkkkkkkkkkkk', ...boots.contactB],
    passingB: ['.kPPPPPPPPPPPPk.', 'kPPPPPPPPPPPPPPk', 'kkkkkkkkkkkkkkkk', ...boots.passingB],
  };
}

/**
 * Three rows, so the soles land on the last row of the sprite exactly like
 * everyone else's. A fighter whose art stops one row short stands one pixel
 * off the road, and at duel scale that is a woman hovering.
 */
const SKIRT_BOOTS = {
  stand: ['..kBBk.kBBk.....', '..kBBk.kBBk.....', '..kkkk.kkkk.....'],
  contactA: ['..kBBk..kBBk....', '.kBBk...kBBk....', '.kkkk...kkkk....'],
  passingA: ['..kBBk.kBBk.....', '..kBBkkBBk......', '..kkkkkkkk......'],
  contactB: ['.kBBk....kBBk...', 'kBBk.....kBBk...', 'kkkk.....kkkk...'],
  passingB: ['...kBBkBBk......', '...kBBkBBk......', '...kkkkkkk......'],
};

const LEGS_SKIRT = skirtLegs(SKIRT_BOOTS);

/** Nothing solid: the hem frays out and the last of it trails on the ground. */
const LEGS_TRAIL = {
  stand: [
    '..kPkPPPPkPPk...',
    '..kPk.kPk.kPk...',
    '...k..kPk..k....',
    '......kPk.......',
    '.......k........',
    '................',
  ],
  contactA: [
    '.kPPkPPPPkPk....',
    '.kPk..kPk.kPk...',
    '..k...kPk..k....',
    '.....kPk........',
    '.....k..........',
    '................',
  ],
  passingA: [
    '..kPkPPPPkPPk...',
    '...kPkkPkkPk....',
    '....k.kPk.k.....',
    '......kPk.......',
    '.......k........',
    '................',
  ],
  contactB: [
    '..kPkPPPPkPPk...',
    '..kPk.kPk..kPk..',
    '...k..kPk...k...',
    '.......kPk......',
    '........k.......',
    '................',
  ],
  passingB: [
    '..kPPkPPPPkPk...',
    '...kPkkPkkPk....',
    '....k.kPk.k.....',
    '.....kPk........',
    '.....k..........',
    '................',
  ],
};

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const SKIN = { s: PALETTE.skin, d: PALETTE.skinDark };
/** For anything that is no longer using its skin. */
const BONES = { s: PALETTE.bone, d: PALETTE.boneDark };

/**
 * One archetype's colours. Everything not named here falls through to the
 * rig's own key, so a garment only has to state what makes it different.
 *
 * BLACK IS NOT A COLOUR YOU CAN DRESS A 16px MAN IN
 * ---------------------------------------------------------------------------
 * `clothDark` is the biggest area on most torsos, and the outline around all
 * of it is already ink. Set both to ink and the fighter is a silhouette with a
 * face on it — the undertaker and the widow were exactly that on the first
 * pass. Everyone who wears black here wears the two greys above ink instead,
 * and lets the outline be the black.
 */
function palette({ hat, hatLit, cloth, clothDark, clothLit, accent, accentDark, shade, trouser, boot, hair, metal, metalDark, glow, belt, beltDark, skin = SKIN }) {
  const out = { ...skin };
  if (shade) out.K = shade;
  if (hat) out.h = hat;
  if (hatLit) out.H = hatLit;
  if (cloth) out.p = cloth;
  if (clothDark) out.P = clothDark;
  if (clothLit) out.q = clothLit;
  if (accent) out.w = accent;
  if (accentDark) out.W = accentDark;
  if (trouser) out.b = trouser;
  if (boot) out.B = boot;
  if (hair) out.n = hair;
  if (metal) out.x = metal;
  if (metalDark) out.X = metalDark;
  if (glow) out.z = glow;
  if (belt) out.t = belt;
  if (beltDark) out.T = beltDark;
  return out;
}

// ---------------------------------------------------------------------------
// THE ROSTER
//
// `look` is the one-line description the sprite is supposed to deliver. If a
// sprite and its `look` ever disagree, the sprite is wrong: the names below
// were written from the art, and they have to keep matching it.
// ---------------------------------------------------------------------------

/** @type {Record<string, {look: string, names: string[], head: string, torso: string, key: object, legs?: object, gun?: string, holster?: string[]|null}>} */
export const ARCHETYPES = {
  // --- the dust: ordinary men, in the clothes of the country ---------------
  drifter: {
    look: 'A sun-bleached hat and a dust-coloured serape',
    names: ['Dust Drifter', 'Trail Drifter', 'Sun-Bleached Drifter'],
    head: 'hat',
    torso: 'serape',
    key: palette({
      hat: PALETTE.sandDark, hatLit: PALETTE.sand,
      cloth: PALETTE.sandMid, clothDark: PALETTE.sandDeep, clothLit: PALETTE.sandLight,
      accent: PALETTE.boneDark, trouser: PALETTE.woodDark, boot: PALETTE.wood,
    }),
  },

  brawler: {
    look: 'Bare-headed, black hair, a red shirt under an open vest',
    names: ['Bar Brawler', 'Broken-Nose Brawler', 'Bare-Head Brawler'],
    head: 'bare',
    torso: 'vest',
    key: palette({
      cloth: PALETTE.leather, clothDark: PALETTE.leatherDark, clothLit: PALETTE.woodLight,
      accent: PALETTE.red, accentDark: PALETTE.redDark,
      hair: PALETTE.woodDark, trouser: PALETTE.greyDark, boot: PALETTE.grey,
    }),
  },

  bandana: {
    look: 'A hat with a red bandana pulled up over the face',
    names: ['Bandana Bandit', 'Red-Mask Cattle Thief', 'Kerchief Rider'],
    head: 'masked',
    torso: 'serape',
    key: palette({
      hat: PALETTE.woodDeep, hatLit: PALETTE.woodDark,
      cloth: PALETTE.steelDark, clothDark: PALETTE.greyDark, clothLit: PALETTE.steel,
      accent: PALETTE.red, accentDark: PALETTE.redDark,
      trouser: PALETTE.woodDeep, boot: PALETTE.woodDark,
    }),
  },

  strawhat: {
    look: 'A frayed straw hat over sacking',
    names: ['Straw Hat Rustler', 'Frayed-Brim Tramp', 'Straw Hat Thief'],
    head: 'straw',
    torso: 'burlap',
    key: palette({
      hat: PALETTE.sand, hatLit: PALETTE.sandLight,
      cloth: PALETTE.boneDark, clothDark: PALETTE.sandDark, clothLit: PALETTE.bone,
      accent: PALETTE.sandMid, hair: PALETTE.gold,
      trouser: PALETTE.soilDark, boot: PALETTE.soil,
    }),
  },

  // --- the prairie ---------------------------------------------------------
  sombrero: {
    look: 'A brim wider than the man, and a green serape',
    names: ['Sombrero Outlaw', 'Wide-Brim Rustler', 'Broad-Hat Bandit'],
    head: 'sombrero',
    torso: 'serape',
    key: palette({
      hat: PALETTE.grassDeep, hatLit: PALETTE.grassDark,
      cloth: PALETTE.moss, clothDark: PALETTE.grassDeep, clothLit: PALETTE.grassLight,
      accent: PALETTE.bone, trouser: PALETTE.soilDark, boot: PALETTE.soil,
    }),
  },

  scarecrow: {
    look: 'A stitched sack for a head and straw coming out of the seams',
    names: ['Field Scarecrow', 'Stitched Scarecrow', 'Crow-Chaser'],
    head: 'sack',
    torso: 'burlap',
    key: palette({
      cloth: PALETTE.soil, clothDark: PALETTE.soilDeep, clothLit: PALETTE.soilLight,
      accent: PALETTE.boneDark, accentDark: PALETTE.sandDark,
      hair: PALETTE.gold, trouser: PALETTE.soilDeep, boot: PALETTE.soilDark,
      skin: BONES,
    }),
  },

  gambler: {
    look: 'A bowler, a string tie and a good coat',
    names: ['Riverboat Gambler', 'Bowler-Hat Card Sharp', 'Table Cheat'],
    head: 'bowler',
    torso: 'coat',
    key: palette({
      hat: PALETTE.inkSoft, hatLit: PALETTE.greyDark,
      cloth: PALETTE.blue, clothDark: PALETTE.blueDark, clothLit: PALETTE.blueLight,
      accent: PALETTE.bone, accentDark: PALETTE.boneDark,
      trouser: PALETTE.inkSoft, boot: PALETTE.greyDark, belt: PALETTE.gold,
    }),
    gun: 'brass',
  },

  // --- the pass ------------------------------------------------------------
  goggles: {
    look: 'Snow goggles and a hood, with no eyes to read',
    names: ['Snow-Blind Sharpshooter', 'Goggle-Eyed Trapper', 'Glare Hunter'],
    head: 'goggles',
    torso: 'furCoat',
    key: palette({
      hat: PALETTE.greyDark, hatLit: PALETTE.grey,
      cloth: PALETTE.steelDark, clothDark: PALETTE.greyDark, clothLit: PALETTE.steel,
      accent: PALETTE.bone, metal: PALETTE.steel, metalDark: PALETTE.steelDark,
      glow: PALETTE.blueLight, trouser: PALETTE.greyDark, boot: PALETTE.grey,
    }),
  },

  furhood: {
    look: 'A fur hood closed round the face and pelts on the shoulders',
    names: ['Fur-Hood Trapper', 'Pelt Hunter', 'Wolfskin Rider'],
    head: 'hood',
    torso: 'furCoat',
    key: palette({
      hat: PALETTE.woodDark, hatLit: PALETTE.woodLight,
      cloth: PALETTE.leatherDark, clothDark: PALETTE.woodDark, clothLit: PALETTE.leather,
      accent: PALETTE.boneDark, trouser: PALETTE.woodDeep, boot: PALETTE.woodDark,
    }),
  },

  bonemarshal: {
    look: 'A skull under a hat, and a ribcage over the gun belt',
    names: ['Bone Marshal', 'Rattlebone Gunhand', 'Hat-and-Skull'],
    head: 'skullHat',
    torso: 'ribs',
    key: palette({
      hat: PALETTE.woodDeep, hatLit: PALETTE.woodDark,
      cloth: PALETTE.bone, clothDark: PALETTE.boneDark, clothLit: PALETTE.white,
      accent: PALETTE.bone, trouser: PALETTE.greyDark, boot: PALETTE.grey,
      skin: BONES,
    }),
    gun: 'bone',
  },

  // --- the bayou -----------------------------------------------------------
  preacher: {
    look: 'A stovepipe hat, a white collar and a long black coat',
    names: ['Swamp Preacher', 'Black-Coat Preacher', 'Stovepipe Sermoner'],
    head: 'topHat',
    torso: 'coat',
    key: palette({
      hat: PALETTE.inkSoft, hatLit: PALETTE.greyDark,
      cloth: PALETTE.greyDark, clothDark: PALETTE.inkSoft, clothLit: PALETTE.grey,
      accent: PALETTE.bone, accentDark: PALETTE.boneDark,
      trouser: PALETTE.inkSoft, boot: PALETTE.greyDark,
    }),
  },

  wraith: {
    look: 'A hood with two lights in it and nothing below the hem',
    names: ['Reed Wraith', 'Marsh Shade', 'The Thing in the Reeds'],
    head: 'shade',
    torso: 'tatters',
    legs: LEGS_TRAIL,
    holster: null,
    key: palette({
      hat: PALETTE.grassDeep, hatLit: PALETTE.grassDark,
      cloth: PALETTE.moss, clothDark: PALETTE.grassDeep, clothLit: PALETTE.mossLight,
      accent: PALETTE.poison, glow: PALETTE.poison,
      trouser: PALETTE.grassDeep, boot: PALETTE.grassDark,
    }),
  },

  skeleton: {
    look: 'A bare skull and a ribcage, and nothing else left',
    names: ['Rattlebone Kid', 'Dry Bones Gunhand', 'Bare-Skull Drifter'],
    head: 'skull',
    torso: 'ribs',
    key: palette({
      cloth: PALETTE.bone, clothDark: PALETTE.boneDark, clothLit: PALETTE.white,
      accent: PALETTE.bone, trouser: PALETTE.greyDark, boot: PALETTE.grey,
      skin: BONES,
    }),
    gun: 'bone',
  },

  // --- the basin -----------------------------------------------------------
  emberrider: {
    look: 'A coat with the fire showing through the seams',
    names: ['Ember Rider', 'Cinder Rider', 'Smouldering Gunhand'],
    head: 'hat',
    torso: 'coat',
    key: palette({
      hat: PALETTE.inkSoft, hatLit: PALETTE.woodDeep,
      cloth: PALETTE.red, clothDark: PALETTE.redDeep, clothLit: PALETTE.redLight,
      accent: PALETTE.goldLight, accentDark: PALETTE.gold,
      glow: PALETTE.goldLight, trouser: PALETTE.inkSoft, boot: PALETTE.redDark,
      skin: { s: PALETTE.sandDark, d: PALETTE.woodDeep },
    }),
  },

  ashwidow: {
    look: 'Mourning black, a wide hat and crape over the face',
    names: ['Ash Widow', 'Veiled Widow', 'Widow in Crape'],
    head: 'veil',
    torso: 'dress',
    legs: LEGS_SKIRT,
    key: palette({
      hat: PALETTE.inkSoft, hatLit: PALETTE.greyDark,
      cloth: PALETTE.greyDark, clothDark: PALETTE.inkSoft, clothLit: PALETTE.grey,
      accent: PALETTE.grey, shade: PALETTE.greyDark,
      trouser: PALETTE.inkSoft, boot: PALETTE.greyDark,
    }),
  },

  ironkiln: {
    look: 'A riveted furnace helm with a slit lit from the inside',
    names: ['Iron Kiln', 'Furnace-Masked Smelter', 'The Riveted Man'],
    head: 'ironMask',
    torso: 'suit',
    key: palette({
      cloth: PALETTE.steelDark, clothDark: PALETTE.greyDark, clothLit: PALETTE.steel,
      accent: PALETTE.goldDark,
      metal: PALETTE.grey, metalDark: PALETTE.greyDark, glow: PALETTE.goldLight,
      trouser: PALETTE.greyDark, boot: PALETTE.grey,
      skin: { s: PALETTE.grey, d: PALETTE.greyDark },
    }),
  },

  horned: {
    look: 'Horns through the crown of the hat and lit eyes under it',
    names: ['Horned Fiend', 'Brimstone Devil', 'The Horned Gun'],
    head: 'horned',
    torso: 'serape',
    key: palette({
      hat: PALETTE.redDeep, hatLit: PALETTE.redDark,
      cloth: PALETTE.red, clothDark: PALETTE.redDeep, clothLit: PALETTE.redLight,
      accent: PALETTE.goldDark, glow: PALETTE.goldLight,
      trouser: PALETTE.ink, boot: PALETTE.redDark,
      skin: { s: PALETTE.sandDark, d: PALETTE.woodDeep },
    }),
  },

  // --- past the last horizon ------------------------------------------------
  starhelm: {
    look: 'A sealed helmet with stars caught in the visor',
    names: ['Star Reaver', 'Visored Void Rider', 'Helmed Reaver'],
    head: 'helm',
    torso: 'suit',
    key: palette({
      cloth: PALETTE.purpleDark, clothDark: PALETTE.cosmic, clothLit: PALETTE.purple,
      accent: PALETTE.star,
      metal: PALETTE.steel, metalDark: PALETTE.steelDark, glow: PALETTE.star,
      trouser: PALETTE.cosmic, boot: PALETTE.purpleDark,
    }),
    gun: 'void',
  },

  voidsheriff: {
    look: 'A lawman’s star, on a coat the colour of deep space',
    names: ['Void Sheriff', 'Cosmic Marshal', 'Star-Badge Lawman'],
    head: 'hat',
    torso: 'vest',
    key: palette({
      hat: PALETTE.cosmic, hatLit: PALETTE.purpleDark,
      cloth: PALETTE.purpleDark, clothDark: PALETTE.cosmic, clothLit: PALETTE.purple,
      accent: PALETTE.star, accentDark: PALETTE.boneDark,
      trouser: PALETTE.cosmic, boot: PALETTE.purpleDark,
      skin: { s: PALETTE.steel, d: PALETTE.steelDark },
    }),
    gun: 'void',
  },

  nameless: {
    look: 'A cloak with two cold lights where a face should be',
    names: ['The Unnamed', 'Nameless Shade', 'The Quiet One'],
    head: 'shade',
    torso: 'tatters',
    legs: LEGS_TRAIL,
    holster: null,
    key: palette({
      hat: PALETTE.cosmic, hatLit: PALETTE.purpleDark,
      cloth: PALETTE.purpleDark, clothDark: PALETTE.cosmic, clothLit: PALETTE.purple,
      accent: PALETTE.star, glow: PALETTE.star, shade: PALETTE.cosmicHigh,
      trouser: PALETTE.cosmic, boot: PALETTE.purpleDark,
    }),
    gun: 'void',
  },

  // --- bosses ---------------------------------------------------------------
  // One look each, so a boss is recognisable from the far side of the road.
  bossJed: {
    look: 'The widest brim on the road, over a blood-red serape',
    names: ['Big Jed'],
    head: 'sombrero',
    torso: 'serape',
    key: palette({
      hat: PALETTE.woodDeep, hatLit: PALETTE.woodDark,
      cloth: PALETTE.redDark, clothDark: PALETTE.redDeep, clothLit: PALETTE.red,
      accent: PALETTE.goldLight, trouser: PALETTE.woodDeep, boot: PALETTE.wood,
      belt: PALETTE.gold, beltDark: PALETTE.goldDark,
    }),
    gun: 'brass',
  },

  bossBarbwire: {
    look: 'Bare-headed, with fence wire wound round his chest',
    names: ['Barbwire Bill'],
    head: 'bare',
    torso: 'barbed',
    key: palette({
      cloth: PALETTE.moss, clothDark: PALETTE.grassDeep, clothLit: PALETTE.grassLight,
      accent: PALETTE.boneDark, metal: PALETTE.steel,
      hair: PALETTE.woodDeep, trouser: PALETTE.soilDeep, boot: PALETTE.soilDark,
    }),
  },

  bossWhiteout: {
    look: 'White fur and mirrored goggles, in weather nobody else survives',
    names: ['Whiteout Kate'],
    head: 'goggles',
    torso: 'furCoat',
    key: palette({
      hat: PALETTE.bone, hatLit: PALETTE.white,
      cloth: PALETTE.boneDark, clothDark: PALETTE.steelDark, clothLit: PALETTE.white,
      accent: PALETTE.blueLight, metal: PALETTE.steel, metalDark: PALETTE.steelDark,
      glow: PALETTE.white, trouser: PALETTE.steelDark, boot: PALETTE.steel,
    }),
  },

  bossSable: {
    look: 'A colonel’s black coat and a stovepipe hat, gold at the collar',
    names: ['Colonel Sable'],
    head: 'topHat',
    torso: 'coat',
    key: palette({
      hat: PALETTE.inkSoft, hatLit: PALETTE.grey,
      cloth: PALETTE.greyDark, clothDark: PALETTE.inkSoft, clothLit: PALETTE.grey,
      accent: PALETTE.goldLight, accentDark: PALETTE.gold,
      trouser: PALETTE.inkSoft, boot: PALETTE.greyDark,
      belt: PALETTE.gold, beltDark: PALETTE.goldDark,
    }),
    gun: 'brass',
  },

  bossScratch: {
    look: 'Horns, a burning coat and eyes with the fire behind them',
    names: ['Old Scratch'],
    head: 'horned',
    torso: 'coat',
    key: palette({
      hat: PALETTE.inkSoft, hatLit: PALETTE.redDark,
      cloth: PALETTE.redDark, clothDark: PALETTE.redDeep, clothLit: PALETTE.redLight,
      accent: PALETTE.goldLight, accentDark: PALETTE.gold,
      glow: PALETTE.goldLight, trouser: PALETTE.inkSoft, boot: PALETTE.redDark,
      skin: { s: PALETTE.redDark, d: PALETTE.redDeep },
    }),
  },

  bossStranger: {
    look: 'A cloak, and two cold lights where the face is',
    names: ['The Stranger'],
    head: 'shade',
    torso: 'tatters',
    legs: LEGS_TRAIL,
    holster: null,
    key: palette({
      hat: PALETTE.cosmic, hatLit: PALETTE.purpleDark,
      cloth: PALETTE.purpleDark, clothDark: PALETTE.cosmic, clothLit: PALETTE.purple,
      accent: PALETTE.star, glow: PALETTE.star, shade: PALETTE.cosmicHigh,
      trouser: PALETTE.cosmic, boot: PALETTE.purpleDark,
    }),
    gun: 'void',
  },

  bossStrangerUnmasked: {
    look: 'The cloak gone: a skull lit from inside, in a starlit coat',
    names: ['The Stranger · Unmasked'],
    head: 'skull',
    torso: 'ribs',
    key: palette({
      cloth: PALETTE.star, clothDark: PALETTE.purple, clothLit: PALETTE.white,
      accent: PALETTE.star, glow: PALETTE.star,
      trouser: PALETTE.purpleDark, boot: PALETTE.purple,
      belt: PALETTE.purple, beltDark: PALETTE.cosmic,
      skin: { s: PALETTE.star, d: PALETTE.purple },
    }),
    gun: 'void',
  },
};

const cache = new Map();

/**
 * Bake (once) and return an archetype's whole animation set.
 * Unknown ids fall back to the drifter rather than crashing a duel.
 */
export function getEnemySprites(id) {
  const key = ARCHETYPES[id] ? id : 'drifter';
  if (!cache.has(key)) {
    const a = ARCHETYPES[key];
    cache.set(
      key,
      composeFighter({
        head: HEADS[a.head],
        torso: TORSOS[a.torso],
        legs: a.legs,
        holster: a.holster,
        key: a.key,
        gun: a.gun,
      }),
    );
  }
  return cache.get(key);
}

/** Every name an archetype can go by. All of them describe the same sprite. */
export function archetypeNames(id) {
  return (ARCHETYPES[id] || ARCHETYPES.drifter).names;
}

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);
