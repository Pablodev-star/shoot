/**
 * SHOOT! — The forge.
 *
 * Everything the blacksmith's is built out of. It used to be built out of
 * nothing: the workshop was eleven `fillRect` calls in the middle of
 * `interior-scene.js` — a brick oblong with an orange bar in it, four grey
 * ticks on the far wall for tools, and a hammer-shaped lump of steel on the
 * floor. Three rectangles and a colour is a diagram of a forge.
 *
 * A forge is a place with a FIRE at the middle of it and the whole room
 * arranged around that fire: the hood that takes the smoke, the bellows that
 * feed the coals, the anvil the work is beaten on, the trough it is dropped
 * into to harden, the rack of tongs and files, the finished guns on the wall.
 * All of it is here, on the same pixel grid, in the same ink outline and lit
 * from the same top-left as every other sprite in the game — so the room the
 * player buys a gun in is made of the same material as the gun.
 *
 * THE FIRE IS NOT IN THE ART
 * ---------------------------------------------------------------------------
 * Same rule as the inn's hearth: the furnace leaves a hole (`K`) and the scene
 * burns something live in it, because a baked flame is a picture of a fire. The
 * hole is measured off the art by `FORGE_MOUTH` rather than written down beside
 * it, so nudging a course of brick never means recounting an offset.
 */

import { PALETTE } from './palette.js';
import { bake } from './pixel.js';

/**
 * The forge key. Shared letters mean what they mean everywhere else in the
 * game; the fire family at the bottom is the one thing this room needs that a
 * shop and an inn never did.
 */
const KEY = {
  '.': null,
  k: PALETTE.ink,
  K: PALETTE.inkSoft, // the mouth: the scene burns in it
  w: PALETTE.bone,
  W: PALETTE.white,
  d: PALETTE.boneDark,
  s: PALETTE.steel,
  S: PALETTE.steelDark,
  x: PALETTE.grey,
  X: PALETTE.greyDark,
  l: PALETTE.woodLight,
  m: PALETTE.wood,
  M: PALETTE.woodDark,
  D: PALETTE.woodDeep,
  t: PALETTE.leather,
  T: PALETTE.leatherDark,
  o: PALETTE.gold,
  O: PALETTE.goldLight,
  y: PALETTE.goldDark,
  c: PALETTE.skyDay,
  C: PALETTE.skyDayHigh,
  v: PALETTE.blueDark,
  r: PALETTE.magma,
  R: PALETTE.emberGlow,
  q: PALETTE.magmaDeep,
  '%': PALETTE.char,
  $: PALETTE.charDark,
};

/**
 * The furnace: a stone stack with a sheet-iron hood over it and a chimney
 * through the roof. The mouth is the black rectangle in the middle, seven rows
 * of it, and everything alive in this room comes out of there.
 */
const FURNACE = [
  '............kkkkkk............',
  '............kXxxXk............',
  '............kXxxXk............',
  '.........kkkkkkkkkkkk.........',
  '.......kkXXXXXXXXXXXXkk.......',
  '.....kkXXxxxxxxxxxxxxXXkk.....',
  '...kkXXxxxxxxxxxxxxxxxxXXkk...',
  '.kkXXxxxxxxxxxxxxxxxxxxxxXXkk.',
  'kkXXXXXXXXXXXXXXXXXXXXXXXXXXkk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kxXxxXxxxXxxxXxxxXxxxXxxxXxxXk',
  'kxxXkkkkkkkkkkkkkkkkkkkkkkXxxk',
  'kxXxkKKKKKKKKKKKKKKKKKKKKkxXxk',
  'kxxXkKKKKKKKKKKKKKKKKKKKKkXxxk',
  'kxXxkKKKKKKKKKKKKKKKKKKKKkxXxk',
  'kxxxkKKKKKKKKKKKKKKKKKKKKkxxxk',
  'kxXxkKKKKKKKKKKKKKKKKKKKKkxXxk',
  'kxxXkKKKKKKKKKKKKKKKKKKKKkXxxk',
  'kxXxkKKKKKKKKKKKKKKKKKKKKkxXxk',
  'kxxXkkkkkkkkkkkkkkkkkkkkkkXxxk',
  'kxXxxXxxxXxxxXxxxXxxxXxxxXxxXk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kxxxxxkxxxxxkxxxxxkxxxxxkxxxxk',
  'kXXXXXkXXXXXkXXXXXkXXXXXkXXXXk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kxxkxxxxxkxxxxxkxxxxxkxxxxxkxk',
  'kXXkXXXXXkXXXXXkXXXXXkXXXXXkXk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kXXXXXXXXXXXXXXXXXXXXXXXXXXXXk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
];

/**
 * The anvil, on its stump.
 *
 * Drawn as one piece rather than two, because an anvil that is not on a block
 * of end-grain oak reads as a lump of metal lying on the floor — the stump is
 * half of what says "this is where the work happens".
 */
const ANVIL = [
  '...kkkkkkkkkkkkkkkk.',
  '.kkkssssssssssssssk.',
  'kksssssssssssssssSk.',
  '.kkSSSSSSSSSSSSSSSk.',
  '...kkkkSSSSSSkkkkkk.',
  '......kSSSSSSk......',
  '......kSSSSSSk......',
  '.....kSSSSSSSSk.....',
  '....kSSSSSSSSSSk....',
  '....kkkkkkkkkkkk....',
  '....kMllllllllMk....',
  '....kMlDDDDDDlMk....',
  '....kMlDmmmmDlMk....',
  '....kMlDmmmmDlMk....',
  '....kMMDDDDDDMMk....',
  '....kkkkkkkkkkkk....',
];

/**
 * The hammer, on its own so the scene can swing it. Head at the top, handle
 * hanging: the sprite is drawn from its head, which is the part that has to
 * land on the work.
 */
const HAMMER = [
  '.kkkk.',
  'kSSSSk',
  'kSssSk',
  'kSssSk',
  'kSSSSk',
  '.kkkk.',
  '..kk..',
  '..km..',
  '..km..',
  '..km..',
  '..km..',
  '..kM..',
  '..kM..',
  '..kk..',
];

/** The quench trough: a hooped barrel with black water standing in it. */
const TROUGH = [
  '.kkkkkkkkkkkkkk.',
  'kMllllllllllllMk',
  'kMccccccccccccMk',
  'kMCCCCCCCCCCCCMk',
  'kMvvvvvvvvvvvvMk',
  'kSSSSSSSSSSSSSSk',
  'kMmmmmmmmmmmmmMk',
  'kMmmmmmmmmmmmmMk',
  'kSSSSSSSSSSSSSSk',
  'kMmmmmmmmmmmmmMk',
  '.kMMMMMMMMMMMMk.',
  '..kkkkkkkkkkkk..',
];

/** Tongs and files hanging off a plank, longest at the ends. */
const TOOLRACK = [
  'kkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kMllllllllllllllllllllllMk',
  'kMMMMMMMMMMMMMMMMMMMMMMMMk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkk',
  '..kk....kk....kk....kk....',
  '..ks....kS....ks....kS....',
  '..ks....kS....ks....kS....',
  '..ks....kS....ks....kS....',
  '..ks....kS....ks....kS....',
  '.kssk...kS...kssk...kS....',
  '.kssk...kS...kssk...kS....',
  '.kkkk...kS...kkkk...kS....',
  '........kk..........kk....',
];

/** Finished work, stood in a rack: three long guns waiting to be collected. */
const GUNRACK = [
  'kkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kMllllllllllllllllllllllMk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkk',
  '..kk.....kk.....kk........',
  '..ks.....kS.....ks........',
  '..ks.....kS.....ks........',
  '..ks.....kS.....ks........',
  '..ks.....kS.....ks........',
  '.kkskk..kkSkk..kkskk......',
  '.kTTTk..kTTTk..kTTTk......',
  '.kTtTk..kTtTk..kTtTk......',
  '..kTk....kTk....kTk.......',
  '..kkk....kkk....kkk.......',
];

/** The grinding wheel, on its frame. */
const GRINDSTONE = [
  '.....kkkkkk.....',
  '...kkxxxxxxkk...',
  '..kxxxxxxxxxxk..',
  '.kxxxXXXXXXxxxk.',
  '.kxxXXXXXXXXxxk.',
  'kxxXXXXXXXXXXxxk',
  'kxxXXXsSXXXXXxxk',
  'kxxXXXSsXXXXXxxk',
  'kxxXXXXXXXXXXxxk',
  '.kxxXXXXXXXXxxk.',
  '.kxxxXXXXXXxxxk.',
  '..kxxxxxxxxxxk..',
  '...kkxxxxxxkk...',
  '.....kkkkkk.....',
  '..kMk......kMk..',
  '..kMk......kMk..',
];

/** A horseshoe nailed to the wall, open end down, the way it is meant to be. */
const HORSESHOE = [
  '..kkkk..',
  '.kSSSSk.',
  'kSkkkkSk',
  'kSk..kSk',
  'kSk..kSk',
  'kSk..kSk',
  'kkk..kkk',
  '........',
];

/** Bar stock, stacked where it can be reached from the fire. */
const INGOTS = [
  '..kkkkkkkkkk..',
  '.ksssssssssk..',
  '.kSSSSSSSSSk..',
  'kkkkkkkkkkkkk.',
  'ksssssssssssk.',
  'kSSSSSSSSSSSk.',
  'kkkkkkkkkkkkk.',
  '..............',
];

/**
 * The bellows, in two states. The scene breathes between them, and blows the
 * fire up on the frame it closes — a bellows that moves while the coals do
 * nothing is a piece of furniture flapping.
 */
const BELLOWS_OPEN = [
  '...kkkkkkkkkk.......',
  '.kkMllllllllMkk.....',
  'kTTtttttttttTTkkk...',
  'kTttttttttttttkSSSk.',
  'kTttttttttttttkSSSk.',
  'kTTtttttttttTTkkk...',
  '.kkMMMMMMMMMkk......',
  '...kkkkkkkkkk.......',
  '.....kMMMMk.........',
  '.....kMMMMk.........',
  '.....kkkkkk.........',
  '....................',
];

const BELLOWS_SHUT = [
  '....................',
  '...kkkkkkkkkk.......',
  '.kkMllllllllMkk.....',
  'kTTtttttttttTTkkk...',
  'kTttttttttttttkSSSk.',
  'kTTtttttttttTTkkk...',
  '.kkMMMMMMMMMkk......',
  '...kkkkkkkkkk.......',
  '.....kMMMMk.........',
  '.....kMMMMk.........',
  '.....kkkkkk.........',
  '....................',
];

/**
 * A bucket of coal, and the coke that has spilled out of it. Small, and the
 * one prop in the room that is nothing but black — every other surface here is
 * catching the fire, and something has to not.
 */
const COAL = [
  'kkkkkkkkkk',
  'kX$%$%$%Xk',
  'kX%$%$%$Xk',
  'kX$%$%$%Xk',
  'kX%$%$%$Xk',
  '.kXXXXXXk.',
  '..kkkkkk..',
  '...$%$....',
];

const DEFS = {
  furnace: FURNACE,
  anvil: ANVIL,
  hammer: HAMMER,
  trough: TROUGH,
  toolrack: TOOLRACK,
  gunrack: GUNRACK,
  grindstone: GRINDSTONE,
  horseshoe: HORSESHOE,
  ingots: INGOTS,
  bellowsOpen: BELLOWS_OPEN,
  bellowsShut: BELLOWS_SHUT,
  coal: COAL,
};

/** Find a marked region in a character map — see `HEARTH_OPENING` in venue art. */
function findOpening(rows, ch = 'K') {
  let x0 = Infinity;
  let x1 = -1;
  let y0 = Infinity;
  let y1 = -1;
  rows.forEach((row, y) => {
    const first = row.indexOf(ch);
    if (first < 0) return;
    x0 = Math.min(x0, first);
    x1 = Math.max(x1, row.lastIndexOf(ch));
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  if (x1 < 0) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** The hole in the furnace, in source pixels, measured off the art. */
export const FORGE_MOUTH = findOpening(FURNACE);

let cache = null;

/** Bake every forge sprite once, at 1x. The scene upscales them itself. */
export function getForgeSprites() {
  if (cache) return cache;
  cache = {};
  for (const [name, rows] of Object.entries(DEFS)) {
    cache[name] = bake({ key: KEY, rows });
  }
  return cache;
}

export function forgeSprite(name) {
  return getForgeSprites()[name] || null;
}

/** Source-pixel size of a forge sprite, for laying anything out around it. */
export function forgeSize(name) {
  const sprite = forgeSprite(name);
  return sprite ? { w: sprite.width, h: sprite.height } : { w: 0, h: 0 };
}
