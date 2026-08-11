/**
 * SHOOT! — Prairie biome art.
 *
 * The second world: open grassland with a dirt trail worn through it, wooded
 * hills on the middle horizon and hazy blue-green ranges behind those.
 *
 * IT IS THE SAME PICTURE, PAINTED IN A DIFFERENT FAMILY
 * ---------------------------------------------------------------------------
 * The prairie is not the desert with a green filter over it. It keeps the
 * desert's *structure* — five depth layers, one prop per scatter cell, a lit
 * crest on every ridge — because that structure is what makes the scene read
 * as one place at one hour. What changes is everything the eye actually names:
 * the ground is a trail instead of a road, the horizon has a tree line on it,
 * the props are living things rather than remains, and the air has something
 * in it (seed fluff by day, fireflies after dark) where the desert has only
 * weather.
 *
 * The shading rules are the desert's, unchanged: no ink outline anywhere,
 * light from the top left, a dark tone of the SAME hue down the right and
 * lower edges, and a contact shadow (`l`, grass deep) where a prop meets the
 * ground so nothing floats. See the note at the top of `biomes/desert.js`.
 *
 * SCALE
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels and everything here is measured
 * against him: a tuft comes to his knee, a bush to his chest, the fence to his
 * shoulder, and the one full tree is half again his height. Props drawn
 * without that ruler in hand are the single fastest way to make a side-on
 * scene look like a collage.
 */

import { PALETTE } from '../palette.js';
import { makeCanvas } from '../pixel.js';
import { makeRng } from '../../core/rng.js';
import { LAYER_TILE_W, makeCloudLayer, makeRidgeLayer } from '../env-kit.js';

export const MEADOW_PROPS = {
  /**
   * A knee-high tuft. Blades are two pixels wide, not one: a one-pixel blade
   * is invisible against a green hill the moment the light drops, and the
   * whole tuft reads as dirt on the screen rather than as a plant.
   */
  grassTuft: [
    '....hh.....',
    '.hh.hH...jj',
    '.hH.hH..jHj',
    'hh.hhH.jHj.',
    'hHhhhHhjHj.',
    'hHHHHHHHHj.',
    '.jHHHHHHJj.',
    '.lJJHHHJJl.',
    '..llJJJll..',
  ],

  /** A wider clump, waist high, with the tallest blades bent over. */
  grassClump: [
    '...hh....hh..',
    '..hhh..hhhh..',
    'hh.hH.hhH.hHj',
    'hHh.hHhH..jHj',
    'hHhhhHhHhjHj.',
    'hHHHHHHHHHHj.',
    '.hHHHHHHHHHj.',
    '.jHHHHHHHHJj.',
    '.lJJHHHHHJJl.',
    '..llJJJJJll..',
  ],

  /**
   * Wild wheat gone to seed. The gold heads are the whole point of it: at
   * distance the prairie is a green field with a scatter of warm dots in it,
   * and those dots are what stop the biome reading as a single flat hue.
   */
  wheatWild: [
    '...O...O.....',
    '..OoO.OoO....',
    '..OoO.OoO..O.',
    '...u...u..OoO',
    '...h...h..OoO',
    '.h.h.j.h...u.',
    '.h.h.j.h.j.h.',
    '.h.h.j.h.j.h.',
    '.hHh.jHh.jHh.',
    '.hHh.jHh.jHj.',
    '.hHHhjHHhjHj.',
    '..jHHHHHHHj..',
    '..jJHHHHHJj..',
    '..llJJJJJll..',
  ],

  /** Pink and cream heads on a grass base. Four-petal flowers, gold centre. */
  flowerPatch: [
    '..p...f......',
    '.pOp.fOf..p..',
    '..p...f..pOp.',
    '..h...h...p..',
    '.hHh.hHh..h..',
    '.hHh.jHj.hHh.',
    'hHHHhHHjhHHj.',
    '.jHHHHHHHHj..',
    '..jJHHHHJj...',
    '..llJJJJll...',
  ],

  /** Blue spires on long stems — the tall flower, so the patch has a skyline. */
  flowerSpire: [
    '..i....i.....',
    '.iii..iii....',
    '.iii..iii..i.',
    '..i....i..iii',
    '..i....i..iii',
    '..h....h...i.',
    '..h....h...h.',
    '.hHh..jHj..h.',
    '.hHhhhHHjhHh.',
    '..jHHHHHHHj..',
    '..llJJJJJll..',
  ],

  /**
   * A berry bush at chest height. The berries are single red pixels, never
   * clusters: three pixels of red on a green mass is a bush with fruit on it,
   * and a dozen is a bush with a rash.
   */
  berryBush: [
    '.....hhhhhh....',
    '...hhhhhhhHl...',
    '..hhhhhhhHHHHl.',
    '.hhhhhhheHHHHHl',
    '.hhhhhhhHjjHHHl',
    'hhhhhHHHJjhhHHl',
    'HHHehjJJJJhhHHl',
    'lHHHjJJJJHejjjl',
    '.jjjJJJJJjjjJJl',
    '.ljjJJJJJjjJJJl',
    '..lllJJJJllJJl.',
    '....lllllllll..',
  ],

  /**
   * The one full tree, and the tallest thing on the prairie floor: half again
   * the gunslinger's height, so a stretch of road with one on it has a
   * landmark in it.
   *
   * The canopy is four overlapping masses rather than one outline, and each
   * mass carries its own highlight — a single smooth light-to-dark sweep
   * across the whole crown, which is what the first pass at this was, gives
   * you a green ball on a stick. The darkest green traces only the lower
   * right rim, and it is doing the job an ink outline would do everywhere
   * else in the game.
   */
  tree: [
    '.........hhhhhhhhh.........',
    '........hhhhhhhhhhh........',
    '.....hhhhhhhhhhhhhhhhh.....',
    '.....hhhhhhhhhhhHHHHHHHhh..',
    '....hhhhhhhhhhhhHHHHHHhhl..',
    '...hhhhhhhhhhhhHHHHHHhHHHl.',
    '...hhhhhhhhhhhHHHHHHhhHHHHl',
    '.hhhhhhhhhhhhhHjjjHhhhHHHHl',
    'hhhhhhhhhHHHhhjjjjHhhhHHHHl',
    'hhhhhhhHHHHHHjjJJjhhhhHHHHl',
    'hhhhhhHHHHjjjjjJJjhhhHHjjjl',
    'hhhhhhhHHHHjjjjJJHhhhHjjjjl',
    'HHhhhhhHjjjHHjJJJHHHHJJJjjl',
    'HHHhhHHjjjhhhhHHjHjjJJJJJjl',
    'HHHHHHJJJJhhhhHjjjjJJJJJJJl',
    'HHHHHjJJJJHHhHHjjJJJJJJJJJl',
    'HHHjjjJJJjHHHJJJJJJJJJJJJJl',
    'lHjjjJJJJjjjjJJJJJJJJJJJJl.',
    '.ljjjJJJjjjjjJJJJJJJJJJJJl.',
    '..ljjJJjjjjjJJJJJJJJJJJJJl.',
    '...jjJJjjjjjJJJJJJJJJJJJl..',
    '...ljJJJjjjJJJJJJJJJJJlll..',
    '....ljJJJJJJWwxJJJJJll.....',
    '.....lllllJJWwxJJJll.......',
    '..........lWWwxxll.........',
    '...........lWwX..l.........',
    '............Wwx............',
    '............Wwx............',
    '...........WWwxx...........',
    '............Wwx............',
    '...........WWwwxx..........',
    '..........WWwwwxx..........',
    '.........WWwwwwwxx.........',
    '.......hHjjwwwwwjjJH.......',
    '......hHHjJlllllJJHHj......',
    '......llJJJlllllJJJll......',
  ],

  /** A young tree, the tree's little brother — same shading, a third the mass. */
  sapling: [
    '.....hh........',
    '....hhhhhl.....',
    '...hhhhhHHHl...',
    '..hhhhhHHHHh...',
    '..hhhhhjjHHHl..',
    '..lHHHjJjhHHHl.',
    '...HHjJJHHjjjl.',
    '...ljjJjjJJJjl.',
    '....ljJjJJJJl..',
    '.....ljjJJJJl..',
    '.....Wwxllll...',
    '.....Wwx.......',
    '.....WwX.......',
    '.....Wwx.......',
    '....WWwwwxx....',
    '...hHjxxxxjJ...',
    '...lJJlllJJl...',
  ],

  /**
   * A fallen log with moss along its back. The cut end at the left shows its
   * rings — an untextured cylinder end reads as a pipe.
   */
  logFallen: [
    '...aAa...aAa.....',
    '..aAAaaaaAAaa....',
    '.WWwwwwwwwwwwwwx.',
    'WWXwwwwwwwwwwwwxx',
    'WXWwwwwwwwwwwwwxx',
    'WWXwwwwwwwwwwwwx.',
    '.WXxxxxxxxxxxxxx.',
    '..llllllllllll...',
  ],

  /**
   * What is left where a tree was cut. The cut face is seen at a slight angle
   * from above, so it is an ellipse rather than a rectangle, with the rings
   * inside it and one shoot coming back up out of the side — a stump with a
   * shoot on it is a stump, and one without is a crate.
   */
  stump: [
    '...WWWWW...',
    '..WwwwwwW..',
    '.WwWWWWWwW.',
    'WwWWxxxWWwW',
    'WwWWxWxWWwW',
    '.WwWWxWWwW.',
    '..WwwwwwW..',
    'a..wwwww..a',
    'A.xwwwwwx.A',
    'Aaxxwwwxxaa',
    '.lJxxxxxJl.',
    '..llJJJll..',
  ],

  /** A grey boulder with a moss cap — the prairie's answer to the desert rock. */
  rockMossy: [
    '...aAa.....',
    '..aAAAaa...',
    '.aAYYYAyy..',
    'YYYYYYYyyv.',
    'YYYYYYyyvvv',
    'YYYYYyyvvv.',
    '.yyYyyvvv..',
    '..lllll....',
  ],

  /** Two rails and two posts: somebody has fenced this, and left. */
  fencePost: [
    '..Ww.......Ww...',
    '..Ww.......Ww...',
    '.WWWWWWWWWWWWW..',
    '.xxwwwwwwwwwwx..',
    '..Ww.......Ww...',
    '..Ww.......Ww...',
    '..Ww.......Ww...',
    '.WWWWWWWWWWWWW..',
    '.xxwwwwwwwwwwx..',
    '..Ww.......Ww...',
    '..Ww.......Ww...',
    '..Wwx......Wwx..',
    '.hHjh......hHjh.',
    '..lJl......lJl..',
  ],

  /**
   * Thistle. Purple heads on a spined stem — the one plant out here that is
   * armed, and the only tall silhouette in the set that is not a tree, so a
   * verge with two of them on it does not read as a hedge.
   */
  thistle: [
    '..p...p....',
    '.pOp.pOp...',
    '..p...p..p.',
    '..J..aJ.pOp',
    '.aJa.aJ..p.',
    '..J...J.aJ.',
    '.aJ.aJa..J.',
    '..J..J..aJ.',
    '.aJa.J...J.',
    '..JaaJaaaJ.',
    '..lJJJJJJl.',
    '...llJJll..',
  ],

  /**
   * A ring of caps in the shade of something that is no longer there. Cream
   * stems, brown caps, one on its side: a fairy ring drawn with every cap
   * upright reads as a row of nails.
   */
  mushrooms: [
    '..www......',
    '.wWwwx..w..',
    '..fBf..wWwx',
    '..fBf.wWwwx',
    'w.fBf..fBf.',
    'WwwfBf.fBf.',
    'fBffBf.fBf.',
    'llllllllll.',
  ],

  /**
   * Somebody's scarecrow, still standing over a field that is not there any
   * more. It is the tallest man-made thing on the prairie and the one prop
   * that is unmistakably a person's doing.
   */
  scarecrow: [
    '....wwww....',
    '...wWWWWx...',
    '..wWWWWWWx..',
    '...ffffff...',
    '...fkffkf...',
    '...ffffff...',
    '...fffkff...',
    '....ffff....',
    '.....Ww.....',
    'Www.eEEe.wwW',
    'WWwweEEewwWW',
    '.xx.eEEe.xx.',
    '....eEEe....',
    '....eEEe....',
    '....OuOu....',
    '....OuOu....',
    '....Wwx.....',
    '....Wwx.....',
    '....Wwx.....',
    '...hHjJh....',
    '...llJJl....',
  ],

  // --- clutter -------------------------------------------------------------
  // The tight band under the props: a few blades, a stone, a bloom. Nothing
  // here has a silhouette worth the name, and that is the job — it is what
  // fills the space the props are keeping between themselves.

  /** Three blades and a seed head. */
  grassSprig: [
    '.h...h...',
    '.h.j.h.j.',
    'hHjjHhjHj',
    '.lJJJJJl.',
  ],

  /** A stone the plough turned up. */
  fieldStone: [
    '..yY...',
    '.yYYyv.',
    'yYYyyvv',
    '.lllll.',
  ],

  /** Dandelion clocks, waiting for weather. */
  dandelion: [
    '.f...f...',
    'fff.fff..',
    '.f...f..f',
    '.h...h.fff',
    '.hHj.hHjf',
    '.llJ.llJ.',
  ],

  /** A round bale, wound tight. The gold arcs inside are the wind of it. */
  hayBale: [
    '.....OOOO......',
    '...OOooooOu....',
    '..OOoouuoooou..',
    '.OOoou..uooouu.',
    'OOooo.OO.ooouuu',
    'Ooooo.oo.oooouu',
    'Ooooou..uoooouu',
    '.Oooooooooouuu.',
    '..Ooooooooouu..',
    '...uuoooouuu...',
    '....llllll.....',
  ],
};

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/**
 * Sum of sines whose periods divide the tile width exactly, so anything driven
 * by it wraps seamlessly. Used for the wandering edges of the trail.
 */
function wave(x, terms) {
  let v = 0;
  for (const [periods, amp, phase] of terms) {
    v += Math.sin((x / LAYER_TILE_W) * Math.PI * 2 * periods + phase) * amp;
  }
  return v;
}

/**
 * The wooded crest of the middle hills. Little crowns pushed down onto the
 * ridge line, in a green one step darker than the hill they stand on, with a
 * lit top — at this distance a tree is four pixels and a suggestion, and any
 * more detail than that turns the horizon into noise.
 */
function treeLine(ctx, heights, rng, height) {
  const plot = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W, y, 1, 1);
  };
  for (let i = 0; i < 46; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const base = height - heights[cx] + 1;
    const h = rng.int(4, 9);
    const rx = rng.chance(0.45) ? 1 : 2;
    for (let dy = 0; dy < h; dy++) {
      // Crowns are widest a third of the way down and taper to a point.
      const k = dy / h;
      const w = Math.round(rx * Math.sin(Math.min(1, k * 1.35) * Math.PI) * 1.25);
      for (let dx = -w; dx <= w; dx++) {
        const lit = dx <= -w + 1 && dy < h * 0.6;
        plot(cx + dx, base - h + dy, lit ? PALETTE.grassDark : PALETTE.grassDeep);
      }
    }
    // A one-pixel trunk, so the crowns sit on the hill instead of hovering.
    plot(cx, base - 1, PALETTE.grassDeep);
  }
}

/** Blades of grass standing up off the near hill's crest. */
function grassFringe(ctx, heights, rng, height) {
  ctx.fillStyle = PALETTE.grassLight;
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (!rng.chance(0.3)) continue;
    const top = height - heights[x];
    ctx.fillRect(x, top - rng.int(1, 3), 1, 3);
  }
}

/**
 * The ground the player actually walks on: a dirt trail worn through grass.
 *
 * THE TRAIL STARTS AT ROW ZERO, AND THAT IS NOT AN ACCIDENT
 * ---------------------------------------------------------------------------
 * Row zero of this layer is the walk line — where the boots land. The first
 * version of this put a grass verge across the top and started the dirt six
 * pixels down, and because the hill layer in front of it already covers the
 * ground strip's first rows, what you actually got on screen was a man walking
 * along a green ledge with a ploughed field in front of him. The dirt has to
 * begin at the walk line for the trail to be the thing he is walking on.
 *
 * Below the trail the field comes back, falling into shadow towards the
 * camera. Both edges of the trail wander on a tileable wave and are broken up
 * with blades crossing them, because a path with two straight edges is a
 * runway.
 */
function makeMeadowGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  const topTerms = [[1, 1.4, 0.7], [3, 0.8, 2.1], [7, 0.5, 4.4]];
  const botTerms = [[1, 3.2, 2.9], [2, 1.8, 0.3], [5, 0.9, 5.1]];
  const trailTop = new Array(LAYER_TILE_W);
  const trailBot = new Array(LAYER_TILE_W);

  for (let x = 0; x < LAYER_TILE_W; x++) {
    trailTop[x] = Math.max(0, Math.round(wave(x, topTerms)));
    trailBot[x] = Math.round(21 + wave(x, botTerms));
  }

  // --- the trail ---
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const t = trailTop[x];
    const b = trailBot[x];
    ctx.fillStyle = PALETTE.soil;
    ctx.fillRect(x, t, 1, b - t);
    // Lit lip along the far edge, shadowed lip along the near one: the trail
    // is a shallow dish, not a decal.
    ctx.fillStyle = PALETTE.soilLight;
    ctx.fillRect(x, t, 1, 2);
    ctx.fillStyle = PALETTE.soilDark;
    ctx.fillRect(x, b - 2, 1, 2);
  }

  // One wheel rut down the middle of it. Two of them plus the two lips gave
  // the trail four horizontal lines across it, and it read as strata.
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (rng.chance(0.22)) continue; // the rut breaks up rather than running true
    const y = Math.round(trailTop[x] + (trailBot[x] - trailTop[x]) * 0.52);
    ctx.fillStyle = PALETTE.soilDark;
    ctx.fillRect(x, y, 1, 1);
  }

  // Grit and small stones in the dirt.
  for (let i = 0; i < 240; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(trailTop[x] + 2, Math.max(trailTop[x] + 3, trailBot[x] - 3));
    ctx.fillStyle = rng.chance(0.6) ? PALETTE.soilLight : PALETTE.soilDeep;
    ctx.fillRect(x, y, rng.chance(0.18) ? 2 : 1, 1);
  }

  // Blades leaning in over both edges, so neither reads as a cut line.
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (trailTop[x] > 0 && rng.chance(0.4)) {
      ctx.fillStyle = PALETTE.grassMid;
      ctx.fillRect(x, trailTop[x], 1, rng.int(1, 2));
    }
    if (rng.chance(0.45)) {
      ctx.fillStyle = PALETTE.grassDark;
      ctx.fillRect(x, trailBot[x] - rng.int(1, 3), 1, rng.int(1, 3));
    }
  }

  // --- foreground grass, falling into shadow towards the camera ---
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const b = trailBot[x];
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x, b, 1, height - b);
  }
  const near = Math.round(height * 0.55);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    ctx.globalAlpha = k * 0.6;
    ctx.fillStyle = PALETTE.grassDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  // Blade texture over the whole foreground: short vertical dashes, never
  // single dots — a dot field reads as static, a dash field reads as grass.
  for (let i = 0; i < 560; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(trailBot[x] + 1, height - 1);
    ctx.fillStyle = rng.chance(0.45) ? PALETTE.grassMid : PALETTE.grassDark;
    ctx.fillRect(x, y, 1, rng.int(1, 3));
  }
  // A handful of blooms down there too, so the near field is not flat green.
  for (let i = 0; i < 26; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(trailBot[x] + 2, height - 8);
    ctx.fillStyle = rng.pick([PALETTE.bloomCream, PALETTE.bloomPink, PALETTE.goldLight]);
    ctx.fillRect(x, y, 1, 1);
  }

  return canvas;
}

/**
 * The near verge: the grass a pace in front of the traveller, running faster
 * than the camera and cut off by the bottom of the frame.
 *
 * It is the same idea as the tree line on the middle hills, at the other end
 * of the picture — a broken edge instead of a straight one — and it is doing
 * the harder job of the two: the tree line says the horizon is far away, and
 * this says the traveller is standing IN the field rather than in front of a
 * painting of one.
 */
function makeMeadowFringe({ seed, height }) {
  return makeRidgeLayer({
    seed,
    height,
    baseline: Math.round(height * 0.6),
    amplitude: 4,
    roughness: 1,
    crest: 2,
    colors: { body: PALETTE.grassDeep, light: PALETTE.grassDark, dark: PALETTE.grassDeep },
    decorate: (ctx, heights, rng, h) => {
      // Blades off the top edge, two pixels wide as everywhere else in this
      // biome, and the odd bloom among them.
      for (let x = 0; x < LAYER_TILE_W; x++) {
        const top = h - heights[x];
        if (rng.chance(0.5)) {
          ctx.fillStyle = rng.chance(0.5) ? PALETTE.grassDark : PALETTE.grassDeep;
          ctx.fillRect(x, top - rng.int(2, 6), rng.chance(0.4) ? 2 : 1, 7);
        }
        if (rng.chance(0.035)) {
          const bloom = rng.pick([PALETTE.bloomCream, PALETTE.bloomPink, PALETTE.goldLight]);
          const top2 = top - rng.int(4, 8);
          ctx.fillStyle = PALETTE.grassDark;
          ctx.fillRect(x, top2, 1, 8);
          ctx.fillStyle = bloom;
          ctx.fillRect(x, top2 - 1, 1, 1);
        }
      }
      for (let i = 0; i < 320; i++) {
        const x = rng.int(0, LAYER_TILE_W - 1);
        const y = rng.int(h - heights[x] + 2, h - 1);
        ctx.fillStyle = rng.chance(0.5) ? PALETTE.grassDark : PALETTE.grassDeep;
        ctx.fillRect(x, y, 1, rng.int(1, 3));
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Ambient life
// ---------------------------------------------------------------------------

/**
 * What is in the air. The desert has weather and nothing else; the prairie is
 * alive, and that difference is doing as much work as the colour is.
 *
 * Three populations, all keyed to the hour of the day so the biome changes
 * character at dusk rather than just getting darker:
 *
 *   seed fluff   drifting motes, out whenever there is light
 *   butterflies  two of them, daylight only, on a lazy sine
 *   fireflies    after dark only, pulsing, low to the ground
 *
 * Positions are normalised to the viewport rather than to the world: these are
 * things a metre from the camera, and parallaxing them against a horizon they
 * are nowhere near just makes them look pinned to the backdrop.
 */
function createMeadowAmbient(seed) {
  const rng = makeRng(seed >>> 0);
  let clock = 0;

  const motes = Array.from({ length: 30 }, () => ({
    x: rng(),
    y: rng.range(0.15, 0.95),
    vx: rng.range(-0.028, -0.008),
    drift: rng.range(0.4, 1.5),
    phase: rng.range(0, Math.PI * 2),
    a: rng.range(0.2, 0.55),
  }));

  const flies = Array.from({ length: 22 }, () => ({
    x: rng(),
    y: rng.range(0.55, 0.95),
    vx: rng.range(-0.02, 0.02),
    vy: rng.range(-0.01, 0.01),
    rate: rng.range(900, 2200),
    phase: rng.range(0, Math.PI * 2),
  }));

  const flutters = Array.from({ length: 2 }, () => ({
    x: rng(),
    y: rng.range(0.45, 0.75),
    vx: rng.range(-0.05, -0.02),
    bob: rng.range(0.02, 0.05),
    rate: rng.range(700, 1300),
    phase: rng.range(0, Math.PI * 2),
    color: rng.chance(0.5) ? PALETTE.bloomPink : PALETTE.goldLight,
  }));

  const wrap = (p) => {
    if (p.x < -0.05) p.x = 1.05;
    if (p.x > 1.05) p.x = -0.05;
    if (p.y < -0.05) p.y = 1.05;
    if (p.y > 1.05) p.y = -0.05;
  };

  return {
    update(dt) {
      clock += dt;
      const step = dt / 1000;
      for (const m of motes) {
        m.x += m.vx * step;
        m.y += Math.sin(clock / 1800 + m.phase) * 0.004 * m.drift * step * 60;
        wrap(m);
      }
      for (const f of flies) {
        f.x += f.vx * step;
        f.y += f.vy * step;
        if (Math.random() < dt / 2200) {
          f.vx = rng.range(-0.02, 0.02);
          f.vy = rng.range(-0.012, 0.012);
        }
        wrap(f);
      }
      for (const b of flutters) {
        b.x += b.vx * step;
        b.y += Math.sin(clock / 900 + b.phase) * b.bob * step * 8;
        wrap(b);
      }
    },

    /**
     * @param {object} sky the current `getSky()` snapshot — `light` fades the
     *   daytime life out and `stars` brings the fireflies up.
     */
    render(ctx, view, sky) {
      const s = view.scale;
      const day = Math.max(0, Math.min(1, (sky.light - 0.4) / 0.4));
      const night = sky.stars;

      if (day > 0.02) {
        ctx.fillStyle = PALETTE.bloomCream;
        for (const m of motes) {
          ctx.globalAlpha = m.a * day;
          ctx.fillRect(Math.round(m.x * view.w), Math.round(m.y * view.h), s, s);
        }
        ctx.globalAlpha = 1;

        // Butterflies: two rows of pixels that swap between "wings up" and
        // "wings out". Two frames is the whole animation — at this size a
        // third would only read as a flicker.
        for (const b of flutters) {
          const x = Math.round((b.x * view.w) / s) * s;
          const y = Math.round((b.y * view.h) / s) * s;
          ctx.globalAlpha = 0.85 * day;
          ctx.fillStyle = b.color;
          if (Math.sin(clock / b.rate * 6 + b.phase) > 0) {
            ctx.fillRect(x - s, y - s, s, s);
            ctx.fillRect(x + s, y - s, s, s);
            ctx.fillRect(x, y, s, s);
          } else {
            ctx.fillRect(x - 2 * s, y, s * 2, s);
            ctx.fillRect(x + s, y, s * 2, s);
          }
        }
        ctx.globalAlpha = 1;
      }

      if (night > 0.05) {
        for (const f of flies) {
          const pulse = Math.max(0, Math.sin(clock / f.rate * 2 + f.phase));
          const a = pulse * pulse * night;
          if (a < 0.03) continue;
          const x = Math.round((f.x * view.w) / s) * s;
          const y = Math.round((f.y * view.h) / s) * s;
          // A halo one step out at half strength, then the spark itself.
          ctx.globalAlpha = a * 0.28;
          ctx.fillStyle = PALETTE.greenLight;
          ctx.fillRect(x - s, y - s, s * 3, s * 3);
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = PALETTE.goldLight;
          ctx.fillRect(x, y, s, s);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
}

// ---------------------------------------------------------------------------

export const MEADOW_ART = {
  id: 'meadow',

  props: MEADOW_PROPS,

  /**
   * DEPTH RUNS PALE-TO-DARK HERE, THE OPPOSITE WAY FROM THE DESERT
   * -------------------------------------------------------------------------
   * The desert stacks dark ridges behind pale sand, and it works because the
   * ground is the brightest thing in it. Green does not behave that way: a
   * near hill the same value as the props standing on it swallows them, and
   * the first pass at this had grass tufts that simply disappeared.
   *
   * So the ranges recede into haze, the middle hills sit at a mid green, and
   * the rise closest to the walk line is the *darkest* thing on screen — which
   * is what every prop is silhouetted against, and why they read.
   */
  buildLayers: () => ({
    // More cloud than the desert gets, and a cool underside rather than the
    // desert's bone: a warm-bellied cloud over green reads as dust.
    clouds: makeCloudLayer({
      seed: 5150,
      height: 56,
      count: 10,
      size: [4, 9],
      tones: [PALETTE.white, PALETTE.white, '#c3cfdd'],
    }),
    // Distant ranges, drained towards the sky. Smooth, because roughness at
    // this depth just reads as dither noise.
    far: makeRidgeLayer({
      seed: 8123,
      height: 76,
      baseline: 34,
      amplitude: 24,
      // Enough waves that the range does not read as one cone repeated across
      // the tile, but not so many that it turns into dither noise at this depth.
      roughness: 0.5,
      colors: {
        body: PALETTE.hillHaze,
        light: PALETTE.hillHazeLight,
        dark: PALETTE.hillHazeDark,
      },
    }),
    // The wooded middle hills — the layer that says "prairie" rather than
    // "somewhere green".
    mid: makeRidgeLayer({
      seed: 3311,
      height: 68,
      baseline: 26,
      amplitude: 13,
      roughness: 0.5,
      colors: { body: PALETTE.grassMid, light: PALETTE.grass, dark: PALETTE.grassDark },
      decorate: treeLine,
    }),
    /**
     * The near rise, with blades standing off its crest. Its bottom row lands
     * exactly on the walk line (see the manifest) so it covers the whole gap
     * down to the trail and not one pixel more.
     */
    hills: makeRidgeLayer({
      seed: 6640,
      height: 36,
      baseline: 16,
      amplitude: 7,
      roughness: 0.85,
      colors: { body: PALETTE.grassDark, light: PALETTE.grassMid, dark: PALETTE.grassDeep },
      crest: 3,
      decorate: grassFringe,
    }),
    ground: makeMeadowGround({ seed: 4820, height: 72 }),
    fringe: makeMeadowFringe({ seed: 2277, height: 28 }),
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -110 },
    { name: 'far', speed: 0.15, y: -76 },
    { name: 'mid', speed: 0.4, y: -60 },
    // -36 with a height of 36: the rise ends where the trail begins.
    { name: 'hills', speed: 0.7, y: -36, near: true },
    { name: 'ground', speed: 1.0, y: 0 },
    { name: 'fringe', speed: 1.3, y: -16, anchor: 'bottom', front: true },
  ],

  /**
   * Weights, tuned so the common case is grass and the rare case is a
   * landmark. About a third of the roll is something with height in it —
   * wheat, a bush, a sapling, a tree — because a field of nothing but ankle-
   * high tufts has no skyline, and the walk stops having anything to arrive at.
   */
  scatter: [
    { name: 'grassTuft', weight: 17 },
    { name: 'grassClump', weight: 15 },
    { name: 'flowerPatch', weight: 13 },
    { name: 'wheatWild', weight: 13 },
    { name: 'berryBush', weight: 11 },
    { name: 'flowerSpire', weight: 9 },
    { name: 'sapling', weight: 9 },
    { name: 'tree', weight: 8 },
    { name: 'rockMossy', weight: 7 },
    { name: 'logFallen', weight: 5 },
    { name: 'stump', weight: 5 },
    { name: 'fencePost', weight: 4 },
    { name: 'hayBale', weight: 4 },
    { name: 'thistle', weight: 7 },
    { name: 'mushrooms', weight: 5 },
    // A scarecrow is a man-shape, and a man-shape the player has seen once is
    // a landmark. Rare enough that meeting one is an event, and never mirrored
    // — a scarecrow with its hat brim the other way round is a different
    // scarecrow, and the eye notices that it is not.
    { name: 'scarecrow', weight: 2, flip: false },
  ],

  /** Blades, a stone, a clock of seed. */
  clutter: [
    { name: 'grassSprig', weight: 14 },
    { name: 'dandelion', weight: 7 },
    { name: 'fieldStone', weight: 5 },
  ],
  clutterCell: 19,

  /**
   * The far band: the wood on the other side of the field. Only the solid
   * masses go in it — the tree, the sapling and the bush read as green
   * silhouettes at any size, and a fence or a bale at that distance reads as
   * a smudge somebody left on the hill.
   */
  backdrop: {
    cell: 74,
    y: -7,
    gap: 0.26,
    // The one biome whose far band is drawn a pixel step down. Its trees are
    // the tallest props in the game, so there is height to spare above the
    // crest even after shrinking them, and a full-size oak behind a low green
    // rise reads as an oak standing in the next field rather than as woodland.
    shrink: true,
    haze: PALETTE.hillHaze,
    hazeA: 0.5,
    scatter: [
      { name: 'tree', weight: 22 },
      { name: 'sapling', weight: 14 },
      { name: 'berryBush', weight: 10 },
    ],
  },

  /**
   * Tighter than the desert's 76. A prairie is crowded — the whole difference
   * between the two biomes on the ground is that one of them has something
   * growing every few paces and the other has one saguaro a minute.
   */
  scatterCell: 52,

  groundFill: PALETTE.grassDeep,

  /** Boots on a dirt trail kick up earth, not sand. */
  dust: 'rgba(160, 124, 78, 0.45)',

  /** Buildings here stand on turned earth rather than on a sand apron. */
  structureGround: { r: PALETTE.soilDark, s: PALETTE.soil },

  ambient: createMeadowAmbient,
};
