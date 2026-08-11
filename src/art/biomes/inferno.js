/**
 * SHOOT! — Inferno biome art (Brimstone Basin).
 *
 * The fifth world: a floor of cooled basalt with the heat still coming up
 * through the cracks in it, cinder cones on the horizon and one of them lit.
 *
 * THE LAND IS DARK SO THAT THE LIGHT IS SOMETHING
 * ---------------------------------------------------------------------------
 * The obvious way to draw a place like this is to make it orange, and the
 * obvious way is wrong. An orange landscape with orange lava in it has nothing
 * to look at: the lava is the same value as the rock, the embers vanish into
 * the sky, and the traveller — who is drawn in warm skin and leather — is
 * camouflaged against the whole frame.
 *
 * So the rock here is nearly black, and violet rather than neutral (see the
 * `char` ramp in the palette: basalt beside orange light genuinely does go
 * blue, and a neutral grey next to magma reads as dirty snow). Every warm pixel
 * on screen is therefore *emitting* — a crack, a vent, an ember, a pool — and
 * because there are so few of them, each one carries. It is the same trick the
 * night sky uses in every other biome, run in the daytime.
 *
 * GLOW IS DRAWN, NEVER BLURRED
 * ---------------------------------------------------------------------------
 * There is no shadow-blur or radial gradient anywhere in this file. A glow is
 * three concentric steps — `magmaDeep` around `magma` around `emberGlow` — laid
 * on the pixel grid, which is what a glow was before anyone could afford to
 * blur one, and it survives being drawn at 1x and scaled up by four. See
 * `glowPatch`.
 *
 * Shading is otherwise the rule every biome follows: no ink outline, light from
 * the top left, a darker tone of the same ramp down the right and lower edges,
 * and a contact shadow where a prop meets the ground — except that here the
 * contact shadow is often a contact *light*, because what is under the prop is
 * frequently brighter than the prop is.
 *
 * SCALE
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels. A cinder mound comes to his knee, a
 * vent to his chest, and the basalt columns are the one thing here taller than
 * he is — nothing grows in the basin, so its skyline has to be made of rock.
 */

import { PALETTE } from '../palette.js';
import { makeCanvas } from '../pixel.js';
import { makeRng } from '../../core/rng.js';
import {
  LAYER_TILE_W,
  bandFit,
  bandRange,
  makeCloudLayer,
  makeRidgeLayer,
  planeGrain,
  planePebble,
  planeZoom,
  speckle,
} from '../env-kit.js';

export const INFERNO_PROPS = {
  /**
   * A column of basalt, cracked across its width the way cooling rock always
   * cracks, and still hot in the seams. The glow is on the left face only —
   * the light is coming from the ground it stands in, not from the sky.
   */
  basaltColumn: [
    '..^%%$..',
    '.^%%%%$.',
    '.^%<%%$.',
    '.^%%%%$.',
    '.^%%%%$.',
    '.^<%%%$.',
    '.^%%%%$.',
    '.^%%<%$.',
    '.^%%%%$.',
    '.^%%%%$.',
    '.^<%%%$.',
    '.^%%%%$.',
    '.^%%%%$.',
    '.^%%<%$.',
    '.^%%%%$.',
    '^%%%%%%$',
    '^%%%%%%$',
    '><%%%%<>',
    '~><<<<>~',
  ],

  /** Its shorter neighbour. Nothing here stands alone; the basin broke evenly. */
  basaltStub: [
    '.^%%$.',
    '.^%%$.',
    '.^<%$.',
    '.^%%$.',
    '.^%%$.',
    '.^%<$.',
    '.^%%$.',
    '^%%%%$',
    '><%%<>',
    '~>><<~',
  ],

  /**
   * A fissure with the fire still in it. Widest in the middle and closed at
   * both ends, because a crack that runs off the edge of its own sprite reads
   * as a join between two tiles.
   */
  fissure: [
    '...$$$$$$$$$$....',
    '..$$>>>>>>$$$$...',
    '.$$><<<<<<<>>$$..',
    '$$><<~~~~<<<<>$$.',
    '$><<~~@@~~<<<<>$$',
    '$$><<~~~~<<<<>>$$',
    '.$$>><<<<<<>>$$..',
    '..$$$>>>>>>$$$...',
    '....$$$$$$$$.....',
  ],

  /**
   * A vent. The cone is built out of what it has thrown up, so it is coarse
   * all the way down, and the mouth of it is the brightest thing in the biome.
   */
  brimstoneVent: [
    '.....%%%.....',
    '....%$$$%....',
    '...%$>>>$%...',
    '..^%$><<>$%..',
    '..^%><@@<>%..',
    '.^%%$><<>$%%.',
    '.^%%%$>>$%%%.',
    '^%%#%%$$%%#%$',
    '^%#@#%%%%#@#$',
    '^%%#%%%%%%#%$',
    '^%%%%%%%%%%%$',
    '$><%%%%%%%<>$',
    '~>>><<<<>>>~.',
  ],

  /**
   * What is left of a tree that was here before the basin was. Charcoal all
   * the way through, with the last of the fire still working up the inside of
   * the trunk — which is why the glow is *inside* the silhouette and not
   * around it.
   */
  charredTree: [
    '..$...........',
    '..$$....$.....',
    '...$$..$$.....',
    '$...$$$$...$..',
    '.$$..$$$..$$..',
    '..$$.$<$.$$...',
    '...$$$<$$$....',
    '.....$<$......',
    '.....$<$......',
    '.$...$<$...$..',
    '..$$.$<$..$$..',
    '...$$$<$$$$...',
    '.....$<$......',
    '.....$<$......',
    '....$$<$$.....',
    '....$$<$$.....',
    '...^%$<$%$....',
    '..^%%%<%%%$...',
    '.$><<<<<<<>$..',
    '..~>>>>>>>~...',
  ],

  /** A pool of it, crusting over. The crust is the interesting part. */
  lavaPool: [
    '...$$$$$$$$$....',
    '..$>><<<<>>$$...',
    '.$><<~~~~<<<>$..',
    '$><~~@@@@~~<<>$.',
    '$<~~@@@@@@~~<<>$',
    '$><~~@@@@~~%<>$.',
    '.$><<~~~~<%%<>$.',
    '..$>><<<<>>$$$..',
    '...$$$$$$$$$....',
  ],

  /**
   * Brimstone: sulphur crystals grown around a warm crack. The only yellow in
   * the biome that is not fire, and the only thing in it that could be called
   * a plant without stretching the word too far.
   */
  sulfurCrystals: [
    '....@........',
    '...@#....@...',
    '...@#...@#...',
    '.@.@#..@#....',
    '.@#@#.@#.@...',
    '@#@#@#@#@#...',
    '@#%#%#%#%#@..',
    '^%%%%%%%%%%$.',
    '$><%%%%%<>$..',
    '.~>>><<>>~...',
  ],

  /** A cinder mound: loose scoria, too hot to sit on, glowing from underneath. */
  cinderMound: [
    '.....%%%%......',
    '...%%$$$$%%....',
    '..%$$%%%%$$%%..',
    '.%$$%%<%%%$$%%.',
    '%$%%%%%%<%%%$$%',
    '$%%<%%%%%%%<%%$',
    '$><%%<%%%<%%<>$',
    '~>>><<<<<<>>>~.',
  ],

  /**
   * A skull that has been through the fire. The sockets glow, because
   * something in the basin is still burning inside it — this is the only prop
   * in the game that is unambiguously supernatural, and it is placed rarely
   * enough that finding one is an event.
   */
  skullEmber: [
    '.b.......b.',
    '.bB.....Bb.',
    'bbB.....Bbb',
    'bbbBBBBBbbb',
    '.BbbbbbbbB.',
    '.Bb<bbb<bB.',
    '..bb~b~bb..',
    '..bB<<<Bb..',
    '...$><>$...',
    '...~>>~....',
  ],

  /**
   * An iron stake driven into the rock, glowing at the base where it goes in.
   * Somebody was marking a claim out here, and the basin took the rest of him.
   */
  ironStake: [
    '...Yy...',
    '...Yy...',
    '..vYyv..',
    '...Yy...',
    '...Yy...',
    '...Yy...',
    '..vYyv..',
    '...Yy...',
    '..~Yy~..',
    '.$><<>$.',
    '..~>>~..',
  ],

  // --- clutter -------------------------------------------------------------
  // The litter band, on its own tight grid under the props. Everything in it
  // carries one warm pixel at most: the basin's whole look depends on there
  // being very few of them, and a floor sprinkled with orange dots is a floor
  // with a rash.

  /** Loose scoria, thrown and cooled. */
  cinders: [
    '..%$..%..',
    '.%$$%.%$.',
    '%$$<$%$$%',
    '.~>>~.~>.',
  ],

  /** A chip of slag with the heat not quite out of it. */
  slagChip: [
    '...$$$...',
    '..$><<$..',
    '.$><~<>$.',
    '..~>>>~..',
  ],

  /** Bone that has been through the fire, and lost. */
  ashBone: [
    '..B......',
    '.BbB..B..',
    '..B..BbB.',
    '..$..$$..',
  ],

  /** Slag: what ran out of a vent, cooled, and never went anywhere. */
  slagFlow: [
    '.......$$$$$$....',
    '...$$$$>>>><<$$..',
    '.$$><<<<<<<<<<>$.',
    '$><<~~~<<~~<<<<>$',
    '$$>><<<<<<<<<>>$$',
    '..$$$>>>>>>>$$$..',
    '....$$$$$$$$$....',
  ],

  /** A rock the basin threw, still where it landed, with the strike under it. */
  emberRock: [
    '..^%%%$..',
    '.^%%%%%$.',
    '^%%%%%%%$',
    '^%%<%%%%$',
    '.^%%%%%$.',
    '..$%%%$..',
    '.$><<<>$.',
    '..~>>~...',
  ],

  /**
   * A bush that is on fire and has been for years. Burning scrub is the one
   * living silhouette in the basin, and it exists so that the eye has
   * something with a soft edge to land on between all the broken rock.
   */
  emberBush: [
    '...~..@..~...',
    '..~<~.@~.<~..',
    '.~<<~@@~<<~..',
    '~<<<<@@<<<<~.',
    '.<<<<<<<<<<~.',
    '..><<<<<<>>..',
    '..$>><<>>$$..',
    '.^%%$$$$%%%$.',
    '.$><<%%<<>$..',
    '..~>>>><~....',
  ],
};

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/**
 * A glow, drawn as three concentric steps on the pixel grid. Every hot thing
 * in the layers goes through here so they all cool off at the same rate.
 */
function glowPatch(ctx, x, y, r) {
  const rings = [
    { pad: r + 2, color: PALETTE.magmaDeep, alpha: 0.22 },
    { pad: r + 1, color: PALETTE.magma, alpha: 0.42 },
    { pad: r, color: PALETTE.emberGlow, alpha: 0.9 },
  ];
  for (const ring of rings) {
    ctx.globalAlpha = ring.alpha;
    ctx.fillStyle = ring.color;
    ctx.fillRect(x - ring.pad, y - Math.ceil(ring.pad / 2), ring.pad * 2 + 1, ring.pad + 1);
  }
  ctx.globalAlpha = 1;
}

const wrapX = (x) => ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;

/**
 * The dead cones on the plain: low, cold, and there to give the erupting one
 * something to be bigger than.
 *
 * Same argument as the peaks in `biomes/snow.js`: the ridge generator sums
 * sines, a sine has no corner in it, and a volcano is nothing *but* corners —
 * two straight slopes meeting a flat, notched summit. Left to the generator
 * this horizon came out as two smooth brown hills with a fire on one of them,
 * which is a moor with a bonfire.
 *
 * The LIVE one used to be drawn in here too, as whichever of these four
 * happened to come out tallest. It is not any more, and the reason is the one
 * thing about the basin that could not be fixed by drawing it better: this
 * layer is a 320-pixel tile, so the erupting cone and its plume came round
 * again every screen and a half, and on a wide window you could see three
 * eruptions at once. A volcano is a place, and you cannot have four of it. It
 * is a landmark now — see `buildInfernoLandmarks` — placed once every fourteen
 * hundred paces on its own world grid.
 */
function cinderCones(ctx, heights, rng, height) {
  const cones = Array.from({ length: 5 }, () => ({
    cx: rng.int(0, LAYER_TILE_W - 1),
    h: rng.int(10, 26),
    // Cinder cones are squat: a cone as steep as a mountain is a mountain.
    spread: rng.range(1.5, 2.4),
    crater: rng.int(3, 6),
  })).sort((a, b) => a.h - b.h);

  for (const cone of cones) {
    const half = Math.round(cone.h * cone.spread);
    const foot = height - heights[cone.cx];
    const summit = foot - cone.h;
    for (let dx = -half; dx <= half; dx++) {
      const x = wrapX(cone.cx + dx);
      const k = Math.abs(dx) / half;
      const local = Math.round(cone.h * (1 - k) + Math.sin(dx * 1.1) * 0.8);
      if (local <= 1) continue;
      let top = foot - local;
      // The crater: the summit is not a point, it is a hole with two lips.
      const inCrater = Math.abs(dx) <= cone.crater;
      if (inCrater) top = summit + cone.crater - Math.abs(dx) + 2;
      // Down to this column's own plain height and no further, or the cone
      // gets vertical sides where the plain happens to sit lower than it does
      // under the summit — see the same note in `biomes/snow.js`.
      const bottom = Math.min(height, height - heights[x] + 2);
      if (top >= bottom) continue;
      for (let y = Math.max(0, top); y < bottom; y++) {
        const lit = dx < 0;
        ctx.fillStyle = y === top && !inCrater
          ? (lit ? PALETTE.grey : PALETTE.char)
          : (lit ? PALETTE.charLight : PALETTE.char);
        ctx.fillRect(x, y, 1, 1);
      }
      // The scree that has run down the outside of it, in streaks.
      if (!inCrater && k > 0.25 && rng.chance(0.22)) {
        ctx.fillStyle = PALETTE.charDark;
        ctx.fillRect(x, Math.min(top + rng.int(1, 4), bottom - 1), 1, rng.int(2, 6));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The volcano
// ---------------------------------------------------------------------------

/**
 * THE MOUNTAIN THE WORLD IS NAMED AFTER
 * ---------------------------------------------------------------------------
 * One stratovolcano, drawn once, a hundred and forty pixels across and eighty
 * high — six times the traveller, and the biggest single piece of art in the
 * game. It stands on its own world grid rather than in a layer tile, so there
 * is never more than one of it on screen and it arrives as an event rather than
 * as a pattern.
 *
 * What makes it a volcano and not a triangle, in the order it matters:
 *
 *  1. THE PROFILE IS CONCAVE. A stratovolcano is built out of its own ejecta,
 *     so the slope steepens as it climbs and flattens out into a long apron at
 *     the foot. That curve — `k ** 1.75` below — is the single most
 *     recognisable thing about the shape, and it is what the old squat
 *     trapezoid never had.
 *  2. THE SUMMIT IS A HOLE. Not a point: a crater with two lips, the far one
 *     visible over the near one, and the fire in between them.
 *  3. LAVA RUNS DOWNHILL, IN CHANNELS. Three tongues leave the crater and take
 *     separate lines down the flanks, each one cooling from white through
 *     orange to dull red as it goes, and each one narrowing and stopping before
 *     it reaches the foot. A flow that runs the whole height of the mountain
 *     reads as a crack in the sprite.
 *  4. THE PLUME LEANS AND SPREADS. It climbs, drifts downwind and opens out at
 *     the top where it hits the inversion — the anvil every real ash column
 *     makes — and it goes from lit ash at the vent to cold grey by the time it
 *     is that wide.
 *  5. IT IS LIT FROM ITS OWN CRATER. The upper slopes catch the fire, so the
 *     rock nearest the summit is warmer than the rock at the foot. Every other
 *     mountain in the game is lit from the top left; this one is lit from the
 *     middle, and that is why it reads as burning rather than as sunlit.
 */
/** 4x4 ordered dither thresholds, normalised. See `makeVolcano`. */
const BAYER4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => (v + 0.5) / 16);

function makeVolcano(seed) {
  const w = 140;
  const h = 74;
  const { canvas, ctx } = makeCanvas(w, h);
  const rng = makeRng(seed);
  const cx = Math.round(w / 2);
  /** Rows of mountain, measured up from the bottom of the canvas. */
  const peak = 52;
  const foot = h;
  const summit = foot - peak;
  const crater = 7;

  const plot = (x, y, color, alpha = 1) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
  };

  /** The mountain's own outline: how high it stands at `dx` from the middle. */
  const profile = (dx) => {
    const half = w / 2;
    const k = Math.min(1, Math.abs(dx) / half);
    return peak * (1 - k ** 1.75);
  };

  /**
   * The crater, in three lines of arithmetic and a lot of consequence.
   *
   * `craterFar` is the far rim — the one you see across the bowl — and
   * `craterNear` the one nearest the camera. Both are arcs rather than lines,
   * so the summit is an ellipse seen from slightly above instead of a notch cut
   * out of a triangle, and the ground between them is the inside of the
   * mountain.
   */
  const craterArc = (dx) => Math.sqrt(Math.max(0, 1 - (dx / crater) ** 2));
  const craterFar = (dx) => summit + Math.round(3 - craterArc(dx) * 3);
  const craterNear = (dx) => summit + 4 + Math.round(craterArc(dx) * 3);

  // --- the cone ---
  for (let dx = -Math.floor(w / 2); dx < Math.ceil(w / 2); dx++) {
    const x = cx + dx;
    const local = Math.round(profile(dx) + Math.sin(dx * 0.7) * 0.9);
    if (local < 1) continue;
    const inCrater = Math.abs(dx) < crater;
    const top = inCrater ? craterNear(dx) : foot - local;
    for (let y = top; y < foot; y++) {
      const up = (foot - y) / peak;          // 0 at the foot, 1 at the summit
      /**
       * A cone is ROUND, so it is shaded across its width and not just down
       * one side. Three tones from the lit flank through the body to the far
       * flank — the same treatment a barrel gets in the props — because the
       * first pass used two, split at the middle, and a mountain painted in two
       * flat halves is a paper cut-out however good its outline is.
       */
      const across = dx / (w / 2);
      /**
       * Four tones with DITHERED boundaries. Picking the tone with three hard
       * comparisons — which is what the first pass did — painted the mountain
       * in four vertical stripes, and a cone in four flat stripes is a folded
       * paper fan. Rolling the die at the boundary scatters the change across a
       * few pixels of noise, which is the same thing the sky does with its
       * ordered dither and the reason that ramp reads as smooth.
       */
      const ramp = [PALETTE.grey, PALETTE.charLight, PALETTE.char, PALETTE.charDark];
      const f = ((across + 1) / 2) * (ramp.length - 1);
      /**
       * A 4x4 ordered threshold, the same one the sky's gradient is dithered
       * with. Two things it is not: a die rolled per pixel, which dithers the
       * boundary and textures the entire flank at the same time and came out
       * looking like television static; and a cheap `(x * 5 + y * 3) % 4`,
       * which is ordered but *periodic along a diagonal*, so the mountain came
       * out ribbed like corduroy. A Bayer matrix is the one arrangement of
       * sixteen thresholds with no visible structure of its own.
       */
      const dither = BAYER4[(y % 4) * 4 + (x % 4)];
      const step = Math.min(ramp.length - 1, Math.floor(f) + (f - Math.floor(f) > dither ? 1 : 0));
      const tone = ramp[step];
      // Rock warms towards the crater: the light in this world comes from the
      // hole in the top of this mountain.
      const hot = up > 0.74 && rng.chance((up - 0.74) * 2.6);
      ctx.fillStyle = hot ? PALETTE.magmaDeep : y === top && !inCrater ? PALETTE.grey : tone;
      ctx.fillRect(x, y, 1, 1);
    }
    /**
     * Ash layering: the bands of every eruption before this one, following the
     * contour of the cone. They are what makes it a STRATOvolcano rather than a
     * heap, and they are drawn as short arcs parallel to the outline rather
     * than as horizontal lines, because a horizontal line across a cone reads
     * as a shelf.
     */
    if (!inCrater && rng.chance(0.5)) {
      const depth = rng.int(3, Math.max(4, Math.round(local * 0.8)));
      const y = foot - local + depth;
      if (y < foot - 1) plot(x, y, rng.chance(0.5) ? PALETTE.charDark : PALETTE.char, 0.5);
    }
    // Gullies down both flanks, cut into the ash. Broken and half-strength:
    // solid black bars down a dithered slope read as railings leaning on it.
    if (!inCrater && rng.chance(0.09)) {
      let gy = foot - local + rng.int(2, 6);
      const len = rng.int(4, 13);
      for (let t = 0; t < len && gy + t < foot - 1; t++) {
        if (rng.chance(0.25)) continue;
        plot(x, gy + t, PALETTE.charDark, 0.7);
      }
    }
  }

  // --- the crater: the far wall in shadow, the lake at the bottom of it ---
  for (let dx = -crater + 1; dx < crater; dx++) {
    const x = cx + dx;
    const from = craterFar(dx);
    const to = craterNear(dx);
    for (let y = from; y < to; y++) {
      // The inside of the bowl: dark at the top where the far wall is in its
      // own shadow, then the lake.
      const k = (y - from) / Math.max(1, to - from);
      ctx.fillStyle = k < 0.45
        ? PALETTE.charDark
        : k < 0.7
          ? PALETTE.magmaDeep
          : rng.chance(0.25) ? PALETTE.sulfurLight : PALETTE.emberGlow;
      ctx.fillRect(x, y, 1, 1);
    }
    // The near lip, catching the light coming up out of the bowl. The far one
    // is only picked out on its lit side: a bright row all the way across the
    // top of the crater turned the summit into a table.
    plot(x, to, PALETTE.magmaDeep, 0.7);
    if (dx < 0) plot(x, from, PALETTE.charLight);
  }

  /**
   * The light standing over the crater. Not `glowPatch`: that draws concentric
   * rectangles, which is right for a vent seen flat-on in the floor and wrong
   * for this — the first pass put a solid pale BRICK on the summit, and at any
   * distance the mountain read as having a lit window in the top of it. A
   * column of rows narrowing as it rises is what a glow over a hole looks like
   * from the side.
   */
  for (let i = 0; i < 6; i++) {
    const half = Math.max(1, crater - 3 - i);
    const y = summit + 1 - i;
    for (let dx = -half; dx <= half; dx++) {
      // Faint, and gone within six rows. This is the light standing over the
      // hole, not a beam coming out of it.
      plot(cx + dx, y, i < 2 ? PALETTE.emberGlow : PALETTE.magma, 0.2 - i * 0.03);
    }
  }

  /**
   * --- the lava tongues ---
   * Each leaves the crater lip and walks downhill, wandering a little and
   * narrowing as it cools. The colour is a function of how far it has run, not
   * of where it is on the mountain: that is what makes it read as flowing
   * rather than as a painted stripe.
   *
   * They also stay ON the mountain — every step is clamped inside the profile —
   * because a flow that wanders off the silhouette is a crack in the sky.
   */
  for (let i = 0; i < 3; i++) {
    const dir = i === 1 ? (rng.chance(0.5) ? 1 : -1) : (i === 0 ? -1 : 1);
    let x = cx + dir * rng.int(2, crater - 1);
    let y = craterNear(x - cx) - 1;
    const len = rng.int(20, 36);
    for (let t = 0; t < len; t++) {
      const k = t / len;
      const width = Math.max(1, Math.round((1 - k) * 3));
      const color = k < 0.25 ? PALETTE.emberGlow : k < 0.6 ? PALETTE.magma : PALETTE.magmaDeep;
      // The crust either side of the channel, still glowing underneath.
      plot(x - 1, y, PALETTE.magmaDeep, 0.5);
      plot(x + width, y, PALETTE.magmaDeep, 0.5);
      for (let dw = 0; dw < width; dw++) plot(x + dw, y, color);
      y += 1;
      // Downhill means outward as well as down, and it wanders as it goes.
      x += dir * (rng.chance(0.5) ? 1 : 0) + rng.int(-1, 1);
      if (y >= foot - 1 || y < foot - profile(x - cx)) break;
    }
  }

  /**
   * --- the plume ---
   * Drawn as overlapping runs rather than scattered pixels: smoke has a body,
   * and a hundred single pixels drifting upwards is a swarm of flies. It leans
   * with `t * t` so it goes up before it goes sideways, and the spread opens
   * fastest at the top, which is the anvil every ash column makes when it hits
   * air it cannot climb through.
   */
  for (let y = summit - 1; y >= 0; y--) {
    const t = 1 - y / Math.max(1, summit);
    const lean = Math.round(t * t * 20);
    const spread = 4 + Math.round(t ** 1.35 * 20);
    const px = cx + lean + rng.int(-1, 1);
    const alpha = (1 - t * 0.55) ** 1.2 * 0.75;
    const color = t < 0.18 ? PALETTE.magmaDeep : t < 0.5 ? PALETTE.charLight : PALETTE.grey;
    for (let dx = -spread; dx <= spread; dx++) {
      // Solid through the middle, ragged at the edges: the chance of a pixel
      // being missing rises with the square of how far out it is.
      if (rng() < 0.85 * (Math.abs(dx) / spread) ** 2.2) continue;
      plot(px + dx, y, color, alpha);
    }
  }

  // Ash and bombs still in the air over the vent, thrown clear of the plume.
  for (let i = 0; i < 26; i++) {
    const t = rng();
    const y = summit - Math.round(t * 30);
    const x = cx + rng.int(-14, 22) + Math.round(t * t * 18);
    plot(x, y, rng.chance(0.4) ? PALETTE.magma : PALETTE.charDark, rng.range(0.4, 0.9));
  }

  return { canvas, cx, summit };
}

let volcanoCache = null;

function buildInfernoLandmarks() {
  if (!volcanoCache) {
    const built = makeVolcano(0x1a7a);
    volcanoCache = { volcano: built.canvas, crater: { x: built.cx, y: built.summit } };
  }
  return { volcano: volcanoCache.volcano };
}

/**
 * Seams of lava running down the middle ridge. They follow the slope, they
 * branch once, and they die out before they reach the bottom of the layer —
 * a seam that runs the full height of a layer looks like a crack in the
 * canvas rather than in the rock.
 */
function lavaSeams(ctx, heights, rng, height) {
  for (let i = 0; i < 9; i++) {
    let x = rng.int(0, LAYER_TILE_W - 1);
    let y = height - heights[x] + rng.int(1, 4);
    const len = rng.int(4, 13);
    for (let t = 0; t < len; t++) {
      const px = ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;
      ctx.fillStyle = t < len * 0.4 ? PALETTE.magma : PALETTE.magmaDeep;
      ctx.fillRect(px, y, 1, 1);
      if (rng.chance(0.3)) {
        ctx.fillStyle = PALETTE.emberGlow;
        ctx.fillRect(px, y, 1, 1);
      }
      y += 1;
      x += rng.int(-1, 1);
      if (y >= height) break;
    }
  }
}

/**
 * The near crags: a black ridge with heat leaking out from behind its crest,
 * so the rise closest to the player is rimmed in orange instead of being a
 * silhouette with nothing behind it.
 */
function cragRim(ctx, heights, rng, height) {
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const top = height - heights[x];
    const prev = heights[(x - 1 + LAYER_TILE_W) % LAYER_TILE_W];
    if (heights[x] > prev) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = PALETTE.magmaDeep;
      ctx.fillRect(x, top - 1, 1, 1);
      ctx.globalAlpha = 1;
    }
    if (rng.chance(0.05)) {
      ctx.fillStyle = PALETTE.magma;
      ctx.fillRect(x, top + rng.int(1, 4), 1, rng.int(1, 3));
    }
  }
}

/**
 * The near ledge at the bottom of the frame: broken crust a pace in front of
 * the traveller, with the fire still in the cracks of it.
 *
 * It is the only fringe in the game that emits rather than reflects. The other
 * five are the ground going into shadow as it comes towards the camera, which
 * is what ground does; this one gets *brighter* at the near edge, because the
 * light in the basin comes from underneath and the closest crack is the one
 * with the most of it showing.
 */
function makeInfernoFringe({ seed, height }) {
  return makeRidgeLayer({
    seed,
    height,
    baseline: Math.round(height * 0.6),
    amplitude: 4,
    roughness: 1,
    crest: 2,
    colors: { body: PALETTE.charDark, light: PALETTE.char, dark: PALETTE.shadow },
    decorate: (ctx, heights, rng, h) => {
      for (let x = 0; x < LAYER_TILE_W; x++) {
        const top = h - heights[x];
        // Spurs of cold rock standing off the lip.
        if (rng.chance(0.08)) {
          ctx.fillStyle = PALETTE.char;
          ctx.fillRect(x, top - rng.int(1, 4), rng.int(1, 2), 5);
        }
      }
      // Fissures running down the face of the ledge: dark first, then lit
      // along the middle, exactly as the ground's cracks are drawn.
      for (let i = 0; i < 22; i++) {
        let x = rng.int(0, LAYER_TILE_W - 1);
        const top = h - heights[x];
        let y = rng.int(top + 2, h - 2);
        const len = rng.int(5, 16);
        for (let t = 0; t < len; t++) {
          x = wrapX(x + rng.int(-1, 1));
          y += 1;
          if (y >= h) break;
          ctx.fillStyle = PALETTE.shadow;
          ctx.fillRect(x, y, 2, 1);
          ctx.fillStyle = t % 3 === 0 ? PALETTE.emberGlow : PALETTE.magma;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      // Grit and cinders over the whole face.
      speckle(ctx, rng, {
        from: h - Math.round(height * 0.4),
        to: h - 1,
        count: 180,
        colors: [PALETTE.char, PALETTE.shadow, PALETTE.charLight],
      });
    },
  });
}

/**
 * The ground: a cracked basalt floor with fire underneath it.
 *
 * The cracks are generated as a network rather than as scattered lines —
 * they start at the top edge, run down towards the camera and fork on the way,
 * which is how a cooling crust actually fractures. Each one is drawn dark
 * first and then lit along its middle, so the crack is a *gap* with heat
 * showing through it rather than an orange line painted onto the rock.
 */
function makeInfernoGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  ctx.fillStyle = PALETTE.char;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  /**
   * The road: a band of crust trodden flatter and paler than the rest of the
   * floor, with the walk line down the middle of it rather than along its top
   * edge.
   *
   * It is a straight band now. The old one wandered on a pair of sines, for a
   * good reason — an unbroken 320-pixel horizontal reads as a rule drawn across
   * the frame — but the floor is scrolled in depth bands and a wandering edge
   * crossing four of them is torn into four. What breaks the straightness
   * instead is what is lying ON the edge: scoria along both lips, in three
   * sizes, at three speeds. That is a better answer anyway, because the litter
   * moves with the ground it is lying on and the wave never did.
   */
  const roadTop = 10;
  const roadBot = 40;
  ctx.fillStyle = PALETTE.charLight;
  ctx.fillRect(0, roadTop, LAYER_TILE_W, roadBot - roadTop);
  // A dithered join at both lips rather than a cut: half the pixels of the row
  // are the road and half the crust, which the eye reads as a crumbling edge
  // and which survives being scrolled because it looks the same wherever it is
  // cut.
  for (const edge of [roadTop, roadBot - 1]) {
    for (let x = 0; x < LAYER_TILE_W; x++) {
      if (rng.chance(0.5)) continue;
      ctx.fillStyle = PALETTE.char;
      ctx.fillRect(x, edge, 1, 1);
    }
  }

  /**
   * Plates: broad polygons of slightly different value, so the floor is a
   * pavement rather than one sheet. They are the one thing here that WANTS to
   * be band-shaped — a cooling crust breaks into slabs, and a slab that is
   * three rows deep and thirty wide is what a slab of it looks like from this
   * angle — so each is fitted to a single depth band and given the width its
   * depth deserves.
   */
  for (let i = 0; i < 52; i++) {
    const cx = rng.int(0, LAYER_TILE_W);
    const cy = rng.int(0, height - 1);
    const zoom = planeZoom(cy, height);
    const rx = Math.round(rng.int(10, 34) * zoom);
    const ry = Math.max(1, Math.round(rng.int(1, 3) * zoom));
    const base = bandFit(cy, ry * 2 + 1, height);
    ctx.globalAlpha = rng.range(0.18, 0.4);
    ctx.fillStyle = rng.chance(0.5) ? PALETTE.charLight : PALETTE.charDark;
    for (let y = 0; y <= ry * 2; y++) {
      const k = (y - ry) / (ry + 0.001);
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - k * k)));
      ctx.fillRect(cx - half, base + y, half * 2 + 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  /**
   * --- the crack network ---
   *
   * A crack walks in a direction rather than straight down the screen. The
   * first version stepped one pixel towards the camera every iteration and
   * wandered less than a pixel sideways, so twenty of them came out as twenty
   * near-vertical orange lines standing on the road — the floor read as a
   * ploughed field, and the one thing a lava field is not is furrowed.
   *
   * They now travel mostly *across* the plate, the way a fracture in a cooling
   * crust does, they are shorter, and only about half their length is lit: a
   * crack that glows end to end is a strip light.
   */
  const drawCrack = (x0, y0, len, dx0, dy0, depth) => {
    let x = x0;
    let y = y0;
    let dx = dx0;
    let dy = dy0;
    // A crack is a mark with a top and a bottom, so it lives inside one depth
    // band or it is torn in half. It travels almost flat anyway — which is what
    // a fracture across a floor running away from you looks like — so the clamp
    // costs the shape nothing.
    const [bandTop, bandBottom] = bandRange(y0, height);
    for (let t = 0; t < len; t++) {
      const px = ((Math.round(x) % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;
      const py = Math.round(y);
      if (py < bandTop + 1 || py >= bandBottom - 1) return;
      // The crack: a dark lip either side of it, and the heat in the middle.
      // Wider nearer the camera, because it is nearer.
      const w = py > height * 0.6 ? 2 : 1;
      ctx.fillStyle = PALETTE.charDark;
      ctx.fillRect(px - 1, py - 1, w + 2, 3);
      const lit = t < len * 0.55;
      ctx.fillStyle = lit ? PALETTE.magmaDeep : PALETTE.charDark;
      ctx.fillRect(px, py, w, 1);
      if (lit && rng.chance(0.3)) {
        ctx.fillStyle = rng.chance(0.25) ? PALETTE.emberGlow : PALETTE.magma;
        ctx.fillRect(px, py, w, 1);
      }
      x += dx;
      y += dy;
      // It wanders, slowly, rather than jittering: a crack has a direction.
      dx += rng.range(-0.16, 0.16);
      dy += rng.range(-0.1, 0.1);
      dy = Math.max(-0.5, Math.min(0.5, dy));
      // Forks, once, and never from the last third — a crack that splits as it
      // dies reads as a mistake.
      if (depth < 1 && t > 2 && t < len * 0.6 && rng.chance(0.07)) {
        drawCrack(x, y, rng.int(4, 10), dy * 2.4, -dx * 0.35, depth + 1);
      }
    }
  };
  for (let i = 0; i < 22; i++) {
    drawCrack(
      rng.int(0, LAYER_TILE_W - 1),
      rng.int(2, height - 4),
      rng.int(8, 26),
      rng.chance(0.5) ? rng.range(0.9, 1.6) : rng.range(-1.6, -0.9),
      rng.range(-0.25, 0.25),
      0,
    );
  }

  // Vents: bright mouths sitting in the crust, mostly down near the camera
  // where there is room for the glow to spread.
  for (let i = 0; i < 11; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = bandFit(rng.int(Math.round(height * 0.25), height - 6), 4, height);
    // Radius 1 to 3 and no perspective scaling. A vent is a hole, and the glow
    // around it is drawn as concentric rectangles — scale one of those up by
    // the near end of the plane and you do not get a bigger vent, you get a
    // bright orange brick lying on the road.
    glowPatch(ctx, x, y, rng.int(1, 3));
  }

  // Ash drifted into the low corners of the crust, and cinder grit over
  // everything: the crust of a lava field is loose, not polished.
  for (let i = 0; i < 34; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(4, height - 2);
    ctx.globalAlpha = rng.range(0.1, 0.28);
    ctx.fillStyle = PALETTE.grey;
    ctx.fillRect(x, y, Math.round(rng.int(4, 16) * planeZoom(y, height)), 1);
  }
  ctx.globalAlpha = 1;
  planeGrain(ctx, rng, {
    height,
    from: 4,
    to: height - 1,
    count: 460,
    colors: [PALETTE.charLight, PALETTE.charDark],
  });

  // Scoria lying on the floor and along both lips of the road: cold rock on
  // top, a shadow under it, and a warm pixel where it has not finished cooling.
  for (let i = 0; i < 90; i++) {
    planePebble(ctx, rng, {
      height,
      y: rng.chance(0.35) ? rng.int(1, roadTop - 1) : rng.int(roadBot, height - 3),
      colors: {
        body: rng.chance(0.12) ? PALETTE.magmaDeep : PALETTE.charDark,
        light: PALETTE.charLight,
        shadow: PALETTE.shadow,
      },
    });
  }

  // And the shadow the crust falls into towards the camera. It is deep here:
  // there is no sky light down among the rocks, only what the cracks give.
  const near = Math.round(height * 0.58);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    ctx.globalAlpha = k * 0.7;
    ctx.fillStyle = PALETTE.charDark;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  return canvas;
}

// ---------------------------------------------------------------------------
// Ambient
// ---------------------------------------------------------------------------

/**
 * The air of the basin, which is the busiest air in the game because it is the
 * only one carrying two populations that move in opposite directions:
 *
 *   embers  rise, wander sideways, pulse, and go out. Brightest at night, but
 *           never absent — this is not weather, it is the ground breathing
 *   ash     falls, slowly, and is nearly invisible against the dark rock until
 *           it crosses something lit
 *
 * The two of them crossing is the whole effect. Either alone reads as dust.
 */
function createInfernoAmbient(seed) {
  const rng = makeRng(seed >>> 0);
  let clock = 0;

  const spawnEmber = (fresh) => ({
    x: rng(),
    y: fresh ? rng.range(0.6, 1.05) : rng.range(0.96, 1.06),
    vy: rng.range(-0.09, -0.03),
    sway: rng.range(0.004, 0.016),
    rate: rng.range(700, 2000),
    phase: rng.range(0, Math.PI * 2),
    life: rng.range(0.5, 1),
    big: rng.chance(0.2),
  });

  const embers = Array.from({ length: 40 }, () => spawnEmber(true));

  const ash = Array.from({ length: 26 }, () => ({
    x: rng(),
    y: rng(),
    vy: rng.range(0.012, 0.045),
    vx: rng.range(-0.02, -0.004),
    phase: rng.range(0, Math.PI * 2),
    a: rng.range(0.12, 0.34),
  }));

  return {
    update(dt) {
      clock += dt;
      const step = dt / 1000;
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y += e.vy * step;
        e.x += Math.sin(clock / e.rate + e.phase) * e.sway * step;
        // An ember does not leave the top of the screen; it burns out.
        if (e.y < 1 - e.life) embers[i] = spawnEmber(false);
      }
      for (const a of ash) {
        a.y += a.vy * step;
        a.x += a.vx * step;
        if (a.y > 1.05) {
          a.y = -0.05;
          a.x = rng();
        }
        if (a.x < -0.05) a.x = 1.05;
      }
    },

    render(ctx, view, sky) {
      const s = view.scale;
      // Embers read hardest against a dark sky, so they gain at night — but
      // they never drop below half strength, because the basin is lit from
      // below and the sun has very little to do with it.
      const heat = 0.55 + sky.stars * 0.45;

      ctx.fillStyle = PALETTE.grey;
      for (const a of ash) {
        ctx.globalAlpha = a.a * (0.5 + sky.light * 0.5);
        ctx.fillRect(
          Math.round((a.x * view.w) / s) * s,
          Math.round((a.y * view.h) / s) * s,
          s,
          s,
        );
      }
      ctx.globalAlpha = 1;

      for (const e of embers) {
        const flicker = 0.6 + 0.4 * Math.sin(clock / (e.rate * 0.3) + e.phase);
        // Fading as it climbs: an ember that reaches the top of the screen at
        // full brightness is a spark from something off-frame, not from here.
        const fade = Math.min(1, (e.y - (1 - e.life)) / (e.life * 0.6));
        const a = heat * flicker * fade;
        if (a < 0.04) continue;
        const x = Math.round((e.x * view.w) / s) * s;
        const y = Math.round((e.y * view.h) / s) * s;
        if (e.big) {
          ctx.globalAlpha = a * 0.2;
          ctx.fillStyle = PALETTE.magmaDeep;
          ctx.fillRect(x - s, y - s, s * 3, s * 3);
        }
        ctx.globalAlpha = Math.min(1, a * 0.7);
        ctx.fillStyle = PALETTE.magma;
        ctx.fillRect(x, y, s, s);
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = PALETTE.emberGlow;
        ctx.fillRect(x, y, s, Math.max(1, Math.round(s / 2)));
      }
      ctx.globalAlpha = 1;
    },
  };
}

// ---------------------------------------------------------------------------

export const INFERNO_ART = {
  id: 'inferno',

  props: INFERNO_PROPS,

  /**
   * Four layers of black rock would be one black rock. What separates them is
   * the light *between* them: the far cones carry the erupting plume, the
   * middle ridge carries seams running down its face, and the near crags carry
   * a rim of heat leaking over their crest. Each layer is therefore read
   * against the glow of the one behind it, which is the only depth cue that
   * works when everything in the frame is the same value.
   */
  buildLayers: () => ({
    /**
     * Not weather cloud — this is the smoke the basin makes for itself.
     *
     * The first pass gave it a `magmaDeep` belly, and against a blue daytime
     * sky the result was a row of red-and-grey boulders apparently floating
     * over the horizon: a lit underside only reads as lit when the thing above
     * it is dark, and at noon it is not. The belly is the darkest char instead,
     * and the only warm thing in the sky is the plume coming off the live cone
     * — which is where the light in this world is actually coming from.
     */
    clouds: makeCloudLayer({
      seed: 6161,
      height: 58,
      count: 7,
      size: [5, 11],
      sag: 3,
      tones: [PALETTE.grey, PALETTE.charLight, PALETTE.charDark],
    }),
    far: makeRidgeLayer({
      seed: 2727,
      height: 86,
      // The plain the cones stand on. `cinderCones` draws the dead ones and
      // the `landmarks` table below drops the live one in on its own grid.
      baseline: 26,
      amplitude: 9,
      roughness: 0.4,
      colors: { body: PALETTE.charLight, light: PALETTE.grey, dark: PALETTE.char },
      decorate: cinderCones,
    }),
    mid: makeRidgeLayer({
      seed: 8484,
      height: 68,
      baseline: 25,
      amplitude: 14,
      roughness: 0.65,
      colors: { body: PALETTE.char, light: PALETTE.charLight, dark: PALETTE.charDark },
      decorate: lavaSeams,
    }),
    crags: makeRidgeLayer({
      seed: 1919,
      height: 40,
      baseline: 18,
      amplitude: 9,
      roughness: 0.95,
      colors: { body: PALETTE.charDark, light: PALETTE.char, dark: PALETTE.shadow },
      crest: 2,
      decorate: cragRim,
    }),
    ground: makeInfernoGround({ seed: 7070, height: 72 }),
    fringe: makeInfernoFringe({ seed: 3030, height: 26 }),
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -110 },
    { name: 'far', speed: 0.15, y: -86 },
    { name: 'mid', speed: 0.4, y: -60 },
    { name: 'crags', speed: 0.7, y: -40, near: true },
    { name: 'ground', speed: 1.0, y: 0 },
    { name: 'fringe', speed: 1.9, y: -15, anchor: 'bottom', front: true },
  ],

  /**
   * The volcano, once every fourteen hundred paces — about four screens of
   * walking between sightings, so it leaves the frame entirely and comes back.
   * It stands on the far plain with the dead cones, and it is never mirrored:
   * the plume leans downwind, and the wind in this basin blows one way.
   */
  landmarks: [
    {
      name: 'volcano',
      after: 'far',
      speed: 0.15,
      spacing: 1400,
      jitter: 500,
      y: -28,
      flip: false,
    },
  ],

  buildLandmarks: buildInfernoLandmarks,

  /**
   * Weighted so the common roll is broken rock and the rare roll is fire.
   * Every lit prop in this table is a landmark by construction — there are so
   * few warm pixels in the frame that one glowing thing owns the screen — so
   * they are spaced out by being made rare rather than by any placement rule.
   */
  scatter: [
    { name: 'emberRock', weight: 17 },
    { name: 'cinderMound', weight: 15 },
    { name: 'basaltStub', weight: 13 },
    { name: 'fissure', weight: 11 },
    { name: 'slagFlow', weight: 9 },
    { name: 'basaltColumn', weight: 8 },
    { name: 'sulfurCrystals', weight: 7 },
    { name: 'lavaPool', weight: 6 },
    { name: 'charredTree', weight: 5 },
    { name: 'brimstoneVent', weight: 4 },
    { name: 'emberBush', weight: 3 },
    { name: 'ironStake', weight: 3 },
    { name: 'skullEmber', weight: 2 },
  ],

  /**
   * What the basin leaves lying: cinders, a chip of slag with the heat still
   * in it, and bone that has been through the fire.
   */
  clutter: [
    { name: 'cinders', weight: 13 },
    { name: 'slagChip', weight: 9 },
    { name: 'ashBone', weight: 5 },
  ],
  clutterCell: 22,

  /**
   * The far band: columns and burnt trunks standing on the crag behind the
   * road. The haze is the basin's own ember light rather than a grey — the
   * air down here is full of it, and distance in a place lit from below means
   * MORE glow, not less.
   */
  backdrop: {
    cell: 78,
    y: -8,
    gap: 0.3,
    haze: PALETTE.magmaDeep,
    hazeA: 0.3,
    scatter: [
      { name: 'basaltColumn', weight: 22 },
      { name: 'charredTree', weight: 14 },
      { name: 'cinderMound', weight: 10 },
    ],
  },

  scatterCell: 62,

  groundFill: PALETTE.charDark,

  /** Cinder, kicked up and briefly lit from below. */
  dust: 'rgba(255, 127, 34, 0.32)',

  /** Buildings out here are braced on cooled slag. */
  structureGround: { r: PALETTE.charDark, s: PALETTE.char },

  ambient: createInfernoAmbient,
};
