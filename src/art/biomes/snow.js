/**
 * SHOOT! — Snow biome art (Whitecrown Pass).
 *
 * The third world: a pass above the treeline. Packed snow underfoot, the last
 * of the spruce on the slope behind it, and peaks with rock showing through
 * their faces on the far horizon.
 *
 * WHITE IS THE HARDEST GROUND TO DRAW, FOR ONE REASON
 * ---------------------------------------------------------------------------
 * Snow has no local colour to shade with. The desert can put sandMid down the
 * right-hand side of a rock and the prairie can put grassDark under a bush, and
 * in both cases the shadow is a darker version of the thing itself. Do that
 * with white and you get grey, which reads as dirt, and a landscape of grey
 * lumps on a white field is what every first attempt at a snow level looks
 * like.
 *
 * So the snow ramp bends towards blue as it darkens (see `snowLight`..
 * `snowDeep` in the palette) and every shadow on this map is a *cold* shadow.
 * That is not a stylisation: it is what snow actually does, because a shaded
 * patch of it is lit by the sky rather than by the sun, and the sky is blue.
 * The single change that made this biome work was replacing every grey in it
 * with the blue at the same value.
 *
 * The rest of the rules are the ones the desert and the prairie already follow:
 * no ink outline anywhere, light from the top left, a darker tone of the SAME
 * ramp down the right and lower edges, and a contact shadow where a prop meets
 * the ground. See the note at the top of `biomes/desert.js`.
 *
 * SCALE
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels. A drift comes to his knee, a cairn
 * to his chest, and the last spruce on the pass is a shade taller than he is —
 * deliberately smaller than the prairie's oak, because a tree at this altitude
 * that towered over him would say "forest" when the whole point of the place is
 * that the forest has been left below.
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
} from '../env-kit.js';

export const SNOW_PROPS = {
  /**
   * The last spruce standing in the pass. Five tiers, each one a crust of snow
   * (`1`/`2`) lying on a bough (`9`/`0`/`D`) — snow ON the tree rather than
   * mixed INTO it, which is the difference between a snowy conifer and a
   * conifer someone has dusted with icing sugar.
   */
  spruceTall: [
    '..........1..........',
    '.........121.........',
    '.........90D.........',
    '........9900D........',
    '........11222........',
    '.......9900DDD.......',
    '......999000DDD......',
    '......111122222......',
    '.....99900000DDD.....',
    '....9999000000DDD....',
    '....1111222222222....',
    '...9999000000DDDDD...',
    '..999900000000DDDDD..',
    '..11111222222222222..',
    '.999990000000DDDDDDD.',
    '99999000000000DDDDDDD',
    '..99900000000DDDDDD..',
    '....900000000DDDD....',
    '.........Wwx.........',
    '.........Wwx.........',
    '.........Wwx.........',
    '........WWwxx........',
    '......322222223......',
    '....4322222222234....',
    '....4443333333444....',
  ],

  /** Its little brother, and the commonest thing standing on the slope. */
  spruceSmall: [
    '.......1.......',
    '......121......',
    '......90D......',
    '.....9900D.....',
    '.....11222.....',
    '....9900DDD....',
    '...999000DDD...',
    '...111222222...',
    '..99900000DDD..',
    '.9999000000DDD.',
    '999900000000DDD',
    '..9900000000D..',
    '......Wwx......',
    '......Wwx......',
    '....32222223...',
    '..443333333344.',
  ],

  /**
   * A fir the pass killed. Bare, frosted along the top of every branch, and
   * the one silhouette up here that is neither white nor green — which is what
   * makes a stretch of road with one on it read as a harder stretch.
   */
  deadFir: [
    '.......x.......',
    '.......X.......',
    '...2...x...2...',
    '...x2..X..2x...',
    '....xX.x.Xx....',
    '.2...xXxXx...2.',
    '.x2...xXx...2x.',
    '..xX..2X2..Xx..',
    '...x2.xXx.2x...',
    '....xXxXxXx....',
    '......xXx......',
    '..2...xXx...2..',
    '..x2..xXx..2x..',
    '...xX.xXx.Xx...',
    '.....xxXxx.....',
    '......xXx......',
    '......xXx......',
    '.....32X23.....',
    '...4322222234..',
    '...4443333334..',
  ],

  /**
   * Ice risen out of a crack in the pass. Blue all the way through, lit down
   * one edge only — ice has a light side and a dark side and nothing in
   * between, which is exactly what tells it apart from the snow around it.
   */
  iceSpikes: [
    '.....6.........',
    '.....7....6....',
    '.....7....7....',
    '.6...78...7....',
    '.7...78..678...',
    '.7...78..778...',
    '.78..788.778...',
    '.78..788.778.6.',
    '678..788.788.7.',
    '778.6788.788.78',
    '788678887788788',
    '.2233222332222.',
    '.4433333333344.',
  ],

  /** A boulder the pass has kept, wearing the cap it has worn all winter. */
  boulderIced: [
    '...11111...',
    '..1222221..',
    '.1YYYYYy3..',
    'YYYYYYYyyv.',
    'YYYYYYyyvvv',
    '.yYYYyyvvv.',
    '..2yyyvv2..',
    '.4322222234',
    '..44333344.',
  ],

  /**
   * A wind-carved drift. Its lee edge is undercut and its crest overhangs,
   * because wind does not pile snow in a heap — it builds it into a wave and
   * then leans on it. A symmetrical mound reads as a bap.
   */
  snowDrift: [
    '.......1111....',
    '....111222221..',
    '..112222222223.',
    '.1222222223333.',
    '1222222333333..',
    '2233333344444..',
    '.4444444444....',
  ],

  /** Stacked stones. Somebody came through here before you, and marked it. */
  cairn: [
    '....111....',
    '...12221...',
    '..1YYYYy3..',
    '.YYYYYyyv..',
    '..yYYyyvv..',
    '..1222221..',
    '.1YYYYYYy3.',
    'YYYYYYYyyv.',
    '.yYYYYyyvv.',
    '..12222221.',
    '.1YYYYYYYy3',
    'YYYYYYYYyyv',
    'yYYYYYyyvvv',
    '.4322222234',
    '..443333344',
  ],

  /** What is left of a felled trunk, filled to the brim with snow. */
  frozenStump: [
    '..1111111..',
    '.122222221.',
    '.1WwwwwwW1.',
    'WwWWxxxWWwW',
    'WwWWxWxWWwW',
    '.WwWWxWWwW.',
    '..Wwwwwww..',
    '..xwwwwwx..',
    '.4322222234',
    '..44333344.',
  ],

  /** A shrub that has not given up, holding a handful of snow off the ground. */
  shrubSnow: [
    '...11..111...',
    '..12211222...',
    '.1229D09221..',
    '.290DD0DD92..',
    '90D0DD0DD0D9.',
    '.0DD0DD0DD0..',
    '..4322222234.',
    '...44333344..',
  ],

  /**
   * The pass marker. Every high road has one, and it is the only thing in this
   * biome that was put there on purpose — which is why it is the only prop
   * carrying a straight line.
   */
  passMarker: [
    '.2222222222.',
    '.wwwwwwwwww.',
    'wWWWWWWWWWWw',
    'wWxxWxWxxWWw',
    'wWWWWWWWWWWw',
    'wWxWxxWxWWWw',
    'wWWWWWWWWWWw',
    'xxxxxxxxxxxx',
    '....2Xx.....',
    '....wXx.....',
    '....wXx.....',
    '...32Xx23...',
    '..432222234.',
    '..443333344.',
  ],

  // --- clutter -------------------------------------------------------------
  // The litter band, and it is deliberately the thinnest in the game: snow
  // buries things. What is left on top is a lump of it, a chip of ice off a
  // spike, and the last inch of something that was standing here in autumn.

  /** A lump of settled powder, lit on top, blue underneath. */
  snowLump: [
    '..1111...',
    '.1222221.',
    '.4322234.',
    '..44333..',
  ],

  /** A chip off an ice spike, lying where it fell. */
  iceChip: [
    '...66....',
    '..6778...',
    '.67788...',
    '..43334..',
  ],

  /** The tip of a buried branch. */
  buriedTwig: [
    '.....x2..',
    '..x2xX...',
    'xXx......',
    '.4433....',
  ],

  /** Somebody's horse, two winters ago. Half buried, and going nowhere. */
  skullFrost: [
    '.b.......b.',
    '.bB..2..Bb.',
    'bbB.....Bbb',
    'bbbBBBBBbbb',
    '.BbbbbbbbB.',
    '.Bbvbbbvb2.',
    '.32bbbbb23.',
    '4322222234.',
    '.443333344.',
  ],

  /** A slab of clear ice, quarried by the weather and left standing. */
  iceBlock: [
    '..6666666..',
    '.667777776.',
    '6777788877.',
    '67778887788',
    '6778887788.',
    '67788877888',
    '.778887788.',
    '.788877888.',
    '.32222223..',
    '.44333334..',
  ],

  /**
   * A fence line the winter has swallowed: two posts and the top rail, and
   * every other rail somewhere under your boots.
   */
  fenceBuried: [
    '..Ww.......Ww....',
    '..Ww.......Ww....',
    '.WWWWWWWWWWWWW...',
    '.xxwwwwwwwwwwx...',
    '..Ww.......Ww....',
    '.32222222222223..',
    '43222222222222234',
    '.443333333333344.',
  ],
};

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

const wrapX = (x) => ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;

/**
 * The peaks.
 *
 * THE RIDGE GENERATOR CANNOT MAKE A MOUNTAIN, AND IT SHOULD NOT TRY
 * ---------------------------------------------------------------------------
 * `makeRidgeLayer` builds its skyline out of summed sines. That is exactly
 * right for dunes, for rolling hills and for a bank of scrub, and it is
 * incapable of a summit: a sine has no corner in it, so however far the
 * amplitude is pushed the result is a row of green-hill humps with snow on
 * them. Turning the roughness up does not help either — it makes more humps.
 *
 * So the range is drawn ON the ridge rather than by it. The sine profile stays
 * as the foothills the peaks stand in, and this decorator puts seven proper
 * summits over it: straight slopes, a corner at the top, each one asymmetric,
 * each one a different height, and every one of them planted at the foothill
 * line so it belongs to the same range rather than floating over it.
 *
 * A peak is rock with snow on the top of it — never white all the way down.
 * Real mountains have a snow line, the line is what tells you how big they
 * are, and a white triangle is a paper cut-out. The lit face (left) keeps more
 * snow than the shaded one, and gullies of it run further down.
 */
function alpinePeaks(ctx, heights, rng, height) {
  const peaks = [];
  for (let i = 0; i < 7; i++) {
    peaks.push({
      cx: rng.int(0, LAYER_TILE_W - 1),
      h: rng.int(16, 38),
      lean: rng.range(-0.35, 0.35),
      snowLine: rng.range(0.4, 0.78),
      // Rock is more likely to be bare on the taller ones, which are steeper.
      bare: rng.range(0.35, 0.8),
    });
  }
  // Tallest last, so the big ones stand in front of the small ones.
  peaks.sort((a, b) => a.h - b.h);

  for (const peak of peaks) {
    const half = Math.round(peak.h * rng.range(0.7, 1.1));
    const foot = height - heights[peak.cx];
    const summit = foot - peak.h;
    for (let dx = -half; dx <= half; dx++) {
      const x = wrapX(peak.cx + dx);
      const k = Math.abs(dx) / half;
      // Straight slopes with a little erosion in them, leaning one way.
      const local = Math.round(
        peak.h * (1 - k) - peak.lean * dx + Math.sin(dx * 0.9) * 1.2,
      );
      if (local <= 1) continue;
      const top = foot - local;
      const lit = dx < 0;

      /**
       * THE SNOW LINE IS AN ALTITUDE, NOT A FRACTION OF THE SLOPE
       * ---------------------------------------------------------------------
       * It is one wandering horizontal across the whole peak, because that is
       * what a snow line is: the height at which it stops melting. Working it
       * out per column as a share of that column's own height puts it lower
       * on the flanks than on the summit, which is upside down.
       *
       * And it wanders on a pair of sines rather than per-pixel randomness.
       * The first version rolled a die for every pixel and the mountains came
       * out as television static — coherent tongues of snow reaching down a
       * gully are what the eye is looking for, and noise is what it gets from
       * an independent roll.
       */
      const lineY = summit
        + Math.round(peak.h * peak.snowLine)
        + Math.round(Math.sin(dx * 0.55 + peak.cx) * 3 + Math.sin(dx * 1.7) * 1.5)
        + (lit ? 3 : -2);

      /**
       * The peak stops at the foothill line OF THIS COLUMN, not of the one the
       * peak is centred on. Using the centre's foothill height left a
       * rectangle of rock hanging below the ridge silhouette wherever the
       * foothills dipped — a mountain with a straight bottom edge, floating.
       */
      const bottom = Math.min(height, height - heights[x] + 2);
      if (top >= bottom) continue;
      for (let y = Math.max(0, top); y < bottom; y++) {
        if (y === top) ctx.fillStyle = lit ? PALETTE.snowLight : PALETTE.snow;
        else if (y < lineY) ctx.fillStyle = lit ? PALETTE.snow : PALETTE.snowShade;
        // Distant rock is pale, not black. Anything darker than the steel here
        // and the range reads as a pine forest on the horizon.
        else ctx.fillStyle = lit ? PALETTE.steel : PALETTE.grey;
        ctx.fillRect(x, y, 1, 1);
      }

      // A striation or two in the bare rock, running with the slope.
      if (lineY < bottom - 2 && rng.chance(0.3)) {
        const y = rng.int(Math.max(top + 1, lineY), bottom - 2);
        ctx.fillStyle = lit ? PALETTE.grey : PALETTE.greyDark;
        ctx.fillRect(x, y, 1, rng.int(1, 3));
      }
    }
  }
}

/**
 * The spruce on the middle slope. Narrow cones with a lit left edge and a snow
 * pixel on the tip — at this distance that is the whole tree, and it is still
 * unmistakably a conifer, which the prairie's rounded crowns never are.
 */
function spruceLine(ctx, heights, rng, height) {
  const plot = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W, y, 1, 1);
  };
  for (let i = 0; i < 52; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const base = height - heights[cx] + 1;
    const h = rng.int(6, 13);
    for (let dy = 0; dy < h; dy++) {
      const k = dy / h;
      // Straight taper, not a sine: a spruce is a triangle and a fir is a
      // triangle, and the moment the profile curves it becomes a bush.
      const half = Math.round(k * (h < 9 ? 1.6 : 2.4));
      for (let dx = -half; dx <= half; dx++) {
        plot(cx + dx, base - h + dy, dx <= -half + 0 ? PALETTE.pine : PALETTE.pineDeep);
      }
    }
    plot(cx, base - h, PALETTE.snow);
    plot(cx, base - 1, PALETTE.pineDeep);
  }
}

/**
 * The lip along the near drift: an overhang of bright snow with a blue pocket
 * of shadow under it, and here and there a rock or a dead stem the wind has
 * scoured back out.
 */
function driftCornice(ctx, heights, rng, height) {
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const top = height - heights[x];
    const prev = heights[(x - 1 + LAYER_TILE_W) % LAYER_TILE_W];
    // Where the crest is falling away, the wind has left an overhanging lip.
    if (heights[x] < prev && rng.chance(0.5)) {
      ctx.fillStyle = PALETTE.snowLight;
      ctx.fillRect(x, top - 1, 1, 2);
      ctx.fillStyle = PALETTE.snowShade;
      ctx.fillRect(x, top + 2, 1, rng.int(1, 3));
    }
    if (rng.chance(0.06)) {
      ctx.fillStyle = rng.chance(0.5) ? PALETTE.greyDark : PALETTE.woodDark;
      ctx.fillRect(x, top - rng.int(1, 3), 1, rng.int(2, 4));
    }
  }
}

/**
 * The ground: a track trodden through deep snow, drawn as a floor running away
 * from the camera.
 *
 * The boots land `PLANE_RISE` rows down rather than on row zero, so there is
 * open snow behind the traveller as well as in front of him and the track is
 * something he is walking ALONG rather than standing at the back of. The
 * renderer scrolls the rows at their own speeds, which is why nothing below has
 * a wandering edge and why every print, runner and ice sheet is placed with
 * `bandFit` — see the note over `PLANE_RISE` in `env-kit.js`.
 *
 * Three things make it read as snow rather than as pale sand: the track is a
 * *colder* value than the untouched snow rather than a warmer one (a path is
 * packed, and packed snow is the stuff the sky lights), it carries boot prints
 * in pairs down its middle, and there are sheets of exposed ice in it where the
 * wind has scoured the powder away.
 */
function makeSnowGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  /** Where the trodden band begins and ends. The walk line is at 22. */
  const top = 8;
  const bot = 38;

  ctx.fillStyle = PALETTE.snow;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  // --- the trodden band ---
  ctx.fillStyle = PALETTE.snowMid;
  ctx.fillRect(0, top, LAYER_TILE_W, bot - top);
  // The far lip catches the light; the near one is the edge of a rut.
  ctx.fillStyle = PALETTE.snowLight;
  ctx.fillRect(0, top, LAYER_TILE_W, 1);
  ctx.fillStyle = PALETTE.snowShade;
  ctx.fillRect(0, bot - 2, LAYER_TILE_W, 2);

  // Sled runners: two shallow blue lines, one on each side of the boots, that
  // break rather than run true.
  for (const y of [14, 32]) {
    for (let x = 0; x < LAYER_TILE_W; x++) {
      if (rng.chance(0.26)) continue;
      ctx.fillStyle = PALETTE.snowShade;
      ctx.fillRect(x, y, 1, Math.max(1, Math.round(planeZoom(y, height) - 0.4)));
    }
  }

  // Boot prints, in pairs, staggered down the middle of the track. Two pixels
  // of cold shadow with one bright pixel of thrown snow behind the toe, and
  // both feet inside one band so a stride is never torn in half.
  for (let x = 4; x < LAYER_TILE_W; x += rng.int(9, 14)) {
    const py = bandFit(rng.int(top + 3, bot - 6), 5, height);
    const w = Math.max(2, Math.round(2 * planeZoom(py, height)));
    for (let foot = 0; foot < 2; foot++) {
      const fy = py + foot * 3;
      ctx.fillStyle = PALETTE.snowDeep;
      ctx.fillRect(x, fy, w, 1);
      ctx.fillStyle = PALETTE.snowShade;
      ctx.fillRect(x, fy + 1, w, 1);
      ctx.fillStyle = PALETTE.snowLight;
      ctx.fillRect(x - 1, fy, 1, 1);
    }
  }

  /**
   * Scoured ice: flat sheets with a bright rim on the windward side, wider the
   * nearer they lie.
   *
   * They lie OFF the track, on either side of it. Scattered over the whole
   * layer they broke the trodden band up into blue islands and the road stopped
   * being findable at all — which matters more here than anywhere else, because
   * white on white is the one biome where the road has almost no contrast to
   * spare.
   */
  for (let i = 0; i < 12; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const cy = rng.chance(0.3) ? rng.int(1, top - 1) : rng.int(bot + 1, height - 6);
    const zoom = planeZoom(cy, height);
    const rx = Math.round(rng.int(4, 13) * zoom);
    const ry = Math.max(1, Math.round(rng.int(1, 2) * zoom));
    const base = bandFit(cy, ry * 2 + 1, height);
    for (let y = 0; y <= ry * 2; y++) {
      const k = (y - ry) / (ry + 0.001);
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - k * k)));
      ctx.fillStyle = y < ry ? PALETTE.iceLight : PALETTE.ice;
      ctx.fillRect(cx - half, base + y, half * 2 + 1, 1);
    }
  }

  // --- the fresh snow in front of the track ---
  const near = Math.round(height * 0.6);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    ctx.globalAlpha = k * 0.65;
    ctx.fillStyle = PALETTE.snowDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  // Stones and stems the wind has scoured back out of the drift, on both sides
  // of the track, each with its own blue pocket of shadow.
  for (let i = 0; i < 46; i++) {
    planePebble(ctx, rng, {
      height,
      y: rng.chance(0.35) ? rng.int(1, top - 1) : rng.int(bot + 1, height - 3),
      colors: { body: PALETTE.greyDark, light: PALETTE.grey, shadow: PALETTE.snowDeep },
    });
  }

  /**
   * Sastrugi: the ridges wind cuts into open snow. Shallow arcs, lit on top
   * and blue underneath — the same pass the desert makes over its sand, which
   * is not a coincidence. Wind does the same thing to both, and drawing them
   * with the same hand is what keeps the six worlds looking like one game.
   */
  for (let i = 0; i < 130; i++) {
    const y0 = rng.int(1, height - 3);
    const [bandTop, bandBottom] = bandRange(y0, height);
    const zoom = planeZoom(y0, height);
    const x0 = rng.int(-10, LAYER_TILE_W);
    const len = Math.round(rng.int(8, 26) * zoom);
    // The arc's rise is capped to the band it started in: an arc that climbed
    // out of one band and back into the next would be cut in two and the two
    // halves would slide apart down the road.
    const amp = Math.min(bandBottom - bandTop - 2, Math.round(rng.range(1, 3) * zoom));
    for (let t = 0; t < len; t++) {
      const x = ((x0 + t) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
      const y = Math.round(
        Math.min(bandBottom - 2, Math.max(bandTop + 1, y0 - Math.sin((t / len) * Math.PI) * amp)),
      );
      ctx.fillStyle = PALETTE.snowShade;
      ctx.fillRect(x, y + 1, 1, 1);
      ctx.fillStyle = PALETTE.snowLight;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  planeGrain(ctx, rng, {
    height,
    from: 1,
    to: height - 1,
    count: 340,
    colors: [PALETTE.snowLight, PALETTE.snowMid],
    wide: 0.12,
  });

  return canvas;
}

/**
 * The near drift at the bottom of the frame: the bank of snow the traveller is
 * walking past, a pace closer than he is and moving faster than the camera.
 *
 * It is the coldest thing in the biome rather than the brightest, which is the
 * opposite of what every other layer does up here. Everything behind it runs
 * blue to white as it comes forward; this one turns back to blue, because it
 * is in the traveller's own shadow — and that reversal is what stops it
 * reading as one more white band in a stack of them.
 */
function makeSnowFringe({ seed, height }) {
  return makeRidgeLayer({
    seed,
    height,
    baseline: Math.round(height * 0.58),
    amplitude: 5,
    roughness: 1,
    crest: 3,
    colors: { body: PALETTE.snowShade, light: PALETTE.snowMid, dark: PALETTE.snowDeep },
    decorate: (ctx, heights, rng, h) => {
      for (let x = 0; x < LAYER_TILE_W; x++) {
        const top = h - heights[x];
        // A wind lip along the crest, bright over a blue pocket.
        if (rng.chance(0.4)) {
          ctx.fillStyle = PALETTE.snowLight;
          ctx.fillRect(x, top - 1, 1, 2);
        }
        // Stems and stones the wind has scoured back out of the drift.
        if (rng.chance(0.05)) {
          ctx.fillStyle = rng.chance(0.5) ? PALETTE.pineDeep : PALETTE.greyDark;
          ctx.fillRect(x, top - rng.int(2, 6), 1, 7);
        }
      }
      // Sastrugi across the face of it, the same pass the open snow gets.
      for (let i = 0; i < 70; i++) {
        const x0 = rng.int(0, LAYER_TILE_W - 1);
        const y0 = rng.int(h - heights[x0] + 2, h - 1);
        const len = rng.int(6, 18);
        for (let t = 0; t < len; t++) {
          const x = wrapX(x0 + t);
          const y = Math.round(y0 - Math.sin((t / len) * Math.PI) * 1.5);
          if (y < h - heights[x] || y >= h) continue;
          ctx.fillStyle = PALETTE.snowMid;
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = PALETTE.snowDeep;
          ctx.fillRect(x, y + 1, 1, 1);
        }
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Ambient
// ---------------------------------------------------------------------------

/**
 * THE AURORA
 * ---------------------------------------------------------------------------
 * The counterpart of the prairie's fireflies: the thing that makes nightfall a
 * change of character rather than a change of brightness. It was three flat
 * green-and-cyan curtains drawn on top of the finished frame, and it had three
 * separate things wrong with it.
 *
 * IT WAS IN FRONT OF THE MOUNTAINS. Drawn with the rest of the ambient life —
 * after the lighting pass, over everything — so a light forty miles up was
 * painted across peaks eight miles away, and the pass looked like it had green
 * gauze hung in front of it. It is drawn through `renderSky` now, inside the
 * renderer's `destination-over` pass, which puts it behind every solid thing in
 * the scene and in front of nothing but the sky itself. See the call site in
 * `src/explore/parallax.js`.
 *
 * IT WAS ONE COLOUR PER CURTAIN. A real aurora is not: the same curtain is red
 * at the top, green through the body and violet along the hem, because those
 * are three different gases lit at three different altitudes — atomic oxygen
 * high up, atomic oxygen lower down, ionised nitrogen at the bottom edge. So
 * every curtain here is drawn through a vertical RAMP rather than a colour, and
 * the ramps are the real ones: the common green display, the rare all-red one,
 * and the violet-hemmed green of a strong substorm. Which display you get is
 * rolled per night, so the pass does not look the same twice.
 *
 * IT HAD NO STRUCTURE. An aurora is made of RAYS — near-vertical shafts along
 * the field lines, brightening and dying independently — and folds, where the
 * whole curtain kinks back on itself. Both are here: a per-column ray gain
 * running on its own drifting noise, and a fold term in the curtain's base
 * curve. Together they are the difference between a light in the sky and a
 * green stripe.
 *
 * Everything is composited `lighter`, because light in the sky ADDS to what is
 * behind it — an aurora painted with ordinary alpha puts a grey film over the
 * stars — and the hem is the brightest part of every curtain, because a curtain
 * is lit from the bottom, where the air it is exciting actually is.
 *
 * The rest of what the air does up here:
 *
 *   spindrift  loose snow the wind lifts off the drifts and drives along the
 *              ground. It is not weather — it blows on a clear day too, and
 *              that is the point: the pass is never still
 *   glints     the sun catching single crystals, out only in daylight
 */

/**
 * The displays, as vertical ramps: [top, upper, body, hem]. Every one of them
 * is a real auroral spectrum rather than a colour somebody liked.
 */
const AURORA_DISPLAYS = [
  // The common one: oxygen green with the faintest red crown over it.
  { name: 'green', ramp: ['#4d2a52', '#2f7a5a', '#57d68f', '#a8f7c0'], weight: 5 },
  // A strong substorm: green body, violet hem where the nitrogen lights up.
  { name: 'violet', ramp: ['#3a2a6a', '#4a56b0', '#4fd6a0', '#c8a0ff'], weight: 3 },
  // High red aurora — rare, and the one that makes a night memorable.
  { name: 'red', ramp: ['#5a1030', '#9c2440', '#d4553f', '#f0a060'], weight: 2 },
  // Cold aquamarine, the colour the void's crystal glows in: this world and
  // the last one are the two cold places in the game and they rhyme on purpose.
  { name: 'astral', ramp: ['#25406e', '#2a7f88', '#4fcac6', '#a2f7ec'], weight: 2 },
];

function createSnowAmbient(seed) {
  const rng = makeRng(seed >>> 0);
  let clock = 0;

  const drift = Array.from({ length: 34 }, () => ({
    x: rng(),
    y: rng.range(0.6, 1),
    vx: rng.range(-0.16, -0.05),
    bob: rng.range(0.6, 2.4),
    phase: rng.range(0, Math.PI * 2),
    a: rng.range(0.18, 0.5),
    len: rng.chance(0.35) ? 2 : 1,
  }));

  const glints = Array.from({ length: 26 }, () => ({
    x: rng(),
    y: rng.range(0.62, 0.98),
    rate: rng.range(1400, 4200),
    phase: rng.range(0, Math.PI * 2),
  }));

  /**
   * Tonight's display, rolled once. Two of the three curtains take it and one
   * is drawn from a different one at half strength — a real aurora has more
   * than one arc up at a time and they are not always the same colour, but
   * three unrelated colours at once is a screensaver.
   */
  const pickDisplay = () => {
    const total = AURORA_DISPLAYS.reduce((sum, d) => sum + d.weight, 0);
    let roll = rng() * total;
    for (const d of AURORA_DISPLAYS) {
      roll -= d.weight;
      if (roll <= 0) return d;
    }
    return AURORA_DISPLAYS[0];
  };
  const tonight = pickDisplay();
  const second = pickDisplay();

  const curtains = Array.from({ length: 3 }, (_, i) => ({
    /**
     * Where the crown of the curtain sits, and how far it hangs below it. Deep
     * on purpose: a shallow band across the sky reads as a ribbon somebody has
     * laid over the stars, and the thing that makes an aurora look like a
     * curtain is that it HANGS.
     */
    y: rng.range(0.03, 0.12) + i * 0.05,
    h: rng.range(0.26, 0.46),
    /** The fold: how far the base curve kinks, and how fast it travels. */
    rate: rng.range(11000, 19000),
    periods: rng.range(1.1, 2.4),
    fold: rng.range(0.6, 1.6),
    phase: rng.range(0, Math.PI * 2),
    /**
     * How much of the sky's own colour the curtain replaces at its hem. It is
     * high — this is not an overlay at 20% that the eye has to hunt for, it is
     * the brightest thing in the frame at midnight, which is what an aurora
     * over open snow actually is.
     */
    a: rng.range(0.5, 0.72) * (i === 2 ? 0.62 : 1),
    /** Rays run on their own clock, at their own spacing. */
    rayRate: rng.range(2600, 5200),
    raySpacing: rng.range(11, 26),
    rayPhase: rng.range(0, Math.PI * 2),
    /** The substorm pulse: the whole curtain brightens and dies back. */
    pulseRate: rng.range(7000, 15000),
    pulsePhase: rng.range(0, Math.PI * 2),
    ramp: (i === 1 ? second : tonight).ramp,
  }));

  /** Sample a curtain's ramp at 0 (top) to 1 (hem). */
  const rampAt = (ramp, k) => ramp[Math.min(ramp.length - 1, Math.floor(k * ramp.length))];

  return {
    update(dt) {
      clock += dt;
      const step = dt / 1000;
      for (const p of drift) {
        p.x += p.vx * step;
        if (p.x < -0.05) {
          p.x = 1.05;
          p.y = rng.range(0.6, 1);
        }
      }
    },

    /**
     * The aurora, drawn into the sky pass rather than over the finished frame.
     * See the long note above this factory for what that buys and for why the
     * colours are ramps rather than colours.
     */
    renderSky(ctx, view, sky) {
      const night = sky.stars;
      if (night <= 0.05) return;
      const s = view.scale;
      /**
       * The compositing mode is INHERITED, and that is the whole design.
       *
       * The renderer is midway through its `destination-over` sky pass when it
       * calls this, so every pixel drawn here lands only where the canvas is
       * still transparent — which is exactly the sky, and nowhere else. The
       * mountains, the spruce and the traveller are already down, so they mask
       * the curtain perfectly and it cannot touch them.
       *
       * An earlier version set `lighter` here instead, out of habit: an aurora
       * is emitted light and emitted light adds. It does — but `lighter` inside
       * this pass composites the curtain OVER everything already drawn, which
       * put it back in front of the peaks and washed pale green across their
       * faces. Painting into the hole in the canvas and letting the sky ramp
       * fill in behind gives the same glow, because the thing it is being mixed
       * with is a night sky.
       */
      ctx.save();

      /** Column width: three source pixels, so the rays land on the grid. */
      const step = s * 3;
      const cols = Math.ceil(view.w / step) + 1;
      /** Vertical steps through the ramp. Nine is enough to read as a ramp. */
      const bands = 9;

      for (const c of curtains) {
        // The substorm: the whole curtain swells and dies back over ten or
        // fifteen seconds. Static brightness is the giveaway that a light in
        // the sky was drawn rather than observed.
        const pulse = 0.55 + 0.45 * Math.sin(clock / c.pulseRate + c.pulsePhase);

        for (let i = 0; i < cols; i++) {
          const x = i * step;
          const u = i / cols;
          /**
           * The base curve. Two waves at unrelated periods, one of them slow
           * and deep, so the curtain FOLDS — kinks back on itself — instead of
           * rippling evenly like a flag. The deep one is the fold; the fast one
           * is the wrinkle running along it.
           */
          const wave = Math.sin(u * Math.PI * 2 * c.periods + (clock / c.rate) * 6 + c.phase)
            + 0.42 * Math.sin(u * Math.PI * 2 * (c.periods * 2.7) - (clock / c.rate) * 9)
            + c.fold * 0.5 * Math.sin(u * Math.PI * 2 * 0.5 + (clock / c.rate) * 2.4);
          const top = (c.y + wave * 0.038) * view.h;
          // Depth varies along the curtain, so it is deeper where it folds
          // towards you and thinner where it turns edge-on.
          const h = c.h * view.h * (0.6 + 0.4 * Math.sin(u * 9 + clock / 2600 + c.phase));

          /**
           * The rays. A curtain is a row of vertical shafts along the magnetic
           * field, each brightening and dying on its own — so this is two sine
           * trains at different spacings drifting at different rates, squared to
           * keep the gain mostly low with occasional bright shafts. It is the
           * single thing that stopped the aurora reading as a painted band.
           */
          const ray = (Math.sin(i / c.raySpacing * Math.PI * 2 + clock / c.rayRate + c.rayPhase)
            + Math.sin(i / (c.raySpacing * 0.37) * Math.PI * 2 - clock / (c.rayRate * 1.7)))
            * 0.5;
          const gain = 0.45 + 0.55 * ray * ray;

          for (let b = 0; b < bands; b++) {
            // 0 at the crown of the curtain, 1 at the hem.
            const k = b / (bands - 1);
            // Brightest at the bottom hem and almost gone at the top: a curtain
            // is lit from below, where the air it is exciting actually is. The
            // falloff is steep rather than linear because a real curtain has a
            // hard lower border and a crown that fades into nothing.
            ctx.globalAlpha = Math.min(1, c.a * night * pulse * gain * (0.04 + k ** 2.2));
            ctx.fillStyle = rampAt(c.ramp, k);
            const by = Math.round((top + h * k) / s) * s;
            ctx.fillRect(Math.round(x), by, step, Math.ceil(h / bands / s) * s + s);
          }

          // The hem itself: one bright row along the bottom edge, in the hem
          // colour, wherever a ray happens to be strong. Without it the curtain
          // fades out at both ends and hangs in the sky like smoke.
          if (gain > 0.72) {
            ctx.globalAlpha = Math.min(1, c.a * night * pulse * 1.6);
            ctx.fillStyle = rampAt(c.ramp, 1);
            ctx.fillRect(Math.round(x), Math.round((top + h) / s) * s, step, s);
          }
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    },

    render(ctx, view, sky, world) {
      const s = view.scale;
      const day = Math.max(0, Math.min(1, (sky.light - 0.4) / 0.4));

      /**
       * The aurora lying on the snow.
       *
       * Two rows of the tonight's hem colour, added over the floor at almost
       * nothing — you would not name it if you were asked what was on screen.
       * It is here because the curtain is drawn behind the mountains, and a
       * light source that big with no effect whatever on the ground under it is
       * the one thing that would still give away that it is a backdrop. Snow is
       * the only surface in the game bright enough to show it, which is why
       * this is the only biome that does it.
       */
      if (sky.stars > 0.2 && world?.planeTop != null) {
        const glow = curtains[0].ramp[3];
        const wave = 0.6 + 0.4 * Math.sin(clock / curtains[0].pulseRate + curtains[0].pulsePhase);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          ctx.globalAlpha = sky.stars * wave * 0.035 * (1 - i / 5);
          ctx.fillStyle = glow;
          ctx.fillRect(0, world.planeTop + i * 4 * s, view.w, 4 * s);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // --- glints ---
      if (day > 0.02) {
        ctx.fillStyle = PALETTE.white;
        for (const g of glints) {
          const pulse = Math.sin(clock / g.rate * 4 + g.phase);
          if (pulse < 0.86) continue;
          ctx.globalAlpha = day * (pulse - 0.86) / 0.14;
          const x = Math.round((g.x * view.w) / s) * s;
          const y = Math.round((g.y * view.h) / s) * s;
          ctx.fillRect(x, y, s, s);
          ctx.globalAlpha *= 0.5;
          ctx.fillRect(x - s, y, s, s);
          ctx.fillRect(x + s, y, s, s);
        }
        ctx.globalAlpha = 1;
      }

      // --- spindrift ---
      ctx.fillStyle = PALETTE.snowLight;
      for (const p of drift) {
        const y = p.y * view.h + Math.sin(clock / 700 + p.phase) * p.bob * s;
        ctx.globalAlpha = p.a * (0.45 + sky.light * 0.55);
        ctx.fillRect(
          Math.round((p.x * view.w) / s) * s,
          Math.round(y / s) * s,
          s * p.len,
          s,
        );
      }
      ctx.globalAlpha = 1;
    },
  };
}

// ---------------------------------------------------------------------------

export const SNOW_ART = {
  id: 'snow',

  props: SNOW_PROPS,

  /**
   * DEPTH IS CARRIED BY TEMPERATURE HERE, NOT BY VALUE
   * -------------------------------------------------------------------------
   * The desert recedes into darkness and the prairie recedes into haze. Snow
   * can do neither: everything in it is the same white, so a range stacked by
   * value alone comes out as four grey steps and the eye reads them as one
   * flat wall.
   *
   * What separates these layers is how blue they are. The far peaks are the
   * coldest thing on screen, the middle slope is warmer for having trees on
   * it, and the near drift is very nearly white — so the stack runs blue to
   * white from back to front, and the props standing on the drift are read
   * against the coldest shadow rather than against a wall the same colour as
   * they are.
   */
  buildLayers: () => ({
    clouds: makeCloudLayer({
      seed: 2211,
      height: 54,
      count: 9,
      size: [4, 10],
      tones: [PALETTE.white, PALETTE.snow, PALETTE.snowShade],
    }),
    far: makeRidgeLayer({
      seed: 7331,
      height: 92,
      // Low and gentle, because this is only the foothill line the summits are
      // planted along — see `alpinePeaks`, which draws the range itself.
      baseline: 30,
      amplitude: 12,
      roughness: 0.35,
      colors: {
        body: PALETTE.snowShade,
        light: PALETTE.snow,
        dark: PALETTE.snowDeep,
      },
      crest: 3,
      decorate: alpinePeaks,
    }),
    mid: makeRidgeLayer({
      seed: 4808,
      height: 70,
      baseline: 27,
      amplitude: 15,
      roughness: 0.5,
      colors: { body: PALETTE.snowMid, light: PALETTE.snow, dark: PALETTE.snowShade },
      decorate: spruceLine,
    }),
    drifts: makeRidgeLayer({
      seed: 1515,
      height: 38,
      baseline: 17,
      amplitude: 8,
      roughness: 0.8,
      colors: { body: PALETTE.snow, light: PALETTE.snowLight, dark: PALETTE.snowMid },
      crest: 3,
      decorate: driftCornice,
    }),
    ground: makeSnowGround({ seed: 6009, height: 72 }),
    fringe: makeSnowFringe({ seed: 9182, height: 26 }),
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -112 },
    { name: 'far', speed: 0.15, y: -92 },
    { name: 'mid', speed: 0.4, y: -62 },
    { name: 'drifts', speed: 0.7, y: -38, near: true },
    { name: 'ground', speed: 1.0, y: 0 },
    { name: 'fringe', speed: 1.9, y: -15, anchor: 'bottom', front: true },
  ],

  /**
   * Emptier than the prairie and busier than the desert. The pass is a place
   * things survive in rather than grow in, so the common roll is snow doing
   * something to itself — a drift, a scoured boulder — and the rare roll is
   * something alive.
   */
  scatter: [
    { name: 'snowDrift', weight: 20 },
    { name: 'boulderIced', weight: 15 },
    { name: 'spruceSmall', weight: 13 },
    { name: 'shrubSnow', weight: 11 },
    { name: 'iceSpikes', weight: 9 },
    { name: 'spruceTall', weight: 8 },
    { name: 'iceBlock', weight: 7 },
    { name: 'deadFir', weight: 6 },
    { name: 'cairn', weight: 5 },
    { name: 'frozenStump', weight: 5 },
    { name: 'fenceBuried', weight: 4 },
    { name: 'skullFrost', weight: 3 },
    { name: 'passMarker', weight: 3, flip: false },
  ],

  /**
   * What the wind leaves lying: chips of ice, a fallen bough, the tips of
   * buried scrub. The litter band is thinner up here than anywhere else —
   * snow buries clutter, which is the whole character of the place.
   */
  clutter: [
    { name: 'snowLump', weight: 14 },
    { name: 'iceChip', weight: 8 },
    { name: 'buriedTwig', weight: 6 },
  ],
  clutterCell: 26,

  /**
   * The far band: spruce standing on the slope behind the drift. Nothing pale
   * goes in it — a white prop hazed white against a white hill is invisible,
   * and the two conifers are the only silhouettes up here with a colour of
   * their own.
   */
  backdrop: {
    cell: 62,
    y: -7,
    gap: 0.24,
    shrink: true,
    haze: PALETTE.snowShade,
    hazeA: 0.42,
    scatter: [
      { name: 'spruceTall', weight: 22 },
      { name: 'spruceSmall', weight: 18 },
      { name: 'deadFir', weight: 7 },
    ],
  },

  scatterCell: 66,

  groundFill: PALETTE.snowDeep,

  /** Powder, not dust: brighter than the ground it comes off, and cold. */
  dust: 'rgba(233, 242, 252, 0.55)',

  /** Buildings stand on snow somebody has trodden flat, not on bare sand. */
  structureGround: { r: PALETTE.snowShade, s: PALETTE.snowMid },

  ambient: createSnowAmbient,
};
