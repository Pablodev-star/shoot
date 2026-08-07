/**
 * SHOOT! — Venue art (shop stall & inn room).
 *
 * The two indoor screens used to be a plank wall with one lantern on it, and
 * the inn sold two beds using the same 16 x 16 icon twice. Everything a shop
 * or an inn is made of now lives here: the goods on the shelves, the crates
 * and barrels on the floor, the hearth, the window — and, most of all, the
 * BEDS, which are drawn once each and are not the same picture.
 *
 * Everything is authored on the same grid, with the same light coming from the
 * top-left and the same 1px ink outline, so a barrel from this file can stand
 * next to a bandage from `sprites-items.js` without either looking pasted in.
 *
 * WHY THE BEDS ARE NOT ICONS
 * ---------------------------------------------------------------------------
 * The inn asks one question — is the cheap bed enough? — and it is a question
 * about two objects. A straw pallet on a low frame and a carved bed under a
 * quilt answer it before the prices are read, so they are drawn at 40 x 24
 * rather than shrunk to the 16 x 16 the saddlebag uses. The small `bed` icon
 * in `sprites-items.js` stays where it belongs: on the trail map and in the
 * inventory, where it is a label rather than a thing.
 */

import { PALETTE } from './palette.js';
import { bake } from './pixel.js';

/**
 * The venue key. Letters that also exist in `sprites-items.js` mean the same
 * colour here — the four that are new (`l`, `D`, `Z`, `Q`) are the ends of
 * ramps the icon set never needed.
 */
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
  Q: PALETTE.redDeep,
  g: PALETTE.green,
  G: PALETTE.greenLight,
  n: PALETTE.greenDark,
  p: PALETTE.poison,
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
  l: PALETTE.woodLight,
  m: PALETTE.wood,
  M: PALETTE.woodDark,
  D: PALETTE.woodDeep,
  e: PALETTE.sand,
  E: PALETTE.sandLight,
  z: PALETTE.sandDark,
  Z: PALETTE.sandDeep,
  x: PALETTE.grey,
  X: PALETTE.greyDark,
  u: PALETTE.purple,
  c: PALETTE.skin,
};

// ---------------------------------------------------------------------------
// The beds — 40 x 24, side on, head to the left.
//
// They are built to be told apart at a glance and in this order: silhouette
// first (one is knee-high, the other reaches the top of the frame), then
// colour (straw and grey wool against a red quilt and brass), then detail.
// ---------------------------------------------------------------------------

/**
 * The basic bed: a plank cot, a sacking mattress with the straw coming out of
 * it, and an army blanket thrown over the foot. Nothing on it is finished —
 * the frame is sawn planks and the legs are the posts they were cut from.
 */
const BED_STRAW = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '..kkkkkkk...............................',
  '..kMlmlMk...............................',
  '..kMlmlMk...............................',
  '..kMlmlMk...............................',
  '..kMMMMMk...............................',
  '..kMlmlMk.kkkkkkkk...........kkkkkkk....',
  '..kMlmlMk.kwwddwwk...........kMlmlMk....',
  '..kMlmlMk.kwWWwwdk...........kMMMMMk....',
  '..kMlmlkEEeEEEEeEEEEkkkkkkkkkkMlmlMk....',
  '..kMlmlkEeEEEEEEeEEEkxxxXxxxkkMlmlMk....',
  '..kMlmlkEEEEeEEEEEeEkqqqqqqqkkMlmlMk....',
  '..kMlmlkzEEEEeEEEEEEkxXxxxxXkkMlmlMk....',
  '..kMlmlkzEzEzzEzEzzEkqqqqqqqkkMlmlMk....',
  '..kMlmlkMMMMMMMMMMMMkxxxXxxxkkMlmlMk....',
  '..kMlmlkDDDDDDDDDDDDkXxxxxxXkkMlmlMk....',
  '..kMlmlMk..........kxxxXxxxxkkMlmlMk....',
  '..kMk.kMk..........kkkkkkkkkkkMk.kMk....',
  '..kMk.kMk....................kMk.kMk....',
  '..kkk.kkk....................kkk.kkk....',
  '........................................',
];

/**
 * The premium bed: a turned frame with brass finials, a mattress deep enough
 * to have a shadow under it, two pillows and a quilt with the sheet folded
 * back over it. The rug is part of the sprite because the bed is the only
 * thing standing on it.
 */
const BED_FEATHER = [
  '..kOOOOOOOk.............................',
  '..kyOOOOOyk.............................',
  '..kkkkkkkkk.............................',
  '..kMlllllMk.............................',
  '..kMlkkklMk.............................',
  '..kMlkmklMk...................kOOOOOOk..',
  '..kMlkmklMk.kkkkkkkkkkkk......kyOOOOyk..',
  '..kMlkmklMk.kwWWwkkwWWwk......kkkkkkkk..',
  '..kMlkmklMk.kwWWwkkwWWwk......kMllllMk..',
  '..kMlkkklMk.kwwWwkkwwWwk......kMlkklMk..',
  '..kMlllllMk.kwwddkkwwddk......kMlkklMk..',
  '..kMlllllMkkWWWWWWWWWWWWWWWWWkkMllllMk..',
  '..kMlmmmlMkkWWWWWWkqRRRRRRRRqkkMlkklMk..',
  '..kMlllllMkkwWWWWWkqRrRRrRRrqkkMllllMk..',
  '..kMlmmmlMkkwwwwwwkqRRRRRRRRqkkMlkklMk..',
  '..kMlllllMkkwwddwwkqRrRRrRRrqkkMllllMk..',
  '..kMlmmmlMkkddwdddkqRRRRRRRRqkkMlkklMk..',
  '..kMlllllMkkMMMMMMkqRrRRrRRrqkkMllllMk..',
  '..kMlmmmlMkkDDDDDDkkkkkkkkkkkkkMlmmlMk..',
  '..kMk...kMk..................kMk...kMk..',
  '..kMk...kMk..................kMk...kMk..',
  '.kTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTk..',
  '.kTqTqTqTqTqTqTqTqTqTqTqTqTqTqTqTqTqTk..',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
];

// ---------------------------------------------------------------------------
// Trading-post goods — what a frontier store is actually full of.
// ---------------------------------------------------------------------------

/** A nailed crate, stencilled. Stacks with itself. */
const CRATE = [
  'kkkkkkkkkkkkkk',
  'klllllllllllMk',
  'klmmmmmmmmmmMk',
  'klmMMMMMMMMmMk',
  'klmMllllllMmMk',
  'klmMlmmmmlMmMk',
  'klmMllllllMmMk',
  'klmMMMMMMMMmMk',
  'klmmmmmmmmmmMk',
  'klMMMMMMMMMMMk',
  'kkkkkkkkkkkkkk',
];

/** A hooped barrel. */
const BARREL = [
  '..kkkkkkkk..',
  '.kMMMMMMMMk.',
  'klmmmmmmmmMk',
  'kSSSSSSSSSSk',
  'klmmmmmmmmMk',
  'klmmmmmmmmMk',
  'kSSSSSSSSSSk',
  'klmmmmmmmmMk',
  'klmmmmmmmmMk',
  'kSSSSSSSSSSk',
  'klmmmmmmmmMk',
  '.kMMMMMMMMk.',
  '..kkkkkkkk..',
];

/** A grain sack, tied at the neck. */
const SACK = [
  '....kkkk....',
  '...kddddk...',
  '...kdTTdk...',
  '..kEEddEEk..',
  '.kEEEEEEEEk.',
  'kEEEeEEEeEEk',
  'kEeEEEEEEeEk',
  'kEEEEeEEEEEk',
  'kzEEEEEEEEzk',
  'kzzEEEEEEzzk',
  '.kzzzzzzzzk.',
  '..kkkkkkkk..',
];

/** A stoppered preserve jar. */
const JAR = [
  '.kkkk.',
  'kTTTTk',
  'kkkkkk',
  'kBggBk',
  'kgGGgk',
  'kgGgGk',
  'kggGgk',
  'kgGGgk',
  'kngngk',
  'kkkkkk',
];

/** A bottle of something amber. */
const BOTTLE = [
  '.kk.',
  'kOOk',
  'kMMk',
  'kMMk',
  'kkkk',
  'kzOk',
  'kzOk',
  'kzOk',
  'kzOk',
  'kzzk',
  'kkkk',
];

/** A tin, labelled with a stripe. */
const TIN = [
  'kkkkkkk',
  'kSsssSk',
  'kssssSk',
  'kqqqqqk',
  'kssssSk',
  'kSSSSSk',
  'kkkkkkk',
];

/** A hanging skillet. */
const PAN = [
  '...kk...',
  '...kSk..',
  '.kkkkkkk',
  'kSSSSSSk',
  'kSXXXXSk',
  'kSXXXXSk',
  '.kSXXSk.',
  '..kkkk..',
];

/** A hat on a peg. */
const HAT = [
  '..kkkkkk..',
  '.kTttttTk.',
  '.kTtttttk.',
  'kkkkkkkkkk',
  'kTttttttTk',
  'ktttttttTk',
  '.kkkkkkkk.',
];

/** A coil of rope on a nail. */
const COIL = [
  '.kkkkkk.',
  'kzEEEEzk',
  'kEkkkkEk',
  'kEk..kEk',
  'kEkkkkEk',
  'kzEEEEzk',
  '.kkkkkk.',
];

/** Counter scales — the one thing that says "this is a shop" on its own. */
const SCALES = [
  '......kk......',
  '.kkkkkkkkkkk..',
  '.kSSSk..kSSSk.',
  '..kSk....kSk..',
  'kkkkkkkkkkkkkk',
  'kssskkkkkksssk',
  '.kkk..kk..kkk.',
  '......kk......',
  '....kkkkkk....',
  '...kSSSSSSk...',
  '...kkkkkkkk...',
];

// ---------------------------------------------------------------------------
// Inn furniture.
// ---------------------------------------------------------------------------

/**
 * The hearth — stone surround and a black opening. The fire itself is drawn
 * live by the scene, because a hearth with a baked flame in it is a picture of
 * a fire rather than a fire.
 */
const HEARTH = [
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kxxXxxxXxxxxXxxxXxxxxXxxxXXk',
  'kXxxxXxxxXxxxxXxxxXxxxXxxxxk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kMlllllllllllllllllllllllMMk',
  'kMmmmmmmmmmmmmmmmmmmmmmmmmMk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kxXxxkkkkkkkkkkkkkkkkxxXxxxk',
  'kxxXxkKKKKKKKKKKKKKKKkxxxXxk',
  'kXxxxkKKKKKKKKKKKKKKKkXxxxxk',
  'kxxXxkKKKKKKKKKKKKKKKkxxXxxk',
  'kxXxxkKKKKKKKKKKKKKKKkxxxxXk',
  'kxxxXkKKKKKKKKKKKKKKKkXxxXxk',
  'kXxxxkKKKKKKKKKKKKKKKkxxXxxk',
  'kxxXxkKKKKKKKKKKKKKKKkxxxxxk',
  'kxXxxkKKKKKKKKKKKKKKKkXxxXxk',
  'kxxxxkKKKKKKKKKKKKKKKkxxXxxk',
  'kxxXxkkkkkkkkkkkkkkkkkxXxxxk',
  'kXxxxxxXxxxxXxxxXxxxxXxxxxXk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkk',
];

/** A shuttered window. The sky behind it is painted by the scene. */
const WINDOW = [
  'kkkkkkkkkkkkkkkkkkkk',
  'kMllllllllllllllllMk',
  'kMkkkkkkkkkkkkkkkkMk',
  'kMk..............kMk',
  'kMk..............kMk',
  'kMk..............kMk',
  'kMk..............kMk',
  'kMkkkkkkkkkkkkkkkkMk',
  'kMkkkkkkkkkkkkkkkkMk',
  'kMk..............kMk',
  'kMk..............kMk',
  'kMk..............kMk',
  'kMk..............kMk',
  'kMkkkkkkkkkkkkkkkkMk',
  'kMllllllllllllllllMk',
  'kkkkkkkkkkkkkkkkkkkk',
];

/** A ladder-back chair, turned to the fire. */
const CHAIR = [
  'kkkkkk......',
  'kMllMk......',
  'kMkkMk......',
  'kMllMk......',
  'kMkkMk......',
  'kMllMk......',
  'kMlllkkkkkk.',
  'kMlllllllllk',
  'kMMMMMMMMMMk',
  'kkkkkkkkkkkk',
  'kMk......kMk',
  'kMk......kMk',
  'kMk......kMk',
  'kkk......kkk',
];

/** A travelling trunk with iron corners. */
const TRUNK = [
  '.kkkkkkkkkkkk.',
  'kSTTTTTTTTTTSk',
  'kSTtttttttttSk',
  'kkkkkkkkkkkkkk',
  'kSTTTTTOTTTTSk',
  'kSTtttOOOtttSk',
  'kSTtttttttttSk',
  'kSTTTTTTTTTTSk',
  '.kkkkkkkkkkkk.',
];

/** Split logs, stacked end-on beside the fire. */
const LOGS = [
  '..kkkk..kkkk..',
  '.kMllMkkMllMk.',
  'kMllllMkMllMMk',
  'kMlDDlMkMlDlMk',
  'kMllllMkMllMMk',
  '.kMMMMkkkMMkk.',
  'kkkkkkkkkkkkkk',
  '.kMllMkkMllMk.',
  'kMlDDlMkMlDlMk',
  'kMllllMkMllMMk',
  '.kMMMMk.kMMMk.',
  '..kkkk...kkk..',
];

/** A washstand: a bowl, a jug and a folded cloth. */
const WASHSTAND = [
  '...kkkkk......',
  '..kwWWWwk.....',
  '..kwWwwwk.kkk.',
  '..kwwwwwk.kwk.',
  '..kkkkkkkkkwk.',
  'kkkkkkkkkkkkkk',
  'kMlllllllllllk',
  'kMMMMMMMMMMMMk',
  'kkkkkkkkkkkkkk',
  'kMk........kMk',
  'kMk........kMk',
  'kkk........kkk',
];

/** A candle on a saucer, burnt halfway down. */
const CANDLE = [
  '..O.',
  '.OOO',
  '.kOk',
  '.kwk',
  '.kwk',
  '.kwk',
  '.kdk',
  'kkkk',
  'kssk',
  'kkkk',
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const DEFS = {
  bedStraw: BED_STRAW,
  bedFeather: BED_FEATHER,
  crate: CRATE,
  barrel: BARREL,
  sack: SACK,
  jar: JAR,
  bottle: BOTTLE,
  tin: TIN,
  pan: PAN,
  hat: HAT,
  coil: COIL,
  scales: SCALES,
  hearth: HEARTH,
  window: WINDOW,
  chair: CHAIR,
  trunk: TRUNK,
  logs: LOGS,
  washstand: WASHSTAND,
  candle: CANDLE,
};

/** Which bed art an inn offer gets. Unknown ids fall back to the cheap one. */
const BED_FOR_OFFER = {
  basic: 'bedStraw',
  premium: 'bedFeather',
};

let cache = null;

/** Bake every venue sprite once, at 1x. */
export function getVenueSprites() {
  if (cache) return cache;
  cache = {};
  for (const [name, rows] of Object.entries(DEFS)) {
    cache[name] = bake({ key: KEY, rows });
  }
  return cache;
}

/** One baked sprite at 1x — the scene upscales it itself. */
export function venueSprite(name) {
  return getVenueSprites()[name] || null;
}

/** A venue sprite as a data URL, for the HTML layer. */
export function venueURL(name, scale = 4) {
  const sprite = venueSprite(name);
  if (!sprite) return '';
  const out = document.createElement('canvas');
  out.width = sprite.width * scale;
  out.height = sprite.height * scale;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

/** The bed an inn offer is selling, drawn rather than named. */
export function bedURL(offerId, scale = 4) {
  return venueURL(BED_FOR_OFFER[offerId] || 'bedStraw', scale);
}

/** Source-pixel size of a venue sprite, for laying HTML out around it. */
export function venueSize(name) {
  const sprite = venueSprite(name);
  return sprite ? { w: sprite.width, h: sprite.height } : { w: 0, h: 0 };
}
