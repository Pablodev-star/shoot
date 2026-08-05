/**
 * SHOOT! — Environment art kit.
 *
 * The machinery every biome shares: the character-map colour key, the tile
 * width the whole parallax stack is authored to, and the three procedural layer
 * generators (ridge, cloud, and the speckle helper the ground layers use).
 *
 * It exists so a biome module (`src/art/biomes/*.js`) can be nothing but art —
 * pixel strings and a handful of generator calls — without importing the
 * registry that will later collect it. The registry imports the biomes; the
 * biomes import this. No cycles.
 *
 * THE KEY IS SHARED ON PURPOSE
 * ---------------------------------------------------------------------------
 * One letter means one colour everywhere in the game. `g` is cactus green in
 * the desert and it is still cactus green in the prairie — the prairie simply
 * does not use it, and reaches for `H` (grass) instead. A per-biome key would
 * let the same character map bake two different sprites, which is the fastest
 * way to lose track of what a piece of art actually looks like.
 *
 * WHICH IS WHY THE LAST FOUR BIOMES ARE DRAWN IN DIGITS AND PUNCTUATION
 * ---------------------------------------------------------------------------
 * Two biomes used every lowercase letter and most of the uppercase ones. Four
 * more needed another thirty-three colours, and there is no thirty-third
 * letter — so the pass is drawn in `1`-`5` (snow), `6`-`8` (ice) and `9`,`0`,`D`
 * (spruce), the bayou in what uppercase was left, and the basin and the void in
 * punctuation. It is uglier to read in the art than `h` for grass ever was, and
 * it is still the right trade: a character map that bakes one colour everywhere
 * can be moved between files, quoted in a comment, or read next to a sibling
 * sprite, and none of that survives a key that means different things in
 * different rooms.
 *
 * Each block below is a ramp, ordered light to dark, so a run like `^%$` shades
 * the same way `sSz` or `hHj` does.
 */

import { PALETTE } from './palette.js';
import { makeCanvas } from './pixel.js';
import { makeRng } from '../core/rng.js';

export const KEY = {
  '.': null,
  ' ': null,
  k: PALETTE.ink,
  K: PALETTE.inkSoft,
  // Cactus / foliage greens
  g: PALETTE.green,
  G: PALETTE.greenLight,
  d: PALETTE.greenDark,
  // Sand ramp
  r: PALETTE.sandDark,
  R: PALETTE.sandMid,
  s: PALETTE.sand,
  S: PALETTE.sandLight,
  z: PALETTE.sandDeep,
  // Grass ramp
  h: PALETTE.grassLight,
  H: PALETTE.grass,
  j: PALETTE.grassMid,
  J: PALETTE.grassDark,
  l: PALETTE.grassDeep,
  a: PALETTE.mossLight,
  A: PALETTE.moss,
  // Turned earth
  m: PALETTE.soilLight,
  M: PALETTE.soil,
  N: PALETTE.soilDark,
  P: PALETTE.soilDeep,
  // Wildflowers
  p: PALETTE.bloomPink,
  i: PALETTE.bloomBlue,
  f: PALETTE.bloomCream,
  // Bone / wood / metal / fruit
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
  // Snow ramp, light to dark
  1: PALETTE.snowLight,
  2: PALETTE.snow,
  3: PALETTE.snowMid,
  4: PALETTE.snowShade,
  5: PALETTE.snowDeep,
  // Ice
  6: PALETTE.iceLight,
  7: PALETTE.ice,
  8: PALETTE.iceDark,
  // Spruce
  9: PALETTE.pineLight,
  0: PALETTE.pine,
  D: PALETTE.pineDeep,
  // Bog water, light to dark, then what grows on and around it
  F: PALETTE.bogLight,
  I: PALETTE.bog,
  L: PALETTE.bogDark,
  Q: PALETTE.bogDeep,
  U: PALETTE.algae,
  V: PALETTE.lichen,
  Z: PALETTE.bogHaze,
  '+': PALETTE.rot,
  // Molten rock, then the burnt rock around it, then brimstone
  '<': PALETTE.magma,
  '>': PALETTE.magmaDeep,
  '~': PALETTE.emberGlow,
  '^': PALETTE.charLight,
  '%': PALETTE.char,
  $: PALETTE.charDark,
  '#': PALETTE.sulfur,
  '@': PALETTE.sulfurLight,
  // Void stone, then the light in it
  '!': PALETTE.voidRockLight,
  '?': PALETTE.voidRock,
  '&': PALETTE.voidRockDark,
  '=': PALETTE.astralLight,
  ':': PALETTE.astral,
  ';': PALETTE.astralDark,
};

/** Layer tile width in source pixels. Every scrolling layer uses this. */
export const LAYER_TILE_W = 320;

/** Rotate a square pixel-string sprite a quarter turn clockwise. */
export function rotate90(rows) {
  const n = rows.length;
  const out = [];
  for (let y = 0; y < n; y++) {
    let line = '';
    for (let x = 0; x < n; x++) line += rows[n - 1 - x][y];
    out.push(line);
  }
  return out;
}

/**
 * Build a seamlessly tileable ridge silhouette — mountains, mesas, dunes or
 * rolling hills, depending only on the numbers handed in.
 *
 * The first and last column heights are forced equal so the tile wraps: every
 * wave's period divides the tile width exactly.
 *
 * @param {object}   o
 * @param {number}   o.seed
 * @param {number}   o.height      canvas height in source pixels
 * @param {number}   o.baseline    mean ridge height
 * @param {number}   o.amplitude   how far the crest wanders from the baseline
 * @param {number}   o.roughness   0..1; more waves, so a more broken skyline
 * @param {object}   o.colors      { body, light, dark }
 * @param {number}   [o.crest]     thickness of the lit crest, default 2
 * @param {Function} [o.decorate]  (ctx, heights, rng) — anything drawn on top,
 *   e.g. the prairie's tree line. Runs with the ridge already painted.
 */
export function makeRidgeLayer({
  seed,
  height,
  baseline,
  amplitude,
  roughness,
  colors,
  crest = 2,
  decorate = null,
}) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);
  const heights = new Array(LAYER_TILE_W);

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
    ctx.fillStyle = colors.body;
    ctx.fillRect(x, top, 1, height - top);
    // A continuous lit crest along the top, darkening on the shaded (falling)
    // side. Drawn with >= so flat runs keep one solid rim instead of dashes.
    const slope = heights[x] - heights[(x - 1 + LAYER_TILE_W) % LAYER_TILE_W];
    ctx.fillStyle = slope >= 0 ? colors.light : colors.dark;
    ctx.fillRect(x, top, 1, Math.min(crest, height - top));
  }

  if (decorate) decorate(ctx, heights, rng, height);
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
export function makeCloudLayer({ seed, height, count = 7, size = [3, 7], tones, sag = 0 }) {
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

/**
 * Scatter single pixels of noise over a horizontal band of a ground layer.
 * Both biomes' ground strips are built the same way — a flat fill, a lit top
 * edge, then grit — and this is the grit.
 */
export function speckle(ctx, rng, { from, to, count, colors, wide = 0.2 }) {
  for (let i = 0; i < count; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(from, to);
    ctx.fillStyle = colors[rng.int(0, colors.length - 1)];
    ctx.fillRect(x, y, rng.chance(wide) ? 2 : 1, 1);
  }
}
