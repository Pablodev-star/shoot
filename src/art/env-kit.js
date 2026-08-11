/**
 * SHOOT! — Environment art kit.
 *
 * The machinery every biome shares: the character-map colour key, the tile
 * width the whole parallax stack is authored to, the three procedural layer
 * generators (ridge, cloud, and the speckle helper the ground layers use), the
 * geometry of the floor every road is drawn on, and the wings on every bird.
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
import { bake, makeCanvas } from './pixel.js';
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
  // Mesa rock, light to dark. The letters ran out four biomes ago (see below),
  // and these three arrived after even the punctuation had been dealt out.
  '-': PALETTE.mesaLight,
  _: PALETTE.mesa,
  '/': PALETTE.mesaDark,
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

// ---------------------------------------------------------------------------
// THE FLOOR
//
// The ground used to be one strip scrolling at exactly the camera's speed with
// the walk line along its top edge, and it had the two faults that always come
// with that: the traveller walked along the *back* of the ground he was
// standing on, with the whole of it in front of him and nothing behind, and the
// strip moved as one piece, so the pixel a pace from his boots and the pixel
// forty paces back crossed the screen together. A floor whose near edge and far
// edge travel at the same rate is a wall lying down.
//
// So the ground layer is now a PLANE seen at a shallow angle, and two things
// come out of that:
//
//  1. THE WALK LINE IS INSIDE IT, not on top of it. `PLANE_RISE` rows of floor
//     sit BEHIND the traveller and the rest in front, so he walks along a road
//     with a verge on both sides — which is the whole of the "it is a path,
//     not a ledge" feeling, and it costs nothing but where a number is.
//  2. EVERY ROW MOVES AT ITS OWN SPEED. The renderer slices the layer into
//     `PLANE_BANDS` horizontal strips and scrolls each at `planeSpeed` of its
//     row, so the grain at the traveller's boots races and the grain up by the
//     verge crawls. That single cue does more for the depth of the scene than
//     any amount of shading, because it is the one the eye cannot argue with:
//     things that are near move faster, and nothing else in the world does.
//
// WHAT THAT COSTS THE ART, AND THE ONE RULE IT IMPOSES
// ---------------------------------------------------------------------------
// Two neighbouring bands drift apart forever. So ANY MARK WITH VERTICAL EXTENT
// MUST FIT INSIDE ONE BAND — a rut drawn across four of them is torn into four
// pieces that slide away from each other. Use `bandFit` to place anything
// taller than a pixel.
//
// Nothing else is restricted, and in particular a row is free: a colour that
// is constant along x is untouched by a horizontal shift, and so is a dithered
// or randomly speckled one, because it looks the same wherever it is cut. That
// is why the floors below are built out of horizontal structure with band-local
// grain scattered over it, and why the boundary between road and verge is
// broken up with stones and tufts instead of with a wandering edge.
// ---------------------------------------------------------------------------

/**
 * How many rows of the ground layer lie BEHIND the walk line — the far half of
 * the floor, between the traveller's boots and the near ridge.
 *
 * Every ground layer in the game is 72 rows, so this is a little under a third
 * of the floor behind him and a little over two thirds in front. Pushed much
 * further the near ridge starts to look like a cliff he is standing at the foot
 * of; much less and he is back on the top edge.
 */
export const PLANE_RISE = 22;

/** Horizontal slices the renderer scrolls the floor in. */
export const PLANE_BANDS = 12;

/**
 * The perspective constant, in rows. It is the distance from the eye to the
 * walk line expressed in the same units as the floor, and it is the only knob
 * on how deep the plane reads: small numbers rake the floor away steeply (the
 * near edge tears past), large ones flatten it back towards the old single
 * speed. 46 puts the far edge at about two thirds of the camera's speed and the
 * near edge at about seven fifths, which is a road seen from a horse.
 */
const PLANE_EYE = 46;

/**
 * How fast a row of the floor scrolls, as a fraction of the camera's speed.
 *
 * Straight off the 1/z law a perspective floor obeys: screen row is inversely
 * proportional to depth, so speed is proportional to (row + eye). Normalised at
 * the walk line, so the row the boots land on travels at exactly 1 and the
 * traveller never slides along his own road.
 */
export function planeSpeed(y) {
  return (y + PLANE_EYE) / (PLANE_RISE + PLANE_EYE);
}

/**
 * The bands of a floor `height` rows deep: `{ y0, y1, speed, depth }` from far
 * to near, where `depth` runs 0 at the back of the plane to 1 at the camera.
 * Cached, because the renderer asks for this every frame and it only ever has
 * two or three answers.
 */
const bandCache = new Map();

export function planeBands(height) {
  const hit = bandCache.get(height);
  if (hit) return hit;
  const bands = [];
  for (let i = 0; i < PLANE_BANDS; i++) {
    const y0 = Math.round((height * i) / PLANE_BANDS);
    const y1 = Math.round((height * (i + 1)) / PLANE_BANDS);
    bands.push({ y0, y1, speed: planeSpeed((y0 + y1) / 2), depth: (y0 + y1) / 2 / height });
  }
  bandCache.set(height, bands);
  return bands;
}

/**
 * Slide a mark up or down so that the `h` rows starting at `y` land inside a
 * single band. Everything with a top and a bottom — a stone, a tuft, a boot
 * print, a puddle — is placed through here; see the note above for why.
 */
export function bandFit(y, h, height) {
  const [top, bottom] = bandRange(y, height);
  if (bottom - top <= h) return top;
  return Math.max(top, Math.min(Math.round(y), bottom - h));
}

/**
 * The rows a band covers, as `[top, bottom)`, for the band row `y` falls in.
 * Anything that wanders — a crack, a rut, a reflection — clamps itself to this
 * rather than being placed once and hoping.
 */
export function bandRange(y, height) {
  // Read straight off `planeBands` rather than recomputed, so the art and the
  // renderer can never disagree about where a boundary is by a pixel — which is
  // the one disagreement that would tear a mark in half however carefully it
  // was placed.
  const bands = planeBands(height);
  const i = Math.min(PLANE_BANDS - 1, Math.max(0, Math.floor((y / height) * PLANE_BANDS)));
  return [bands[i].y0, bands[i].y1];
}

/**
 * How much bigger a mark is at row `y` than one at the back of the plane. The
 * second half of the perspective — near things are not only faster, they are
 * larger, and a floor whose grain is the same size at both edges reads as
 * wallpaper however fast the bands move.
 */
export function planeZoom(y, height) {
  return planeSpeed(y) / planeSpeed(height * 0.02);
}

/**
 * Grain on a receding floor: dashes that get longer and sparser towards the
 * camera, each one a single row so it can never straddle a band.
 *
 * It is `speckle` with a perspective in it, and the two exist side by side
 * because the ridges still want the flat one — a mountain is not a plane seen
 * at an angle, and grain that grew towards the bottom of a cliff face would
 * read as the cliff leaning over.
 */
export function planeGrain(ctx, rng, { height, from, to, count, colors, wide = 0.25 }) {
  for (let i = 0; i < count; i++) {
    const y = rng.int(from, to);
    if (y < 0 || y >= height) continue;
    // Depth-weighted rejection: the far rows stand for more ground per row, so
    // the same number of marks would crowd them.
    const k = y / height;
    if (rng() > 0.35 + k * 0.65) continue;
    const zoom = planeZoom(y, height);
    const len = Math.max(1, Math.round((rng.chance(wide) ? 3 : 1) * zoom));
    ctx.fillStyle = colors[rng.int(0, colors.length - 1)];
    ctx.fillRect(rng.int(0, LAYER_TILE_W - 1), y, len, 1);
  }
}

/**
 * A stone, a tuft, a chip — anything small standing on the floor rather than
 * printed into it. Drawn as a body with a lit top row and a contact shadow
 * under it, sized by its depth, and always inside one band.
 *
 * The contact shadow is the psychological half of the trick: a mark with a
 * shadow under it is ON the plane, and the same mark without one is a stain in
 * the texture of it. Two hundred of those over a floor is what stops the eye
 * reading the whole strip as a flat picture of ground.
 */
export function planePebble(ctx, rng, { height, y, colors }) {
  const zoom = planeZoom(y, height);
  const w = Math.max(1, Math.round(rng.range(1, 2.4) * zoom));
  const h = Math.max(1, Math.round(rng.range(0.8, 1.6) * zoom));
  const py = bandFit(y, h + 1, height);
  const x = rng.int(0, LAYER_TILE_W - 1);
  ctx.fillStyle = colors.shadow;
  ctx.fillRect(x, py + h, w + 1, 1);
  ctx.fillStyle = colors.body;
  ctx.fillRect(x, py, w, h);
  ctx.fillStyle = colors.light;
  ctx.fillRect(x, py, Math.max(1, w - 1), 1);
}

// ---------------------------------------------------------------------------
// Birds
//
// Four poses of one wing, shared by everything with feathers in the game. They
// are frames of an ANIMATION and not four different birds: the body pixel never
// moves, only the two wings, so a bird flapping in place stays the same bird
// rather than jittering around its own centre.
//
// Each frame is a list of [dx, dy] wing pixels for the RIGHT half; the left is
// mirrored, which is what keeps a flap symmetrical without typing it twice. dy
// is positive downwards, as everywhere else on the canvas.
//
// The set is small on purpose. A bird a long way up is four or five pixels
// across, and past that the pose is not read as a pose — it is read as a shape
// changing, which is exactly what a flap is.
// ---------------------------------------------------------------------------

/**
 * Wing-beat cycle, deep to shallow: down-stroke, level, up-stroke, level. The
 * two level frames are the same list, and the cycle passes through it twice per
 * beat, which is what gives the beat its snap — a wing spends most of a stroke
 * near the middle of its travel and very little at the ends.
 */
const WING_BEAT = [
  [[1, 1], [2, 2], [3, 3]],
  [[1, 0], [2, 0], [3, 1]],
  [[1, -1], [2, -2], [3, -3]],
  [[1, 0], [2, 0], [3, 1]],
];

/**
 * A soaring wing: held out flat with the faintest dihedral, and the tip
 * feathers spread. This is the pose a vulture is in for minutes at a time, and
 * drawing one flapping across the whole sky was the single thing that gave away
 * that the old pair were two triangles on a circle.
 */
const WING_SOAR = [[1, -1], [2, -1], [3, 0], [4, 0]];

/** Wings half-folded, the shape a bird makes at the top of a bound. */
const WING_TUCK = [[1, 0], [2, 1]];

export const BIRD_POSES = {
  beat: WING_BEAT,
  soar: [WING_SOAR, [[1, -1], [2, -2], [3, -1], [4, 0]], WING_SOAR, [[1, 0], [2, 0], [3, 1], [4, 1]]],
  bound: [WING_BEAT[0], WING_BEAT[1], WING_TUCK, WING_BEAT[1]],
};

/**
 * Draw one bird at `x, y` (device pixels, its body pixel) in the pose given.
 *
 * @param {Array}  pose  one entry of BIRD_POSES
 * @param {number} frame which of the four, wrapped
 * @param {number} s     pixel size — the bird is drawn on the same grid as
 *   everything else, so a distant one is passed a smaller `s` rather than
 *   being scaled down and blurred
 */
export function drawBird(ctx, x, y, s, pose, frame) {
  const wing = pose[((frame % pose.length) + pose.length) % pose.length];
  ctx.fillRect(x, y, s, s);
  for (const [dx, dy] of wing) {
    ctx.fillRect(x + dx * s, y + dy * s, s, s);
    ctx.fillRect(x - dx * s, y + dy * s, s, s);
  }
}

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
 * Tumbleweed. One tangle, rolled a quarter turn per frame: a hand-drawn
 * four-frame cycle never quite keeps its mass, and this one cannot drift.
 * Twigs only — the old ink lattice read as a black scribble once it started
 * rolling across pale sand.
 *
 * It lives down here with the machinery rather than up in the desert, because
 * three places want it and none of them can import the other two: the menu
 * backdrop rolls it across the title screen, the biome registry hands it to
 * that backdrop, and the desert's own ambient sends one across the road.
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

let weedCache = null;

/** The four rolled frames, baked once and shared. */
export function getTumbleweedFrames() {
  if (!weedCache) {
    let rows = WEED;
    weedCache = [];
    for (let i = 0; i < 4; i++) {
      weedCache.push(bake({ key: KEY, rows }));
      rows = rotate90(rows);
    }
  }
  return weedCache;
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
