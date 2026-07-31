/**
 * SHOOT! — Environment art (Block 2b).
 *
 * Contains four families of artwork:
 *
 *  1. PROPS — hand-authored pixel strings: cacti (3 variants), rocks, cow
 *     skull, sign post, tumbleweed (4-frame roll), carrot and apple. Scenery
 *     carries no ink outline; see the note above PROPS.
 *  2. SKY BODIES — the sun (two tones, cross-faded by elevation) and the moon
 *     (eight phases), rasterised on the same pixel grid as everything else
 *     instead of being stroked as circles.
 *  3. BUILDINGS — the shop and the inn, drawn big and blocky so they read from
 *     far away while the camera scrolls past.
 *  4. PARALLAX LAYERS — generated procedurally from a seed at load time.
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
// SCENERY CARRIES NO OUTLINE
// ---------------------------------------------------------------------------
// The character, the enemies and the items are outlined in ink so they read as
// *things the player acts on*, and pop off whatever is behind them. The
// scenery is not one of those things: it is the picture the actors stand in
// front of. A black keyline around every cactus and every pebble put the
// backdrop on the same visual footing as the gunslinger, and in a scene lit by
// a moving sun it also nailed each prop to a colour the light never touches.
//
// So these props are shaded instead of outlined: light from the top left, a
// mid tone for the body, a dark tone of the SAME hue down the right-hand and
// lower edges, and — where a prop meets the sand — a `z` contact shadow. The
// silhouette is carried by contrast with the ground, which is how the parallax
// ridges behind them have always worked.
//
// Every prop still ends on its own footprint (a scuff of sand or a contact
// shadow) so the renderer can plant the bottom row straight on the walk line.
// ---------------------------------------------------------------------------

const PROPS = {
  /**
   * Saguaro. The arms leave the trunk low and turn upward — a cactus whose
   * arms hang down reads as a candelabra, which is the usual way this shape
   * goes wrong. Ribbed with a lit column (G), a body column (g) and a shaded
   * column (d) so the trunk keeps its round section without a keyline.
   */
  cactusTall: [
    '....gGgd....',
    '....gGgd....',
    '....gGgd....',
    '....gGgd....',
    'ggd.gGgd....',
    'gGd.gGgd....',
    'gGd.gGgd.ggd',
    'gGd.gGgd.gGd',
    'gGd.gGgd.gGd',
    'gGgggGgd.gGd',
    'gGgggGgd.gGd',
    '.ddggGgdggGd',
    '....gGgdggGd',
    '....gGgd.ddd',
    '....gGgd....',
    '....gGgd....',
    '....gGgd....',
    '....gGgd....',
    '....gddd....',
    '....gddd....',
    '..rRRRRRRr..',
    '.zrRRRRRRrz.',
  ],
  cactusShort: [
    '...gGgd.',
    '...gGgd.',
    '...gGgd.',
    'ggdgGgd.',
    'gGdgGgd.',
    'gGggGgd.',
    '.ddgGgd.',
    '...gGgd.',
    '...gGgd.',
    '...gddd.',
    '.rRRRRr.',
    'zrRRRRrz',
  ],
  /** Barrel cactus, ribbed and in flower. */
  cactusRound: [
    '...e.e...',
    '..EgGgE..',
    '.gGgGgGd.',
    'gGgGgGgGd',
    'gGgGgGgGd',
    'gGgGgGgGd',
    '.gGgGgGd.',
    '..gggdd..',
    '..ddddd..',
    '.zrRRRrz.',
  ],
  rockBig: [
    '....SSS....',
    '..SSRRRRr..',
    '.SRRRRRRrr.',
    'SRRRRRRRrrr',
    'SRRRRRRrrrr',
    '.rRRRRrrrr.',
    '..zzzzzzz..',
  ],
  rockSmall: [
    '..SSS..',
    '.SRRRr.',
    'SRRRRrr',
    '.rRRrr.',
    '..zzz..',
  ],
  /**
   * Longhorn skull. The horns are what make it read at a glance, not the eyes,
   * so the horns keep the lightest bone tone and the sockets are the only dark
   * pixels on it — a hole, not a keyline.
   */
  skull: [
    '.b.......b.',
    '.bB.....Bb.',
    'bbB.....Bbb',
    'bbbBBBBBbbb',
    '.BbbbbbbbB.',
    '.BbvbbbvbB.',
    '..bbbbbbb..',
    '..bBvvBb...',
    '...bbbb....',
  ],
  sign: [
    'wwwwwwwwwww',
    'wWWWWWWWWWw',
    'wWxxWxWxxWw',
    'wWWWWWWWWWw',
    'wWxWxxWxWWw',
    'wWWWWWWWWWw',
    'xxxxxxxxxxx',
    '....wXx....',
    '....wXx....',
    '....wXx....',
    '..zrRRRrz..',
  ],
  bones: [
    'bb.....bb',
    'bbbbbbbbb',
    'BBbBBBbBB',
    '.zz...zz.',
  ],
  carrotGround: [
    '..Gg..gG..',
    '.GGg..gGG.',
    '.gGGGGGGg.',
    '..OoooooO.',
    '..OoooooO.',
    '...Oooou..',
    '...oouu...',
    '....ou....',
    '....z.....',
  ],
  appleGround: [
    '....dg....',
    '...dgG....',
    '..EEeeee..',
    '.EEeeeeee.',
    '.Eeeeeeeq.',
    '.qeeeeeeq.',
    '..qeeeeq..',
    '...zqqz...',
  ],
};

/**
 * Tumbleweed. One tangle, rolled a quarter turn per frame: a hand-drawn
 * four-frame cycle never quite keeps its mass, and this one cannot drift.
 * Twigs only — the old ink lattice read as a black scribble once it started
 * rolling across pale sand.
 */
const WEED = [
  '...xwx...',
  '.xwBwBwx.',
  '.wxwBwxw.',
  'xwBxwxBwx',
  'wBxwwwxBw',
  'xwBxwxBwx',
  '.wxwBwxw.',
  '.xwBwBwx.',
  '...xwx...',
];

const TUMBLEWEED = [WEED, rotate90(WEED), rotate90(rotate90(WEED)), rotate90(rotate90(rotate90(WEED)))];

// ---------------------------------------------------------------------------
// Sky bodies
//
// Both discs are rasterised rather than hand-typed, for one reason: they are
// the only art in the game that has to change. The sun is baked twice — a
// white-hot noon disc and a red low disc — and the renderer cross-fades between
// them by elevation. The moon is baked once per phase and walks the phases as
// the days pass.
//
// THE MOON'S DARK SIDE
// ---------------------------------------------------------------------------
// The unlit part is not drawn at all. Those pixels are transparent, so whatever
// the sky happens to be at that height shows through exactly. That is the only
// way the bite stays invisible against a gradient — a fill matched to one sky
// colour is wrong everywhere else on the screen, and wrong again a minute later
// as the day/night clock turns.
// ---------------------------------------------------------------------------

/** Source-pixel size of the sun and moon sprites. */
export const SKY_BODY_SIZE = 16;

/** How many moon phases are baked. One step per in-game day. */
export const MOON_PHASE_COUNT = 8;

/**
 * Sun tones: index 0 is the low, red sun; index 1 the high one.
 *
 * The high sun's core is a paler yellow, not white. A white centre is what a
 * camera does when it blows out an exposure, not what the sun looks like — and
 * against a palette this warm it read as a hole in the sprite.
 */
const SUN_TONES = [
  { rim: '#a83a12', body: '#e8642a', core: PALETTE.goldLight },
  { rim: PALETTE.goldDark, body: PALETTE.gold, core: '#ffea9e' },
];

function discPixels(size, plot) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = (size - 1) / 2;
  const r = size / 2 - 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) continue;
      const color = plot(dx, dy, d, r);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** A sun disc: rim, body, and a core highlight sitting up and to the left. */
function makeSun(tones) {
  return discPixels(SKY_BODY_SIZE, (dx, dy, d, r) => {
    if (d > r - 1.1) return tones.rim;
    const core = Math.sqrt((dx + 1.6) ** 2 + (dy + 1.6) ** 2);
    return core < r * 0.46 ? tones.core : tones.body;
  });
}

/** Source-pixel size of the halo that sits behind a sky body. */
export const SKY_GLOW_SIZE = 44;

/**
 * The halo behind the sun or the moon, as pixel art rather than a radial
 * gradient. The falloff is quantised into six steps, so the glow reads as a set
 * of concentric bands on the pixel grid instead of a smooth airbrushed blob
 * that gives away that a canvas gradient was involved.
 */
function makeGlow(color, strength) {
  const { canvas, ctx } = makeCanvas(SKY_GLOW_SIZE, SKY_GLOW_SIZE);
  const c = (SKY_GLOW_SIZE - 1) / 2;
  const r = SKY_GLOW_SIZE / 2;
  const steps = 8;
  for (let y = 0; y < SKY_GLOW_SIZE; y++) {
    for (let x = 0; x < SKY_GLOW_SIZE; x++) {
      const d = Math.sqrt((x - c) ** 2 + (y - c) ** 2) / r;
      if (d >= 1) continue;
      // A steep falloff, so the outermost band is almost nothing and the halo
      // has no visible rim where it stops.
      const falloff = (1 - d) ** 3.2;
      const band = Math.round(falloff * steps) / steps;
      if (band <= 0) continue;
      ctx.fillStyle = color;
      ctx.globalAlpha = band * strength;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/**
 * One moon phase. `age` is 0..1 through the synodic month: 0 new, 0.25 first
 * quarter (lit on the right), 0.5 full, 0.75 last quarter (lit on the left).
 * The terminator is the projection of the disc's own circle, so the crescent
 * thins the way a real one does instead of being a circle cut by a circle.
 */
function makeMoonPhase(age) {
  const cosA = Math.cos(age * Math.PI * 2);
  const waxing = age <= 0.5;
  // Three fixed maria, in disc coordinates, so the face never rotates.
  const maria = [
    { x: -1.5, y: -2.2, r: 1.9 },
    { x: 1.8, y: 0.6, r: 2.4 },
    { x: -2.2, y: 2.4, r: 1.5 },
  ];
  return discPixels(SKY_BODY_SIZE, (dx, dy, d, r) => {
    const w = Math.sqrt(Math.max(0, r * r - dy * dy));
    const term = w * cosA;
    const lit = waxing ? dx >= term : dx <= -term;
    if (!lit) return null;
    // Limb darkening, and the same soft edge along the terminator.
    if (d > r - 1 || Math.abs(dx - (waxing ? term : -term)) < 0.9) return PALETTE.boneDark;
    for (const m of maria) {
      if (Math.sqrt((dx - m.x) ** 2 + (dy - m.y) ** 2) < m.r) return PALETTE.boneDark;
    }
    return PALETTE.bone;
  });
}

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

/**
 * Cloud band: soft blobs on a transparent background, tileable.
 *
 * `tones` is [top, base, underside]. The fair-weather band is white with a
 * bone underside; the storm band is a bruised grey with a near-black belly and
 * a bright top edge, so when the weather turns the sky above the player turns
 * with it instead of the rain simply appearing out of a blue sky.
 */
function makeCloudLayer({ seed, height, count = 7, size = [3, 7], tones, sag = 0 }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);
  const [top, base, belly] = tones || [PALETTE.white, PALETTE.white, PALETTE.boneDark];
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
  for (let i = 0; i < count; i++) {
    const cx = rng.int(0, LAYER_TILE_W);
    const cy = rng.int(8, height - 8);
    const r = rng.int(size[0], size[1]);
    puff(cx, cy, r, top);
    puff(cx + r, cy + 1, Math.max(2, r - 2), base);
    puff(cx - r, cy + 2, Math.max(2, r - 3), belly);
    // Storm cells hang lower than they are wide: a rain shaft needs a base.
    if (sag) puff(cx + rng.int(-r, r), cy + r - 1 + sag, Math.max(2, r - 2), belly);
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
      /** Low (red) and high (white) sun, cross-faded by elevation. */
      sun: [makeSun(SUN_TONES[0]), makeSun(SUN_TONES[1])],
      /**
       * One canvas per phase. The range stops short of new moon at both ends:
       * a night with literally no moon in it reads as a missing sprite, not as
       * astronomy. Phase 4 of 8 is full.
       */
      moon: Array.from({ length: MOON_PHASE_COUNT }, (_, i) =>
        makeMoonPhase(0.12 + (i / MOON_PHASE_COUNT) * 0.76),
      ),
      /** Halos: [low sun, high sun] and the moon's colder, tighter one. */
      glow: [makeGlow('#ff9a4c', 0.55), makeGlow('#ffd766', 0.34)],
      moonGlow: makeGlow('#b9c9ff', 0.26),
    },
    buildings: {
      shop: bakeBuilding(SHOP, SIGNS.shop),
      inn: bakeBuilding(INN, SIGNS.inn),
    },
    layers: {
      clouds: makeCloudLayer({ seed: 7717, height: 48 }),
      /**
       * The overcast deck. Not in the manifest — the parallax renderer fades it
       * in on top of the fair-weather band, by how much weather is out.
       */
      storm: makeCloudLayer({
        seed: 3391,
        height: 72,
        count: 11,
        size: [5, 11],
        sag: 3,
        tones: [PALETTE.grey, PALETTE.greyDark, '#2b2b33'],
      }),
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
