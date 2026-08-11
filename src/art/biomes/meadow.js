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
import { bake, makeCanvas } from '../pixel.js';
import { makeRng } from '../../core/rng.js';
import {
  BIRD_POSES,
  KEY,
  LAYER_TILE_W,
  bandFit,
  drawBird,
  makeCloudLayer,
  makeRidgeLayer,
  planeGrain,
  planePebble,
  planeZoom,
} from '../env-kit.js';

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

  /**
   * A dry-stone wall, tumbled at one end. It is the one prop on the prairie
   * with a straight line in it, which is exactly why it is here: everything
   * else out here grew, and a man-made edge among all that softness is what
   * makes the rest of it read as country rather than as texture.
   */
  stoneWall: [
    '....yYYy.yYy...',
    '..yYYyyYYyyYYy.',
    '.yYYyvyyvyYYyvv',
    'yYYyvvyYYyvyyvv',
    'yYyvvyYYyvvyYyv',
    'yyvvyYyvvyyvvyv',
    'lllllllllllllll',
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

const wrapX = (x) => ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;

/**
 * THE RANGE ON THE HORIZON, AND WHY IT IS NOT A SINE ANY MORE
 * ---------------------------------------------------------------------------
 * The far layer used to be nothing but `makeRidgeLayer` with a haze colour in
 * it: a sum of five sines, three of them at low frequency, drawn as a solid
 * silhouette with a two-pixel lit crest. Which is a *hill*, repeated — and
 * because a sine has no corner in it and the same five waves ran across all 320
 * pixels of the tile, what the player actually saw was one green-grey hump
 * arriving again every screen and a half, forever. It was the single most
 * repetitive thing in the game.
 *
 * A mountain is not a smooth curve. It is two straight slopes of DIFFERENT
 * steepness meeting at a summit that is usually off to one side, with a spur
 * running down the front of it, gullies cut into its faces, and other mountains
 * standing behind and between it. All of that is drawn here explicitly:
 *
 *   - two ranges, the back one paler and lower, so the horizon has depth in it
 *     rather than being one cut-out
 *   - each peak gets its own asymmetry, so no two are the same shape and none
 *     of them is symmetrical
 *   - the lit face (left, like every light in this game) is one step up the
 *     haze ramp and the shaded face one step down, with the ridge line between
 *     them — which is what makes a triangle read as a solid
 *   - gullies down the shaded face and a scree fan where they run out
 *   - the odd wood on the lower slopes, four pixels of darker green apiece
 *
 * The generator's sine is still under all of it as the *plain* the range stands
 * on. That is what a plain is for.
 */
function mountainRange(ctx, heights, rng, height) {
  const plot = (x, y, color) => {
    if (y < 0 || y >= height) return;
    ctx.fillStyle = color;
    ctx.fillRect(wrapX(x), y, 1, 1);
  };

  /**
   * One peak. `back` puts it in the further range: paler, and drawn before the
   * front one so the front range overlaps it.
   */
  const peak = (cx, h, back) => {
    /**
     * The front range is DARKER than the back one, which is the right way
     * round and looks wrong written down: distance drains a landscape towards
     * the sky, so the peaks eight miles off are pale and the ones two miles off
     * are not. Both share the lit ridge line, because both are catching the
     * same sun.
     */
    const body = back ? PALETTE.hillHaze : PALETTE.hillHazeDark;
    const lit = back ? PALETTE.hillHazeLight : PALETTE.hillHaze;
    const ridge = PALETTE.hillHazeLight;
    // The two slopes. A mountain with the same run either side of the summit is
    // a pyramid, and the eye has never seen one on a horizon.
    const leftRun = h * rng.range(1.5, 2.6);
    const rightRun = h * rng.range(1.5, 2.6);
    const gullyAt = rng.range(0.3, 0.7);

    for (let dx = -Math.round(leftRun); dx <= Math.round(rightRun); dx++) {
      const run = dx < 0 ? leftRun : rightRun;
      const k = Math.abs(dx) / run;
      if (k > 1) continue;
      /**
       * The profile: steep near the summit and easing out towards the foot,
       * which is what a mountain does and what a straight line does not. `k**1.6`
       * is the whole of it — a slope that is concave in exactly this way is the
       * difference between a mountain and a tent.
       */
      const local = Math.round(h * (1 - k ** 1.6));
      if (local < 1) continue;
      const foot = height - heights[wrapX(cx + dx)];
      const top = foot - local;
      const bottom = Math.min(height, foot + 1);
      for (let y = Math.max(0, top); y < bottom; y++) {
        plot(cx + dx, y, dx < 0 ? lit : body);
      }
      // The ridge line, and the summit cap on top of it.
      plot(cx + dx, top, ridge);
      // A gully down the shaded face, with the scree it has dropped at the end
      // of it. Only on the big ones — a gully on a foothill is a scratch.
      if (!back && dx > 0 && h > 14) {
        const gully = Math.round(rightRun * gullyAt);
        if (dx === gully || dx === gully + 1) {
          for (let y = top + 2; y < bottom - 1; y++) plot(cx + dx, y, PALETTE.hillHazeDark);
        }
      }
    }

    // Woods on the lower slopes: four pixels each, and only ever below the
    // halfway line. Trees on a summit is a hill with a hat on.
    if (back) return;
    for (let i = 0; i < Math.round(h / 3); i++) {
      const dx = rng.int(-Math.round(leftRun) + 1, Math.round(rightRun) - 1);
      const run = dx < 0 ? leftRun : rightRun;
      const k = Math.abs(dx) / run;
      if (k < 0.45) continue;
      const foot = height - heights[wrapX(cx + dx)];
      const local = Math.round(h * (1 - k ** 1.6));
      const y = foot - rng.int(1, Math.max(2, local));
      plot(cx + dx, y, PALETTE.hillHazeDark);
      plot(cx + dx - 1, y + 1, PALETTE.hillHazeDark);
      plot(cx + dx + 1, y + 1, PALETTE.hillHazeDark);
    }
  };

  // The back range: low, pale, and placed on its own grid so it does not sit
  // in step with the front one.
  for (let i = 0; i < 7; i++) {
    peak(rng.int(0, LAYER_TILE_W - 1), rng.int(9, 19), true);
  }
  // And the front range. Sorted by height and drawn small-first, so the big
  // ones overlap the small ones rather than being interrupted by them.
  const front = Array.from({ length: 6 }, () => ({
    cx: rng.int(0, LAYER_TILE_W - 1),
    h: rng.int(13, 34),
  })).sort((a, b) => a.h - b.h);
  for (const p of front) peak(p.cx, p.h, false);
}

/**
 * The wooded crest of the middle hills, and the fields under it.
 *
 * The crowns are little masses pushed down onto the ridge line, in a green one
 * step darker than the hill they stand on, with a lit top — at this distance a
 * tree is four pixels and a suggestion, and any more detail than that turns the
 * horizon into noise.
 *
 * What is new is everything they are standing in. A middle distance of plain
 * green with a fringe of trees along the top of it was the other half of the
 * prairie's emptiness: the eye had a skyline to read and then forty pixels of
 * nothing beneath it. So the slope is now farmed — patches of crop and pasture
 * at slightly different values, with a hedgerow along the join and the odd bare
 * furrowed field among them. It is the oldest trick in landscape painting and
 * it is doing the same job here that it does there: patchwork is what tells you
 * a hillside is a hillside and not a wall.
 */
function fieldedHills(ctx, heights, rng, height) {
  const plot = (x, y, color) => {
    if (y < 0 || y >= height) return;
    ctx.fillStyle = color;
    ctx.fillRect(wrapX(x), y, 1, 1);
  };

  // --- the fields ---
  for (let i = 0; i < 26; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const w = rng.int(14, 46);
    const top = rng.int(1, 10);
    const h = rng.int(5, 16);
    const tone = rng.pick([PALETTE.grass, PALETTE.grassLight, PALETTE.grassDark, PALETTE.goldLight]);
    const crop = tone === PALETTE.goldLight;
    for (let dx = 0; dx < w; dx++) {
      const x = cx + dx;
      const base = height - heights[wrapX(x)];
      // A field lies ON the slope: its top edge follows the ridge down.
      const y0 = base + top;
      for (let y = y0; y < Math.min(height, y0 + h); y++) {
        // Ripe crop is drawn as rows rather than as a flat colour, which is
        // what stops four gold fields from reading as four gold rectangles.
        if (crop && (y - y0) % 2 === 1) continue;
        ctx.globalAlpha = crop ? 0.7 : 0.55;
        plot(x, y, tone);
        ctx.globalAlpha = 1;
      }
      // The hedgerow along the top edge, broken by gateways.
      if (rng.chance(0.72)) plot(x, y0, PALETTE.grassDeep);
    }
    // And the one down the near side of it.
    for (let y = 0; y < h; y++) {
      const base = height - heights[wrapX(cx)];
      if (rng.chance(0.3)) continue;
      plot(cx, base + top + y, PALETTE.grassDeep);
    }
  }

  // --- the tree line along the crest ---
  for (let i = 0; i < 54; i++) {
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
 * The ground the player actually walks on: a dirt trail worn through grass,
 * drawn as a floor running away from the camera.
 *
 * THE TRAIL HAS TWO VERGES NOW, AND THAT IS THE WHOLE CHANGE
 * ---------------------------------------------------------------------------
 * The boots used to land on row zero of this layer, so the trail started there
 * and every blade of grass in the biome was in front of the traveller. He
 * walked along the back edge of his own path. The walk line sits `PLANE_RISE`
 * rows down now, so the field comes back over the top: grass behind him, dirt
 * under him, grass in front. It is the same three ingredients and it reads as
 * a path through a meadow instead of a meadow with a path in front of it.
 *
 * The trail's edges are straight rather than wandering, and the blades and
 * stones lying along them do the work the wave used to. That is forced — the
 * renderer scrolls this canvas in depth bands and a wave crossing four of them
 * is torn into four — but it is also better: the litter along the edge is
 * band-local, so it travels at the speed of the ground it is lying on, and
 * three speeds of scattered edge says depth where one speed of smooth edge only
 * ever said shape. See the note over `PLANE_RISE` in `env-kit.js`.
 */
function makeMeadowGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  /** Where the dirt begins and ends, in rows. The walk line is at 22. */
  const trailTop = 9;
  const trailBot = 38;

  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  // --- the field behind the trail, lit and slightly hazed by distance ---
  ctx.fillStyle = PALETTE.grassMid;
  ctx.fillRect(0, 0, LAYER_TILE_W, trailTop);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = PALETTE.hillHaze;
  ctx.fillRect(0, 0, LAYER_TILE_W, 3);
  ctx.globalAlpha = 1;

  // --- the trail ---
  ctx.fillStyle = PALETTE.soil;
  ctx.fillRect(0, trailTop, LAYER_TILE_W, trailBot - trailTop);
  // Lit lip along the far edge, shadowed lip along the near one: the trail is
  // a shallow dish, not a decal.
  ctx.fillStyle = PALETTE.soilLight;
  ctx.fillRect(0, trailTop, LAYER_TILE_W, 2);
  ctx.fillStyle = PALETTE.soilDark;
  ctx.fillRect(0, trailBot - 2, LAYER_TILE_W, 2);

  // One wheel rut, in the band just in front of the boots. Two of them plus the
  // two lips gave the trail four horizontal lines across it and it read as
  // strata; one, broken, reads as a rut.
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (rng.chance(0.24)) continue;
    ctx.fillStyle = PALETTE.soilDark;
    ctx.fillRect(x, 27, 1, 1);
    if (rng.chance(0.4)) {
      ctx.fillStyle = PALETTE.soilLight;
      ctx.fillRect(x, 28, 1, 1);
    }
  }

  // Grit in the dirt, growing towards the camera.
  planeGrain(ctx, rng, {
    height,
    from: trailTop + 2,
    to: trailBot - 3,
    count: 380,
    colors: [PALETTE.soilLight, PALETTE.soilDeep, PALETTE.soilDark],
  });

  // Hoof-cut earth: shallow scoops with the soil thrown up behind them.
  for (let i = 0; i < 26; i++) {
    const y = bandFit(rng.int(trailTop + 3, trailBot - 4), 2, height);
    const zoom = planeZoom(y, height);
    const x = rng.int(0, LAYER_TILE_W - 1);
    ctx.fillStyle = PALETTE.soilDeep;
    ctx.fillRect(x, y, Math.max(2, Math.round(3 * zoom)), 1);
    ctx.fillStyle = PALETTE.soilLight;
    ctx.fillRect(x, y - 1, Math.max(1, Math.round(2 * zoom)), 1);
  }

  // --- foreground grass, falling into shadow towards the camera ---
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, trailBot, LAYER_TILE_W, height - trailBot);
  const near = Math.round(height * 0.66);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    ctx.globalAlpha = k * 0.6;
    ctx.fillStyle = PALETTE.grassDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  /**
   * Blade texture over both verges: short vertical dashes, never single dots —
   * a dot field reads as static, a dash field reads as grass. They get taller
   * towards the camera, which is the same perspective the stones and the ruts
   * are drawn to and the reason the far verge reads as being further off rather
   * than just being smaller.
   */
  for (let i = 0; i < 900; i++) {
    const far = rng.chance(0.3);
    const y = far ? rng.int(0, trailTop - 1) : rng.int(trailBot, height - 1);
    const zoom = planeZoom(y, height);
    const len = Math.max(1, Math.round(rng.range(1, 2.6) * zoom));
    ctx.fillStyle = rng.chance(0.45) ? PALETTE.grassMid : PALETTE.grassDark;
    ctx.fillRect(rng.int(0, LAYER_TILE_W - 1), bandFit(y, len, height), 1, len);
  }

  // Blades leaning in over both lips of the trail, so neither reads as a cut
  // line. This is what replaced the wandering edge, and it is doing it better.
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (rng.chance(0.45)) {
      ctx.fillStyle = PALETTE.grassMid;
      ctx.fillRect(x, trailTop - rng.int(0, 1), 1, rng.int(1, 2));
    }
    if (rng.chance(0.5)) {
      ctx.fillStyle = PALETTE.grassDark;
      ctx.fillRect(x, trailBot - 1, 1, rng.int(1, 3));
    }
  }

  // Stones the plough turned up, lying in both verges with a shadow under each.
  for (let i = 0; i < 60; i++) {
    planePebble(ctx, rng, {
      height,
      y: rng.chance(0.3) ? rng.int(1, trailTop - 1) : rng.int(trailBot + 1, height - 3),
      colors: { body: PALETTE.grey, light: PALETTE.steel, shadow: PALETTE.grassDeep },
    });
  }

  // Blooms, so neither verge is flat green. Bigger and brighter near the
  // camera; at the back of the plane a flower is one pixel, and should be.
  for (let i = 0; i < 60; i++) {
    const far = rng.chance(0.35);
    const y = far ? rng.int(1, trailTop - 1) : rng.int(trailBot + 1, height - 4);
    const zoom = planeZoom(y, height);
    const bloom = rng.pick([PALETTE.bloomCream, PALETTE.bloomPink, PALETTE.goldLight, PALETTE.bloomBlue]);
    const w = Math.max(1, Math.round(zoom - 0.4));
    const py = bandFit(y, 2, height);
    const x = rng.int(0, LAYER_TILE_W - 1);
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(x, py + 1, 1, 1);
    ctx.fillStyle = bloom;
    ctx.fillRect(x, py, w, 1);
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
// Landmarks
// ---------------------------------------------------------------------------

/**
 * A barn and its silo, out on the middle hills.
 *
 * It is a LANDMARK rather than a scatter prop or a decoration baked into a
 * layer, which is a distinction worth keeping straight: layers tile every 320
 * pixels, so anything drawn into one is back again in a screen and a half, and
 * scatter props stand on the road where the player walks past them at arm's
 * length. This is neither. It stands a long way off, it comes round once every
 * eight hundred paces, and the whole of its job is to be the thing on the
 * horizon that the player recognises when the road bends back towards it.
 *
 * Red, because a barn is red and because there is no other red in the prairie —
 * one warm rectangle in forty thousand pixels of green is worth more than any
 * amount of detail anywhere else in the frame.
 */
const BARN = [
  '.........................',
  '.........wwwww...........',
  '.......wwqqqqqww.........',
  '.....wwqqqqqqqqqww.......',
  '...wwqqqqqqqqqqqqqww.....',
  '..wqqqqqqqqqqqqqqqqqw....',
  '..xqqqqqqqqqqqqqqqqqx....',
  '..eeeeeeeeeeeeeeeeeee.WW.',
  '..eeeeeebbbbbeeeeeeee.Ww.',
  '..eeeeeebbbbbeeeeeeee.Ww.',
  '..eeeeeebbbbbeeeeeeee.Ww.',
  '..eqeeeebbbbbeeeeqeee.Ww.',
  '..eeeeeebbbbbeeeeeeee.Ww.',
  '..eeeeeebbbbbeeeeeeee.Ww.',
  '..eeqeeebbbbbeeeeeqee.Ww.',
  '..eeeeeebbbbbeeeeeeee.Ww.',
  '..xxxxxxxxxxxxxxxxxxx.xx.',
  '..lllllllllllllllllllll..',
];

let barnCache = null;

function buildMeadowLandmarks() {
  if (!barnCache) barnCache = { barn: bake({ key: KEY, rows: BARN }) };
  return barnCache;
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

  /**
   * A flock crossing the sky, and the one thing in this biome that is properly
   * animated rather than merely moving.
   *
   * Five birds in a loose skein: each one holds a station relative to the
   * leader, and each one beats its wings on its OWN clock, a little out of
   * phase with its neighbour. That last part is the whole effect. Five birds
   * flapping in unison is a decal being dragged sideways; five birds flapping
   * out of step is a flock, and the difference is one number per bird.
   *
   * They fly in bounds rather than on a line — a beat or two of climb, then a
   * glide with the wings half folded — which is what most small birds actually
   * do and what the vultures over the desert deliberately never do.
   */
  const flock = {
    x: 1.3,
    y: rng.range(0.16, 0.34),
    vx: rng.range(-0.05, -0.03),
    wait: rng.range(3000, 12000),
    birds: Array.from({ length: 5 }, (_, i) => ({
      dx: -i * rng.range(0.018, 0.03),
      dy: (i % 2 ? 1 : -1) * rng.range(0.008, 0.024),
      rate: rng.range(120, 190),
      phase: rng.range(0, Math.PI * 2),
    })),
  };

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

      // The flock crosses, then the sky is empty for a while. A skein that
      // wraps round and comes back every eight seconds is a carousel.
      if (flock.x < -0.25) {
        flock.wait -= dt;
        if (flock.wait <= 0) {
          flock.x = 1.3;
          flock.y = rng.range(0.14, 0.36);
          flock.vx = rng.range(-0.06, -0.03);
          flock.wait = rng.range(6000, 22000);
        }
      } else {
        flock.x += flock.vx * step;
        flock.y += Math.sin(clock / 3400) * 0.0006 * step * 60;
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

      // --- the flock ---
      if (day > 0.05 && flock.x > -0.25) {
        ctx.fillStyle = PALETTE.inkSoft;
        ctx.globalAlpha = day * 0.72;
        for (const b of flock.birds) {
          const x = Math.round(((flock.x + b.dx) * view.w) / s) * s;
          const y = Math.round(((flock.y + b.dy) * view.h) / s) * s;
          if (x < -6 * s || x > view.w + 6 * s) continue;
          // Bounding flight: the bird rises on the beat and dips through the
          // glide, so the whole skein undulates instead of sliding.
          const t = clock / b.rate + b.phase;
          const bob = Math.round(Math.sin(t) * 1.4) * s;
          drawBird(ctx, x, y + bob, s, BIRD_POSES.bound, Math.floor(t / (Math.PI / 2)));
        }
        ctx.globalAlpha = 1;
      }

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
    /**
     * The range. The sine here is the PLAIN the mountains stand on and nothing
     * else — it is low and nearly flat on purpose, because everything the eye
     * reads as the skyline is drawn by `mountainRange`. That is the same
     * division of labour the desert's mesas and the pass's peaks use, and it
     * arrived here last: this was the layer that was still a row of identical
     * humps long after the other five had a horizon with a shape.
     */
    far: makeRidgeLayer({
      seed: 8123,
      height: 84,
      baseline: 14,
      amplitude: 5,
      roughness: 0.4,
      colors: {
        body: PALETTE.hillHaze,
        light: PALETTE.hillHazeLight,
        dark: PALETTE.hillHazeDark,
      },
      decorate: mountainRange,
    }),
    // The farmed middle hills — the layer that says "prairie" rather than
    // "somewhere green".
    mid: makeRidgeLayer({
      seed: 3311,
      height: 68,
      baseline: 26,
      amplitude: 13,
      roughness: 0.5,
      colors: { body: PALETTE.grassMid, light: PALETTE.grass, dark: PALETTE.grassDark },
      decorate: fieldedHills,
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
    { name: 'far', speed: 0.15, y: -84 },
    { name: 'mid', speed: 0.4, y: -60 },
    // -36 with a height of 36: the rise ends where the floor begins.
    { name: 'hills', speed: 0.7, y: -36, near: true },
    { name: 'ground', speed: 1.0, y: 0 },
    { name: 'fringe', speed: 1.9, y: -16, anchor: 'bottom', front: true },
  ],

  /**
   * One barn, out on the middle hills, every eight hundred paces or so.
   *
   * It is drawn straight after the `mid` layer and its baseline is set LOW —
   * near enough to the top of the floor that the near rise, which is drawn
   * after it, comes down over its footings. That is the same trick the far prop
   * band uses and it is the whole reason the barn reads as being a field away
   * instead of as a red box parked on a hilltop: you never see the bottom of a
   * distant building, because there is always a fold of ground in front of it.
   */
  landmarks: [
    { name: 'barn', after: 'mid', speed: 0.4, spacing: 820, jitter: 300, y: -26, gap: 0.25 },
  ],

  buildLandmarks: buildMeadowLandmarks,

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
    { name: 'stoneWall', weight: 5 },
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
