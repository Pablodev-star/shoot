/**
 * SHOOT! — Item & UI icons (Block 2c).
 *
 * Every icon is authored on the SAME 16 x 16 canvas with the same lighting
 * direction (top-left) and the same 1px ink outline, so a grid of them reads as
 * one set. Rarity frames are 20 x 20 and drawn *behind* the icon with a 2px
 * inset, giving the icon a 2px border of rarity color.
 *
 * Icon list: bandage, poison, dynamite, potion, vest, diadem (anti-effect),
 * map, bullet, life (red diamond), coin, carrot, apple, horse token, skull
 * (enemy marker), bed (inn), shop tag, hunger, and the two duel abilities that
 * are not also items — bullet steal and mind control. The worlds' own themed
 * abilities are drawn in src/art/sprites-abilities.js and merged in here, so
 * there is one lookup and one cache for every icon in the game.
 *
 * EVERY EFFECT IN THE GAME HAS A PICTURE
 * ---------------------------------------------------------------------------
 * That last pair is why: an enemy's abilities used to be listed as words under
 * their feet, because two of the four had no icon to show. They do now, so the
 * duel screen shows all four the same way it shows everything else — see
 * EFFECT_ICONS in src/duel/duel-screen.js.
 */

import { PALETTE, RARITY_COLORS } from './palette.js';
import { bake, makeCanvas } from './pixel.js';
import { ABILITY_ICONS, ABILITY_KEY } from './sprites-abilities.js';

export const ICON_SIZE = 16;
export const FRAME_SIZE = 20;

const BASE_KEY = {
  '.': null,
  k: PALETTE.ink,
  K: PALETTE.inkSoft,
  w: PALETTE.bone,
  W: PALETTE.white,
  d: PALETTE.boneDark,
  r: PALETTE.red,
  R: PALETTE.redLight,
  q: PALETTE.redDark,
  g: PALETTE.green,
  G: PALETTE.greenLight,
  n: PALETTE.greenDark,
  p: PALETTE.poison,
  P: PALETTE.poisonDark,
  b: PALETTE.blue,
  B: PALETTE.blueLight,
  v: PALETTE.blueDark,
  o: PALETTE.gold,
  O: PALETTE.goldLight,
  y: PALETTE.goldDark,
  s: PALETTE.steel,
  S: PALETTE.steelDark,
  t: PALETTE.leather,
  T: PALETTE.leatherDark,
  m: PALETTE.wood,
  M: PALETTE.woodDark,
  u: PALETTE.purple,
  U: PALETTE.purpleDark,
  e: PALETTE.sand,
  E: PALETTE.sandLight,
  z: PALETTE.sandDark,
  x: PALETTE.grey,
  X: PALETTE.greyDark,
  // Skin, for the two icons that have a person in them.
  c: PALETTE.skin,
  C: PALETTE.skinDark,
};

/**
 * The key every icon in the game is drawn against: this file's, plus the biome
 * ramps the ability icons need (src/art/sprites-abilities.js). They are merged
 * rather than kept apart because both sets are baked by `getItemSprites` into
 * one cache — `icon('emberBite')` has to work exactly the way `icon('coin')`
 * does — and because a character has to mean one colour across the whole game
 * or it means nothing.
 */
const KEY = { ...BASE_KEY, ...ABILITY_KEY };

const BASE_ICONS = {
  bandage: [
    '................',
    '................',
    '...kkkkkkkkkk...',
    '..kwwwwwwwwwwk..',
    '.kwWWWWWWWWWWwk.',
    '.kwWddwwwwddWwk.',
    '.kwWdwwrrwwdWwk.',
    '.kwWdwrrrrwdWwk.',
    '.kwWdwrrrrwdWwk.',
    '.kwWdwwrrwwdWwk.',
    '.kwWddwwwwddWwk.',
    '.kwWWWWWWWWWWwk.',
    '..kwwwwwwwwwwk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
  ],
  poison: [
    '................',
    '......kkkk......',
    '......kSSk......',
    '......kSSk......',
    '....kkkSSkkk....',
    '...kppppppppk...',
    '..kppwwwwwwppk..',
    '..kppwkwwkwppk..',
    '..kppwwwwwwppk..',
    '..kppwwkkwwppk..',
    '..kppwkwwkwppk..',
    '..kpPPPPPPPPPk..',
    '..kpPPPPPPPPPk..',
    '...kPPPPPPPPk...',
    '....kkkkkkkk....',
    '................',
  ],
  /**
   * A bundle, not a slab.
   *
   * The old icon was one wide brick of red with stripes across it, which at
   * sixteen pixels reads as a book. Three sticks bound together with a band and
   * one lit fuse is what the duel now throws (src/art/sprites-casts.js), and it
   * is the shape anybody recognises before they have read the name.
   */
  dynamite: [
    '................',
    '..........kOk...',
    '.........kOWk...',
    '.........kOk....',
    '........kyk.....',
    '.......kyk......',
    '..kkkkkkk.......',
    '..krRrkRrk......',
    '.kkkkkkkkkk.....',
    '.kMMMMMMMMk.....',
    '.kkkkkkkkkk.....',
    '..krRrkRrk......',
    '..krRrkRrk......',
    '..krRrkRrk......',
    '..kkkkkkk.......',
    '................',
  ],
  potion: [
    '.....kkkk.......',
    '.....kmmk.......',
    '.....kmmk.......',
    '....kkbbkk......',
    '...kbbBBbbk.....',
    '..kbbBBBBbbk....',
    '..kbbbBBbbbk....',
    '..kbBbbbbBbk....',
    '..kbbbbbbbbk....',
    '..kvbbbbbbvk....',
    '..kvvbbbbvvk....',
    '...kvvvvvvk.....',
    '....kkkkkk......',
    '................',
    '................',
    '................',
  ],
  vest: [
    '................',
    '..kkkk....kkkk..',
    '.kttttkkkkttttk.',
    'kttTTttttttTTttk',
    'kttTTttttttTTttk',
    'kttTTttoottTTttk',
    'kttTTttttttTTttk',
    'kttTTttoottTTttk',
    'kttTTttttttTTttk',
    'kttTTttttttTTttk',
    'kTTTTttttttTTTTk',
    '.kTTTTTTTTTTTTk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
  ],
  diadem: [
    '................',
    '................',
    '.......k........',
    '......kBk.......',
    '..k..kBBBk..k...',
    '.kOk.kBBBk.kOk..',
    'kOOOkkkkkkkOOOk.',
    'kOOOOOOOOOOOOOk.',
    '.kOOOOOOOOOOOk..',
    '.kyOOOOOOOOOyk..',
    '..kyyyyyyyyyk...',
    '...kkkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
  ],
  /** Parchment, a dashed trail climbing to the right, and an X on the spot. */
  map: [
    '................',
    '..kkkkkkkkkkkk..',
    '.kEEEEEEEEEEEEk.',
    '.kEzEEEEEEEEEEk.',
    '.kEEzzEEEEEEEEk.',
    '.kEEEEzzEEEEEEk.',
    '.kEEEEEEzzEEEEk.',
    '.kEEEEEEEzEEEEk.',
    '.kEEEEEEErErEEk.',
    '.kEEEEEEEErEEEk.',
    '.kEEEEEEErErEEk.',
    '.kzEEEEEEEEEEzk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
  ],
  bullet: [
    '................',
    '................',
    '......kk........',
    '.....kOOk.......',
    '....kOOOOk......',
    '....kOoooOk.....',
    '....kOoooOk.....',
    '....kyoooyk.....',
    '....kkkkkk......',
    '....kSsssSk.....',
    '....kSsssSk.....',
    '....kSsssSk.....',
    '....kSSSSSk.....',
    '.....kkkkk......',
    '................',
    '................',
  ],
  life: [
    '................',
    '.......kk.......',
    '......kRRk......',
    '.....kRRRRk.....',
    '....kRRrrRRk....',
    '...kRrrrrrrRk...',
    '..kRrrrrrrrrRk..',
    '.kRrrrrrrrrrrRk.',
    '..kqrrrrrrrrqk..',
    '...kqrrrrrrqk...',
    '....kqrrrrqk....',
    '.....kqrrqk.....',
    '......kqqk......',
    '.......kk.......',
    '................',
    '................',
  ],
  /** A struck coin: a sheriff's star sunk into the face, not a currency glyph. */
  coin: [
    '................',
    '.....kkkkkk.....',
    '...kkOOOOOOkk...',
    '..kOOOOOOOOOOk..',
    '.kOOOOOyyOOOOOk.',
    '.kOOOOyyyyOOOOk.',
    '.kOyyyyyyyyyyOk.',
    '.kOOyyyyyyyyOOk.',
    '.kOOOyyyyyyOOOk.',
    '.kOOOyyyyyyOOOk.',
    '.kOOyyyOOyyyOOk.',
    '..kOyyOOOOyyOk..',
    '...kkOOOOOOkk...',
    '.....kkkkkk.....',
    '................',
    '................',
  ],
  carrot: [
    '................',
    '........kGk.....',
    '.....kGkGGk.....',
    '....kGGGGGkk....',
    '....kkGGGGk.....',
    '.....kkoyok.....',
    '....koooook.....',
    '....koyooyk.....',
    '.....kooook.....',
    '.....koyook.....',
    '......kooK......',
    '......kook......',
    '.......kok......',
    '.......kk.......',
    '................',
    '................',
  ],
  apple: [
    '................',
    '.......kn.......',
    '......knGk......',
    '.....knnGGk.....',
    '...kkkkkkkk.....',
    '..kRRrrrrrrk....',
    '.krRRrrrrrrrk...',
    '.krRRrrrrrrrk...',
    '.krRrrrrrrrrk...',
    '.krrrrrrrrrrk...',
    '.kqrrrrrrrrqk...',
    '..kqrrrrrrqk....',
    '...kqqrrqqk.....',
    '.....kkkk.......',
    '................',
    '................',
  ],
  /**
   * The horse is sold as a horseshoe. A tiny side-on horse at 16px turns into
   * an unidentifiable four-legged animal; a shoe is unmistakable.
   */
  horseToken: [
    '................',
    '.....kkkkkk.....',
    '....kssssssk....',
    '...ksskkkkssk...',
    '..kssk....kssk..',
    '..kssk....kssk..',
    '.kSsxk....kxsSk.',
    '.kSsk......kSsk.',
    '.kSsxk....kxsSk.',
    '.kSsk......kSsk.',
    '.kSSk......kSSk.',
    '.kSSk......kSSk.',
    '.kkkk......kkkk.',
    '................',
    '................',
    '................',
  ],
  /** Enemy marker: hat brim, eyes, bandana. Read at a glance in a list. */
  enemy: [
    '................',
    '.....kkkkkk.....',
    '....kMMMMMMk....',
    '..kkMMMMMMMMkk..',
    '.kMMMMMMMMMMMMk.',
    '.kkkkkkkkkkkkkk.',
    '...kssssssssk...',
    '...kskssssksk...',
    '...kssssssssk...',
    '...kqqqqqqqqk...',
    '...kqRRRRRRqk...',
    '....kqqqqqqk....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
  ],
  bed: [
    '................',
    '..kkk.......kkk.',
    '..kMMk......kMk.',
    '..kMMkkkkkkkkMk.',
    '..kMMkwwwwwkkMk.',
    '..kMMkwWWWwkkMk.',
    '..kMMkwwwwwkkMk.',
    '.kkMMkkkkkkkkMk.',
    '.kqqqqqqqqqqqqk.',
    '.kqRRRRRRRRRRqk.',
    '.kqqqqqqqqqqqqk.',
    '.kkkkkkkkkkkkkk.',
    '..kMk......kMk..',
    '..kMk......kMk..',
    '..kkk......kkk..',
    '................',
  ],
  /** A punched price tag, pointing at the price it is attached to. */
  shopTag: [
    '................',
    '................',
    '....kkkkkkkkkk..',
    '...kOOOOOOOOOOk.',
    '..kOkOOOOOOOOOk.',
    '.kOkkOOkkkOOOOk.',
    'kOOOkOkKKKkOOOk.',
    'kOOOkOkKKKkOOOk.',
    'kOOOkOOkkkOOOOk.',
    '.kOkkOOOOOOOOOk.',
    '..kOkOOOOOOOOOk.',
    '...kOOOOOOOOOOk.',
    '....kkkkkkkkkk..',
    '................',
    '................',
    '................',
  ],
  /**
   * Bullet Steal — a hand closing on a round that is not its own.
   *
   * This and `mindControl` below exist because the duel used to name an
   * enemy's abilities in words under their feet, and the two that had no icon
   * were the reason the whole row was text. Poison and dynamite have been
   * drawn since the shop needed them; these two complete the set, so an
   * ability can always be shown rather than spelled.
   */
  bulletSteal: [
    '................',
    '..........kk....',
    '.........kOOk...',
    '.........kOOk...',
    '........kyooyk..',
    '........kSssSk..',
    '........kSssSk..',
    '..kk....kSSSSk..',
    '.ktTk....kkkk...',
    '.ktTkkkkk.......',
    '.ktTTTTTTk......',
    '.ktTTTTTTk......',
    '..kTTTTTTk......',
    '..kTTTTTk.......',
    '...kkkkkk.......',
    '................',
  ],
  /** Mind Control — a head with a spiral turning where the thinking goes. */
  mindControl: [
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkccccccck...',
    '...kcUUUUUcck...',
    '...kcUuuuucck...',
    '...kcUuUUUcck...',
    '...kcUuuuUcck...',
    '...kcUUUuUcck...',
    '...kcccccccck...',
    '....kcccccck....',
    '....kcCCCcck....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
  ],
  /** Hunger: a fork and a knife, in the same steel as the revolver. */
  hunger: [
    '................',
    '..k.k.k....kk...',
    '..ksksk....kSk..',
    '..ksksk...ksSk..',
    '..ksksk...ksSk..',
    '..kssssk..ksSk..',
    '...ksssk..ksSk..',
    '....kssk..ksSk..',
    '....kssk..kssk..',
    '....kssk...ksk..',
    '....kssk...ksk..',
    '....kssk...ksk..',
    '....kssk...ksk..',
    '....kkkk...kkk..',
    '................',
    '................',
  ],
};

/** Items, interface bits, and every ability the worlds can throw at you. */
const ICONS = { ...BASE_ICONS, ...ABILITY_ICONS };

/** Draw a rarity frame: a 20x20 beveled plate with a 2px rarity border. */
function makeRarityFrame(color) {
  const { canvas, ctx } = makeCanvas(FRAME_SIZE, FRAME_SIZE);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, FRAME_SIZE, FRAME_SIZE);
  ctx.fillStyle = color;
  ctx.fillRect(1, 1, FRAME_SIZE - 2, FRAME_SIZE - 2);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillRect(2, 2, FRAME_SIZE - 4, FRAME_SIZE - 4);
  // corner studs so the frames read as metal plates, not flat rectangles
  ctx.fillStyle = color;
  ctx.fillRect(2, 2, 2, 2);
  ctx.fillRect(FRAME_SIZE - 4, 2, 2, 2);
  ctx.fillRect(2, FRAME_SIZE - 4, 2, 2);
  ctx.fillRect(FRAME_SIZE - 4, FRAME_SIZE - 4, 2, 2);
  return canvas;
}

let cache = null;

export function getItemSprites() {
  if (cache) return cache;
  const icons = {};
  for (const [name, rows] of Object.entries(ICONS)) icons[name] = bake({ key: KEY, rows });

  const frames = {};
  for (const [rarity, color] of Object.entries(RARITY_COLORS)) {
    frames[rarity] = makeRarityFrame(color);
  }

  cache = { icons, frames };
  return cache;
}

/**
 * Compose an icon inside its rarity frame and return a fresh canvas.
 * Used by the shop cards and the inventory grid.
 */
export function composeFramedIcon(iconName, rarity = 'common', scale = 2) {
  const { icons, frames } = getItemSprites();
  const icon = icons[iconName] || icons.coin;
  const frame = frames[rarity] || frames.common;
  const { canvas, ctx } = makeCanvas(FRAME_SIZE * scale, FRAME_SIZE * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame, 0, 0, FRAME_SIZE * scale, FRAME_SIZE * scale);
  ctx.drawImage(icon, 2 * scale, 2 * scale, ICON_SIZE * scale, ICON_SIZE * scale);
  return canvas;
}

/** Convenience: a data URL for use in HTML (<img src>, CSS background). */
export function iconURL(iconName, scale = 2) {
  const { icons } = getItemSprites();
  const icon = icons[iconName];
  if (!icon) return '';
  const { canvas, ctx } = makeCanvas(ICON_SIZE * scale, ICON_SIZE * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(icon, 0, 0, ICON_SIZE * scale, ICON_SIZE * scale);
  return canvas.toDataURL('image/png');
}

export function framedIconURL(iconName, rarity = 'common', scale = 2) {
  return composeFramedIcon(iconName, rarity, scale).toDataURL('image/png');
}
