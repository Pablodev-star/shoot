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
import { LAYER_TILE_W, makeCloudLayer, makeRidgeLayer, speckle } from '../env-kit.js';

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
 * The ground: a track trodden through deep snow.
 *
 * Row zero is the walk line, exactly as it is in the prairie, and for the same
 * reason — the trodden band has to start where the boots land or the traveller
 * walks along a white ledge with a road in front of him.
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

  ctx.fillStyle = PALETTE.snow;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  // --- the trodden band ---
  const top = new Array(LAYER_TILE_W);
  const bot = new Array(LAYER_TILE_W);
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const t = Math.sin((x / LAYER_TILE_W) * Math.PI * 2) * 1.2
      + Math.sin((x / LAYER_TILE_W) * Math.PI * 6 + 1.7) * 0.8;
    const b = Math.sin((x / LAYER_TILE_W) * Math.PI * 2 + 2.4) * 3
      + Math.sin((x / LAYER_TILE_W) * Math.PI * 10 + 0.4) * 1.1;
    top[x] = Math.max(0, Math.round(t));
    bot[x] = Math.round(23 + b);
    ctx.fillStyle = PALETTE.snowMid;
    ctx.fillRect(x, top[x], 1, bot[x] - top[x]);
    // The far lip catches the light; the near one is the edge of a rut.
    ctx.fillStyle = PALETTE.snowLight;
    ctx.fillRect(x, top[x], 1, 1);
    ctx.fillStyle = PALETTE.snowShade;
    ctx.fillRect(x, bot[x] - 2, 1, 2);
  }

  // Sled runners: two shallow blue lines that break rather than run true.
  for (const share of [0.34, 0.66]) {
    for (let x = 0; x < LAYER_TILE_W; x++) {
      if (rng.chance(0.26)) continue;
      const y = Math.round(top[x] + (bot[x] - top[x]) * share);
      ctx.fillStyle = PALETTE.snowShade;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Boot prints, in pairs, staggered down the middle of the track. Two pixels
  // of cold shadow with one bright pixel of thrown snow behind the toe.
  for (let x = 4; x < LAYER_TILE_W; x += rng.int(9, 14)) {
    const mid = Math.round(top[x] + (bot[x] - top[x]) * 0.5);
    for (let foot = 0; foot < 2; foot++) {
      const py = mid + (foot ? 3 : -3);
      ctx.fillStyle = PALETTE.snowDeep;
      ctx.fillRect(x, py, 2, 1);
      ctx.fillStyle = PALETTE.snowShade;
      ctx.fillRect(x, py + 1, 2, 1);
      ctx.fillStyle = PALETTE.snowLight;
      ctx.fillRect(x - 1, py, 1, 1);
    }
  }

  // Scoured ice: flat sheets with a bright rim on the windward side.
  for (let i = 0; i < 16; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const cy = rng.int(2, height - 6);
    const rx = rng.int(4, 13);
    const ry = rng.int(1, 3);
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.001))));
      ctx.fillStyle = y < 0 ? PALETTE.iceLight : PALETTE.ice;
      ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
  }

  // --- the fresh snow in front of the track ---
  const near = Math.round(height * 0.5);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    ctx.globalAlpha = k * 0.65;
    ctx.fillStyle = PALETTE.snowDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  /**
   * Sastrugi: the ridges wind cuts into open snow. Shallow arcs, lit on top
   * and blue underneath — the same pass the desert makes over its sand, which
   * is not a coincidence. Wind does the same thing to both, and drawing them
   * with the same hand is what keeps the six worlds looking like one game.
   */
  for (let i = 0; i < 120; i++) {
    const x0 = rng.int(-10, LAYER_TILE_W);
    const y0 = rng.int(Math.max(2, bot[0]), height - 2);
    const len = rng.int(8, 26);
    const amp = rng.range(1, 3);
    for (let t = 0; t < len; t++) {
      const x = ((x0 + t) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
      const y = Math.round(y0 - Math.sin((t / len) * Math.PI) * amp);
      if (y < 1 || y >= height) continue;
      ctx.fillStyle = PALETTE.snowShade;
      ctx.fillRect(x, y + 1, 1, 1);
      ctx.fillStyle = PALETTE.snowLight;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  speckle(ctx, rng, {
    from: 1,
    to: height - 1,
    count: 260,
    colors: [PALETTE.snowLight, PALETTE.snowMid],
    wide: 0.1,
  });

  return canvas;
}

// ---------------------------------------------------------------------------
// Ambient
// ---------------------------------------------------------------------------

/**
 * What the air does up here.
 *
 *   spindrift  loose snow the wind lifts off the drifts and drives along the
 *              ground. It is not weather — it blows on a clear day too, and
 *              that is the point: the pass is never still
 *   glints     the sun catching single crystals, out only in daylight
 *   aurora     three curtains high over the peaks, out only once the stars are
 *
 * The aurora is the counterpart of the prairie's fireflies: the thing that
 * makes nightfall a change of character rather than a change of brightness.
 * It is drawn as columns of stacked blocks with a wave running through them and
 * composited `lighter`, because light in the sky adds to what is behind it —
 * an aurora painted with ordinary alpha puts a grey film over the stars.
 */
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

  const curtains = Array.from({ length: 3 }, (_, i) => ({
    y: rng.range(0.04, 0.16) + i * 0.05,
    h: rng.range(0.13, 0.26),
    rate: rng.range(9000, 16000),
    periods: rng.range(1.2, 2.6),
    phase: rng.range(0, Math.PI * 2),
    a: rng.range(0.16, 0.3),
    color: i === 1 ? PALETTE.astral : PALETTE.greenLight,
  }));

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

    render(ctx, view, sky) {
      const s = view.scale;
      const day = Math.max(0, Math.min(1, (sky.light - 0.4) / 0.4));
      const night = sky.stars;

      // --- aurora ---
      if (night > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cols = Math.ceil(view.w / (s * 3));
        for (const c of curtains) {
          ctx.fillStyle = c.color;
          for (let i = 0; i < cols; i++) {
            const x = i * s * 3;
            const u = i / cols;
            // Two waves, so the curtain folds instead of rippling evenly.
            const wave = Math.sin(u * Math.PI * 2 * c.periods + clock / c.rate * 6 + c.phase)
              + 0.4 * Math.sin(u * Math.PI * 2 * (c.periods * 2.7) - clock / c.rate * 9);
            const top = (c.y + wave * 0.035) * view.h;
            const h = c.h * view.h * (0.7 + 0.3 * Math.sin(u * 9 + clock / 2600));
            const bands = 7;
            for (let b = 0; b < bands; b++) {
              // Brightest at the bottom hem, gone at the top: a curtain is lit
              // from below, where the air it is exciting actually is.
              ctx.globalAlpha = c.a * night * ((b + 1) / bands) ** 2;
              const by = Math.round((top + (h * b) / bands) / s) * s;
              ctx.fillRect(Math.round(x), by, s * 3, Math.ceil(h / bands / s) * s);
            }
          }
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
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -112 },
    { name: 'far', speed: 0.15, y: -92 },
    { name: 'mid', speed: 0.4, y: -62 },
    { name: 'drifts', speed: 0.7, y: -38 },
    { name: 'ground', speed: 1.0, y: 0 },
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
    { name: 'passMarker', weight: 3 },
  ],

  scatterCell: 66,

  groundFill: PALETTE.snowDeep,

  /** Powder, not dust: brighter than the ground it comes off, and cold. */
  dust: 'rgba(233, 242, 252, 0.55)',

  /** Buildings stand on snow somebody has trodden flat, not on bare sand. */
  structureGround: { r: PALETTE.snowShade, s: PALETTE.snowMid },

  ambient: createSnowAmbient,
};
