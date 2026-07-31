/**
 * SHOOT! — Environment art (Block 2b).
 *
 * Contains four families of artwork:
 *
 *  1. PROPS — hand-authored pixel strings: cacti (3 variants), rocks, cow
 *     skull, sign post, tumbleweed (4-frame roll), carrot and apple.
 *  2. SKY BODIES — the sun and the moon, drawn on the same pixel grid as
 *     everything else instead of being stroked as circles.
 *  3. BUILDINGS — the shop and the inn, drawn big and blocky so they read from
 *     far away while the camera scrolls past.
 *  4. PARALLAX LAYERS — generated procedurally from a seed at load time.
 *
 * THE MOON
 * ---------------------------------------------------------------------------
 * The crescent is cut out of the disc, not painted over it. Nothing draws the
 * dark limb: those pixels are transparent, so whatever the sky happens to be
 * at that height shows through exactly. That is the only way the bite stays
 * invisible against a gradient — a fill matched to one sky colour is wrong
 * everywhere else on the screen, and wrong again a minute later as the day/
 * night clock turns.
 *
 * PARALLAX SPEC (consumed by src/explore/parallax.js)
 * ---------------------------------------------------------------------------
 * Five depth layers, each a horizontally tileable canvas. `speed` is the
 * fraction of the camera's movement the layer travels at:
 *
 *   sky      speed 0.00   full-screen gradient + sun/moon/stars (drawn, not tiled)
 *   clouds   speed 0.05   soft cloud band, tiles every 320px
 *   far      speed 0.15   distant mountain range, tiles every 320px
 *   mid      speed 0.40   mesas / closer hills, tiles every 320px
 *   dunes    speed 0.70   sand dune silhouette behind the walk line
 *   ground   speed 1.00   the ground strip the character walks on
 *
 * Layers are authored at 1x pixel scale and upscaled by the renderer, so the
 * pixel grid stays consistent with the sprites.
 */

import { PALETTE } from './palette.js';
import { bake, makeCanvas } from './pixel.js';
import { drawText, measureText } from './font.js';
import { makeRng } from '../core/rng.js';

const KEY = {
  '.': null,
  ' ': null,
  k: PALETTE.ink,
  K: PALETTE.inkSoft,
  g: PALETTE.green,
  G: PALETTE.greenLight,
  d: PALETTE.greenDark,
  r: PALETTE.sandDark,
  R: PALETTE.sandMid,
  s: PALETTE.sand,
  S: PALETTE.sandLight,
  z: PALETTE.sandDeep,
  b: PALETTE.bone,
  B: PALETTE.boneDark,
  w: PALETTE.wood,
  W: PALETTE.woodLight,
  x: PALETTE.woodDark,
  X: PALETTE.woodDeep,
  o: PALETTE.gold,
  O: PALETTE.goldLight,
  u: PALETTE.goldDark,
  e: PALETTE.red,
  E: PALETTE.redLight,
  q: PALETTE.redDark,
  n: PALETTE.ink,
  t: PALETTE.leather,
  T: PALETTE.leatherDark,
  y: PALETTE.grey,
  Y: PALETTE.steel,
  v: PALETTE.greyDark,
  c: PALETTE.skyDay,
  C: PALETTE.skyDayHigh,
};

/** Rotate a square pixel-string sprite a quarter turn clockwise. */
function rotate90(rows) {
  const n = rows.length;
  const out = [];
  for (let y = 0; y < n; y++) {
    let line = '';
    for (let x = 0; x < n; x++) line += rows[n - 1 - x][y];
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Props
//
// Every prop is lit from the top left and carries a 1px ink outline, matching
// the character sprites, and every one of them ends on a strip of sand so it
// sits in the ground rather than on top of it.
// ---------------------------------------------------------------------------

const PROPS = {
  /**
   * Saguaro. The arms leave the trunk low and turn upward — a cactus whose
   * arms hang down reads as a candelabra, which is the usual way this shape
   * goes wrong.
   */
  cactusTall: [
    '....kkkk....',
    '...kgGGgk...',
    '...kgGGgk...',
    '...kgGGgk...',
    '.kkkgGGgkkk.',
    'kgGkgGGgkgGk',
    'kgGkgGGgkgGk',
    'kgGkgGGgkgGk',
    'kgGkgGGgkgGk',
    'kgGggGGgggGk',
    'kgGggGGgggGk',
    '.kgggGGgggk.',
    '..kkgGGgkk..',
    '...kgGGgk...',
    '...kgGGgk...',
    '...kgGGgk...',
    '...kgGGgk...',
    '...kgGGgk...',
    '...kgddgk...',
    '...kgddgk...',
    '..krrrrrk...',
    '.krrrrrrrk..',
  ],
  cactusShort: [
    '...kkk..',
    '..kgGgk.',
    '..kgGgk.',
    'kkkgGgk.',
    'kgGgGgk.',
    'kgggGgk.',
    '.kkgGgk.',
    '..kgGgk.',
    '..kgGgk.',
    '..kgdgk.',
    '.krrrrk.',
    'krrrrrrk',
  ],
  /** Barrel cactus, ribbed and in flower. */
  cactusRound: [
    '..keke...',
    '.kkgGgkk.',
    'kgGgGgGgk',
    'kgGgGgGgk',
    'kgGgGgGgk',
    'kgGgGgGgk',
    '.kgGgGgk.',
    '..kgggk..',
    '..kdddk..',
    '.krrrrrk.',
  ],
  rockBig: [
    '....kkk....',
    '..kkRRRkk..',
    '.kRRRRRRRk.',
    'kRRSRRRRRRk',
    'kRRRRRRRrrk',
    '.krrrrrrrk.',
    '..kkkkkkk..',
  ],
  rockSmall: [
    '..kkk..',
    '.kRRRk.',
    'kRSRRRk',
    'krrrrrk',
    '.kkkkk.',
  ],
  /** Longhorn skull. The horns are what make it read at a glance, not the eyes. */
  skull: [
    '.k.......k.',
    '.kk.....kk.',
    'kbkk...kkbk',
    'kbbkkkkkbbk',
    '.kbbbbbbbk.',
    '.kbkbbbkbk.',
    '..kbbbbbk..',
    '..kbkkbk...',
    '...kbbk....',
  ],
  sign: [
    '.kkkkkkkkk.',
    'kwWWWWWWWWk',
    'kwWkkWkkWWk',
    'kwWWWWWWWWk',
    'kwWkWkkWWWk',
    'kwWWWWWWWWk',
    '.kkkkkkkkk.',
    '....kxk....',
    '....kxk....',
    '....kxk....',
    '...kkkkk...',
  ],
  bones: [
    'kk.....kk',
    'kbbkkkbbk',
    'kbbbbbbbk',
    '.kk...kk.',
  ],
  carrotGround: [
    '..kGk.kGk.',
    '.kGGkkGGk.',
    '.kkGGGGkk.',
    '..kOoooOk.',
    '..kOoooOk.',
    '...kouok..',
    '...kouok..',
    '....kok...',
    '....kk....',
  ],
  appleGround: [
    '....kd....',
    '...kdGk...',
    '..kEEeek..',
    '.kEEeeeek.',
    '.kEeeeeek.',
    '.kqeeeeqk.',
    '..kqeeqk..',
    '...kkkk...',
  ],
};

/**
 * Tumbleweed. One tangle, rolled a quarter turn per frame: a hand-drawn
 * four-frame cycle never quite keeps its mass, and this one cannot drift.
 */
const WEED = [
  '...kkk...',
  '.kkwBwkk.',
  '.kwkwkwk.',
  'kwBkwkBwk',
  'kBkwwwkBk',
  'kwBkwkBwk',
  '.kwkwkwk.',
  '.kkwBwkk.',
  '...kkk...',
];

const TUMBLEWEED = [WEED, rotate90(WEED), rotate90(rotate90(WEED)), rotate90(rotate90(rotate90(WEED)))];

// ---------------------------------------------------------------------------
// Sky bodies
// ---------------------------------------------------------------------------

/**
 * Waxing crescent, 16 x 16. 'b' is the lit face, 'B' the limb falling into
 * shadow, 'y' the maria; every other pixel is transparent, including the whole
 * dark side of the moon. See the note at the top of this file.
 */
const MOON = [
  '......BBB.......',
  '....BBbbB.......',
  '...Bbbbb........',
  '..Bbbbb.........',
  '.Bbbbb..........',
  '.Bbybb..........',
  'BBbyyb..........',
  'BBbybb..........',
  'BBbbbb..........',
  '.Bbbbb..........',
  '.Bbybb..........',
  '..Bbbbb.........',
  '..BBbbbb........',
  '...BBbbB........',
  '......BBB.......',
  '................',
];

/** The sun: the same 16 x 16 grid, filled. */
const SUN = [
  '......uuu.......',
  '....uOOOOOu.....',
  '...uOOOOOOOuu...',
  '..uOOOOOOOOOuu..',
  '.uOOOOOOOOOOOu..',
  '.uOOOOOOOOOOOu..',
  'uuOOOOOOOOOOOuu.',
  'uuOOOOOOOOOOOOu.',
  'uuOOOOOOOOOOOOu.',
  '.uOOOOOOOOOOOuu.',
  '.uOOOOOOOOOOOu..',
  '..uOOOOOOOOOuu..',
  '..uuOOOOOOOuu...',
  '...uuuuOOuuu....',
  '......uuuu......',
  '................',
];

// ---------------------------------------------------------------------------
// Buildings — 40 x 34 source pixels, ground line on the last row.
//
// Both are false-front frontier buildings: a tall flat parapet hiding a low
// roof, a boardwalk under a porch, and a sign the player can read from across
// the screen. The shop is the wider, busier one; the inn is quieter and taller
// so the two never get mistaken for each other on the horizon.
// ---------------------------------------------------------------------------

const SHOP = [
  '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
  '...kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk...',
  '...kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk...',
  '...kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk...',
  '...kXwWkkkkkkkkkkkkkkkkkkkkkkkkkkWwXk...',
  '...kXwWkbbbbbbbbbbbbbbbbbbbbbbbbkWwXk...',
  '...kXwWkbbbbbbbbbbbbbbbbbbbbbbbbkWwXk...',
  '...kXwWkbbbbbbbbbbbbbbbbbbbbbbbbkWwXk...',
  '...kXwWkbbbbbbbbbbbbbbbbbbbbbbbbkWwXk...',
  '...kXwWkbbbbbbbbbbbbbbbbbbbbbbbbkWwXk...',
  '...kXwWkbbbbbbbbbbbbbbbbbbbbbbbbkWwXk...',
  '...kXwWkbbbbbbbbbbbbbbbbbbbbbbbbkWwXk...',
  '...kXwWkkkkkkkkkkkkkkkkkkkkkkkkkkWwXk...',
  '...kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk...',
  '...kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk...',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '..kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk..',
  '..kxWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWxk..',
  '..kxkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkxk..',
  '...kxWwwwwwwwwwwwwwwwwwwwwwwwwwwwwWxk...',
  '...kxWkkkkkkkwwwkkkkkkkkwwwkkkkkkkWxk...',
  '...kxWkCcccckwwwkXwwwwXkwwwkCcccckWxk...',
  '...kxWkCcccckwwwkXwWWwXkwwwkCcccckWxk...',
  '...kxWkccccckwwwkXwWWwXkwwwkccccckWxk...',
  '...kxWkccccckwwwkXwwOwXkwwwkccccckWxk...',
  '...kxWkkkkkkkwwwkXwwwwXkwwwkkkkkkkWxk...',
  '...kxWwwwwwwwwwwkXwwwwXkwwwwwwwwwwWxk...',
  '...kxWwwwwwwwwwwkXwwwwXkwwwwwwwwwwWxk...',
  '...kxWwwwwwwwwwwkkkkkkkkwwwwwwwwwwWxk...',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk.',
  '.kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk.',
  '.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.',
  'ssssssssssssssssssssssssssssssssssssssss',
];

const INN = [
  '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '.....kXXXXXXXXXXXXXXXXXXXXXXXXXXXXk.....',
  '.....kXwwwwwwwwwwwwwwwwwwwwwwwwwwXk.....',
  '.....kXwWWWWWWWWWWWWWWWWWWWWWWWWwXk.....',
  '.....kXwWkkkkkkkkkkkkkkkkkkkkkkWwXk.....',
  '.....kXwWkbbbbbbbbbbbbbbbbbbbbkWwXk.....',
  '.....kXwWkbbbbbbbbbbbbbbbbbbbbkWwXk.....',
  '.....kXwWkbbbbbbbbbbbbbbbbbbbbkWwXk.....',
  '.....kXwWkbbbbbbbbbbbbbbbbbbbbkWwXk.....',
  '.....kXwWkbbbbbbbbbbbbbbbbbbbbkWwXk.....',
  '.....kXwWkbbbbbbbbbbbbbbbbbbbbkWwXk.....',
  '.....kXwWkbbbbbbbbbbbbbbbbbbbbkWwXk.....',
  '.....kXwWkkkkkkkkkkkkkkkkkkkkkkWwXk.....',
  '.....kXwWWWWWWWWWWWWWWWWWWWWWWWWwXk.....',
  '.....kXwwwwwwwwwwwwwwwwwwwwwwwwwwXk.....',
  '.....kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.....',
  '.....kwwwwwkkkkkwwwwwwwwkkkkkwwwwwk.....',
  '.....kwwwwwkOOkkwwwwwwwwkOOkkwwwwwk.....',
  '.....kwwwwwkOOOkwwwwwwwwkOOOkwwwwwk.....',
  '.....kwwwwwkkkkkwwwwwwwwkkkkkwwwwwk.....',
  '.....kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.....',
  '....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk....',
  '....kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk....',
  '....kxWWWWWWWWWWWWWWWWWWWWWWWWWWWWxk....',
  '....kxkkkkkkkkkkkkkkkkkkkkkkkkkkkkxk....',
  '.....kxWkkkkkkwwkkkkkkkkwwkkkkkkWxk.....',
  '.....kxWkCccckwwkXwwwwXkwwkCccckWxk.....',
  '.....kxWkcccckwwkXwWWwXkwwkcccckWxk.....',
  '.....kxWkkkkkkwwkXwwOwXkwwkkkkkkWxk.....',
  '.....kxWwwwwwwwwkXwwwwXkwwwwwwwwWxk.....',
  '.....kxWwwwwwwwwkkkkkkkkwwwwwwwwWxk.....',
  '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
  '...kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk...',
  '..rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..',
];

/**
 * The sign boards above are left blank in the art and lettered here, using the
 * game's own 5x7 font at 1:1. Hand-drawn letters at this size come out as
 * approximations of the real typeface; borrowing the font means the sign over
 * the shop and the text in the shop screen are literally the same glyphs.
 */
const SIGNS = {
  shop: { text: 'SHOP', x: 8, y: 5, boardW: 24 },
  inn: { text: 'INN', x: 10, y: 5, boardW: 20 },
};

function bakeBuilding(rows, sign) {
  const canvas = bake({ key: KEY, rows });
  const ctx = canvas.getContext('2d');
  const width = measureText(sign.text, 1);
  const x = sign.x + Math.floor((sign.boardW - width) / 2);
  drawText(ctx, sign.text, x, sign.y, {
    scale: 1,
    spacing: 1,
    color: PALETTE.woodDeep,
  });
  return canvas;
}

// ---------------------------------------------------------------------------
// Procedural parallax layers
// ---------------------------------------------------------------------------

/** Layer tile width in source pixels. Every scrolling layer uses this. */
export const LAYER_TILE_W = 320;

/**
 * Build a seamlessly tileable mountain silhouette.
 * The first and last column heights are forced equal so the tile wraps.
 */
function makeRidgeLayer({ seed, height, baseline, amplitude, roughness, colors }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);
  const heights = new Array(LAYER_TILE_W);

  // Sum a few sine waves whose periods divide the tile width — guarantees
  // that column 0 and column LAYER_TILE_W are identical.
  const waves = [];
  const count = 3 + Math.floor(roughness * 3);
  for (let i = 0; i < count; i++) {
    waves.push({
      periods: rng.int(1, 4 + i * 2),
      amp: (amplitude / (i + 1)) * rng.range(0.5, 1),
      phase: rng() * Math.PI * 2,
    });
  }
  for (let x = 0; x < LAYER_TILE_W; x++) {
    let h = baseline;
    for (const w of waves) {
      h += Math.sin((x / LAYER_TILE_W) * Math.PI * 2 * w.periods + w.phase) * w.amp;
    }
    heights[x] = Math.max(2, Math.round(h));
  }

  for (let x = 0; x < LAYER_TILE_W; x++) {
    const top = height - heights[x];
    // body
    ctx.fillStyle = colors.body;
    ctx.fillRect(x, top, 1, height - top);
    // A continuous lit crest along the top, darkening on the shaded (falling)
    // side. Drawn with >= so flat runs keep one solid rim instead of dashes.
    const slope = heights[x] - heights[(x - 1 + LAYER_TILE_W) % LAYER_TILE_W];
    ctx.fillStyle = slope >= 0 ? colors.light : colors.dark;
    ctx.fillRect(x, top, 1, Math.min(2, height - top));
  }
  return canvas;
}

/** Ground strip: packed sand with pebbles and a darker crust line. */
function makeGroundLayer({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);
  ctx.fillStyle = PALETTE.sandLight;
  ctx.fillRect(0, 0, LAYER_TILE_W, 2);
  ctx.fillStyle = PALETTE.sandMid;
  ctx.fillRect(0, 2, LAYER_TILE_W, 1);
  for (let i = 0; i < 420; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(3, height - 1);
    ctx.fillStyle = rng.chance(0.5) ? PALETTE.sandMid : PALETTE.sandDark;
    ctx.fillRect(x, y, rng.chance(0.2) ? 2 : 1, 1);
  }
  // The deeper the ground, the darker — reads as the road falling into shadow.
  for (let y = Math.floor(height * 0.6); y < height; y++) {
    const k = (y - height * 0.6) / (height * 0.4);
    ctx.globalAlpha = k * 0.55;
    ctx.fillStyle = PALETTE.sandDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** Cloud band: soft blobs on transparent background, tileable. */
function makeCloudLayer({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);
  const puff = (cx, cy, r, color) => {
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y)) * 1.9);
      const x = cx - w;
      ctx.fillRect(x, cy + y, w * 2, 1);
      if (x < 0) ctx.fillRect(x + LAYER_TILE_W, cy + y, w * 2, 1);
      if (x + w * 2 > LAYER_TILE_W) ctx.fillRect(x - LAYER_TILE_W, cy + y, w * 2, 1);
    }
  };
  for (let i = 0; i < 7; i++) {
    const cx = rng.int(0, LAYER_TILE_W);
    const cy = rng.int(8, height - 8);
    const r = rng.int(3, 7);
    puff(cx, cy, r, PALETTE.white);
    puff(cx + r, cy + 1, Math.max(2, r - 2), PALETTE.white);
    puff(cx - r, cy + 2, Math.max(2, r - 3), PALETTE.boneDark);
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let cache = null;

export function getEnvironmentSprites() {
  if (cache) return cache;

  const props = {};
  for (const [name, rows] of Object.entries(PROPS)) props[name] = bake({ key: KEY, rows });

  cache = {
    props,
    tumbleweed: TUMBLEWEED.map((rows) => bake({ key: KEY, rows })),
    sky: {
      moon: bake({ key: KEY, rows: MOON }),
      sun: bake({ key: KEY, rows: SUN }),
    },
    buildings: {
      shop: bakeBuilding(SHOP, SIGNS.shop),
      inn: bakeBuilding(INN, SIGNS.inn),
    },
    layers: {
      clouds: makeCloudLayer({ seed: 7717, height: 48 }),
      far: makeRidgeLayer({
        seed: 4242,
        height: 72,
        baseline: 34,
        amplitude: 18,
        roughness: 0.3,
        colors: { body: PALETTE.sandDeep, light: PALETTE.sandDark, dark: PALETTE.woodDeep },
      }),
      mid: makeRidgeLayer({
        seed: 1337,
        height: 64,
        baseline: 26,
        amplitude: 14,
        roughness: 0.6,
        colors: { body: PALETTE.sandDark, light: PALETTE.sandMid, dark: PALETTE.sandDeep },
      }),
      dunes: makeRidgeLayer({
        seed: 909,
        height: 44,
        baseline: 18,
        amplitude: 8,
        roughness: 0.9,
        colors: { body: PALETTE.sandMid, light: PALETTE.sand, dark: PALETTE.sandDark },
      }),
      ground: makeGroundLayer({ seed: 55, height: 72 }),
    },
  };
  return cache;
}

/** Source-pixel size of the sun and moon sprites. */
export const SKY_BODY_SIZE = 16;

/**
 * Parallax layer manifest. The renderer walks this array in order (back to
 * front); `y` is the layer's top edge measured from the horizon line.
 */
export const PARALLAX_MANIFEST = [
  { name: 'clouds', speed: 0.05, y: -104, tile: true },
  { name: 'far', speed: 0.15, y: -72, tile: true },
  { name: 'mid', speed: 0.4, y: -58, tile: true },
  { name: 'dunes', speed: 0.7, y: -34, tile: true },
  { name: 'ground', speed: 1.0, y: 0, tile: true },
];

/** Props that can be scattered along the road, with their placement weights. */
export const SCATTER_TABLE = [
  { name: 'cactusTall', weight: 18, anchor: 'ground' },
  { name: 'cactusShort', weight: 20, anchor: 'ground' },
  { name: 'cactusRound', weight: 12, anchor: 'ground' },
  { name: 'rockBig', weight: 14, anchor: 'ground' },
  { name: 'rockSmall', weight: 20, anchor: 'ground' },
  { name: 'skull', weight: 7, anchor: 'ground' },
  { name: 'bones', weight: 6, anchor: 'ground' },
  { name: 'sign', weight: 3, anchor: 'ground' },
];
