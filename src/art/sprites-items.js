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
 * (enemy marker), bed (inn), shop tag.
 */

import { PALETTE, RARITY_COLORS } from './palette.js';
import { bake, makeCanvas } from './pixel.js';

export const ICON_SIZE = 16;
export const FRAME_SIZE = 20;

const KEY = {
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
};

const ICONS = {
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
  dynamite: [
    '................',
    '..........kOk...',
    '.........kOOk...',
    '.........kOk....',
    '........kOk.....',
    '.......kOk......',
    '..kkkkkkkk......',
    '.kRrrRrrRrrk....',
    '.kRrrRrrRrrk....',
    '.kMMMMMMMMMk....',
    '.kRrrRrrRrrk....',
    '.kRrrRrrRrrk....',
    '.kMMMMMMMMMk....',
    '.kRrrRrrRrrk....',
    '.kkkkkkkkkkk....',
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
