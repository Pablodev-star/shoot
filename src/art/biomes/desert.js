/**
 * SHOOT! — Desert biome art.
 *
 * The world the game opens in and the one the menu backdrop shows: hardpan and
 * sand, red mesas on the horizon, saguaro and bone along the road.
 *
 * IT WAS THE OLDEST ART IN THE GAME, AND IT SHOWED
 * ---------------------------------------------------------------------------
 * This is the landscape everything else was drawn against, and it was the last
 * one to be finished. Every biome written after it — the prairie, the pass, the
 * bayou, the basin, the void — learned something the desert never got told: a
 * skyline needs a shape of its own and not just a darker tone of the ground, a
 * ground strip needs a road worn into it, and air with nothing in it reads as a
 * painting rather than as a place. Three rolling brown humps, a flat sand strip
 * and eight props was what the first world looked like while the sixth had
 * mountains, aurora and fireflies.
 *
 * So: the far range is mesas now, cut flat on top with their strata showing,
 * because that silhouette is the single most recognisable thing about this
 * country and a sine wave cannot make it. The middle distance is broken rock
 * with scree at its feet. The ground has a wagon road worn down it. Fourteen
 * props stand along it instead of eight, and there is something in the air at
 * every hour: dust and a pair of vultures by day, a tumbleweed rolling through
 * on the wind, moths after dark.
 *
 * SCENERY CARRIES NO OUTLINE
 * ---------------------------------------------------------------------------
 * The character, the enemies and the items are outlined in ink so they read as
 * *things the player acts on*, and pop off whatever is behind them. The
 * scenery is not one of those things: it is the picture the actors stand in
 * front of. A black keyline around every cactus and every pebble put the
 * backdrop on the same visual footing as the gunslinger, and in a scene lit by
 * a moving sun it also nailed each prop to a colour the light never touches.
 *
 * So these props are shaded instead of outlined: light from the top left, a
 * mid tone for the body, a dark tone of the SAME hue down the right-hand and
 * lower edges, and — where a prop meets the sand — a `z` contact shadow. The
 * silhouette is carried by contrast with the ground, which is how the parallax
 * ridges behind them have always worked.
 *
 * SCALE
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels. A barrel cactus comes to his knee,
 * the ocotillo and the saguaro stand over him, the adobe wall is chest high on
 * what is left of it. Props drawn without that ruler in hand are the fastest
 * way to make a side-on scene look like a collage.
 */

import { PALETTE } from '../palette.js';
import { makeCanvas } from '../pixel.js';
import { makeRng } from '../../core/rng.js';
import {
  BIRD_POSES,
  LAYER_TILE_W,
  PLANE_RISE,
  bandFit,
  bandRange,
  drawBird,
  getTumbleweedFrames,
  makeCloudLayer,
  makeRidgeLayer,
  planeGrain,
  planePebble,
  planeSpeed,
  planeZoom,
} from '../env-kit.js';

export const DESERT_PROPS = {
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

  /**
   * Ocotillo: a dozen bare whips out of one root, tipped in red after rain.
   * It is nearly all silhouette and nearly all gaps, which is exactly why it
   * belongs here — every other plant on this road is a solid mass, and a
   * roadside built out of solid masses has no lace in it.
   */
  ocotillo: [
    'e.........e',
    'd.e.....e.d',
    'd.d..e..d.d',
    'd.d.ed..d.d',
    '.d.d.d.d.d.',
    '.d.d.d.d.d.',
    '.d.d.d.dd..',
    '.d.d.d.d...',
    '..d.d.dd...',
    '..d.d.d....',
    '..d.dgd....',
    '...ddgd....',
    '...dggd....',
    '....ggd....',
    '....ggd....',
    '...zggdz...',
    '..zrRRRrz..',
  ],

  /**
   * Prickly pear. Pads stacked at angles with fruit along their top edges —
   * pads all facing the same way reads as a hand of cards, and the fruit is
   * the only warm colour in the plant, so it goes where the eye lands.
   */
  pricklyPear: [
    '.....eE....',
    '....gGGd.eE',
    '...gGGGd.Gd',
    'eE.gGGGdgGd',
    'GdgGGGGdgGd',
    'GdgGGGGdgGd',
    'GdgGGGGdgdd',
    'GdgGGGgd.d.',
    'GggGGGgd...',
    '.dggGGgd...',
    '..dgGGgd...',
    '...gGgdd...',
    '...gGgd....',
    '..zgGgdz...',
    '.zrRRRRrz..',
  ],

  /**
   * Yucca. A trunk of dead skirt with a burst of stiff blades on top and one
   * cream flower spike leaving them — the spike is what tells it apart from a
   * cactus at a glance, so it is drawn even though most of the year it is not
   * there.
   */
  yucca: [
    '.....f.....',
    '....fBf....',
    '....fBf....',
    '.....B.....',
    'g....B....g',
    'Gg..gBg..gG',
    '.Gg.gGg.gG.',
    '..GggGggG..',
    '...gGGGg...',
    '...wWXwd...',
    '...wWXw....',
    '...xwXw....',
    '...wWXx....',
    '...xwXw....',
    '..zxwXwz...',
    '.zrRRRRrz..',
  ],

  /**
   * Sagebrush: the grey-green scrub that is actually everywhere out here. It
   * is the common roll on the scatter table for the same reason — a desert
   * where every plant is a saguaro is a cartoon of a desert.
   */
  sagebrush: [
    '..y.y..y...',
    '.yYyYy.yY..',
    'yYAAAYyYAy.',
    '.yAAAAAAAYy',
    'yYAAAAAAAAy',
    '.yAAAAAAAy.',
    '..yAAAAAy..',
    '...wxwXw...',
    '..zwxXwz...',
    '.zrRRRRrz..',
  ],

  /**
   * Mesquite gone dead: a hard black-brown fork with no leaf on it. The
   * tallest thing on the desert floor and the only one with a canopy shape, so
   * a stretch of road with one on it has a landmark in it.
   */
  deadTree: [
    '....X...X..',
    '..X.x..Xx..',
    '..Xx.XxX...',
    '...XxxXX.X.',
    'X...XXX.xX.',
    '.Xx..XX.X..',
    '..XX.XXXX..',
    '...XxXXX...',
    '....XXx....',
    '....xXX....',
    '....XxX....',
    '...XXxXX...',
    '...XxXxX...',
    '..XX.X.XX..',
    '.XX..X..X..',
    '..zrXXXrz..',
    '.zrRRRRRrz.',
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
   * A boulder off the mesa, in the mesa's own red rock rather than in sand
   * tones — it came from up there, and the two rock families being visibly the
   * same stone is what ties the horizon to the road.
   */
  mesaRock: [
    '...----....',
    '..-____/...',
    '.-______//.',
    '-_______///',
    '-____/__///',
    '._____////.',
    '..//////...',
    '..zzzzzz...',
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

  /**
   * What is left of an adobe wall: two courses of mud brick with the render
   * fallen off one end and a beam still socketed in it. Somebody built here
   * and the desert took it back, which is the only story this road tells.
   */
  ruinWall: [
    '..RRr...rRRRRr....',
    '.RRRRr.RRRRRRRr...',
    'RRRRRrrRRRRRRRRr..',
    'RRrRRRRRRrRRRRRr.r',
    'RRRRRRRRRRRRRRRrRR',
    'RRRRrRRRRRRRrRRRRR',
    'rrrrrrrrrrrrrrrrrr',
    'RRRRRRRRxwWwRRRRRR',
    'RRRrRRRRxwWwRRrRRR',
    'RRRRRRRRxwWwRRRRRR',
    'rRRRRrRRxwWwRRRRrR',
    'zrrrrrrrrrrrrrrrrz',
    '.zzzzzzzzzzzzzzzz.',
  ],

  /** A wheel off a wagon nobody came back for, leaning on its own hub. */
  wagonWheel: [
    '...wwWww...',
    '..wXwWwXw..',
    '.wX.wWw.Xw.',
    'wX..wWw..Xw',
    'wXwwwWwwwXw',
    'WWWWWOWWWWW',
    'wXwwwWwwwXw',
    'wX..wWw..Xw',
    '.wX.wWw.Xw.',
    '..wXwWwXw..',
    '..zwwWww z.',
    '.zrRRRRRrz.',
  ],

  // --- clutter -------------------------------------------------------------
  // Litter for the tight band between the props: three to seven pixels each,
  // no silhouette to speak of, and the thing that stops a stretch of road with
  // no cactus on it from being bare canvas. Each one still ends on a contact
  // shadow, because at this size a two-pixel object with nothing under it
  // reads as a speck of dust on the monitor.

  /** A scatter of stones the wind has uncovered. */
  pebbles: [
    '..S..S...',
    '.SRr.SRr.',
    'SRRrrRRr.',
    '.zz..zz..',
  ],

  /** A dry stick, bleached. */
  twig: [
    '.....xX..',
    '..xXxx...',
    'xXx......',
    '.zz.zz...',
  ],

  /**
   * A tuft of dead grass that gave up. Bone and old gold, not fresh gold: the
   * first pass at this was drawn in the coin colours and every one of them
   * came off the road as a yellow bead. Dead grass is the same value as the
   * sand it is standing in — all it has is a different texture.
   */
  dryTuft: [
    '.B...u...',
    '.Bu.uB.u.',
    'uBuuBuBu.',
    '.uBuuBuu.',
    '..zzzzz..',
  ],

  /** One vertebra and a rib, half buried. */
  boneChip: [
    '..b......',
    '.bBb..b..',
    '..b..bBb.',
    '.zz..zz..',
  ],

  /**
   * A butte, drawn small and only ever used by the far band — see `backdrop`
   * at the foot of this file. Nothing on the walk line is made of rock this
   * big, and nothing in the far band is allowed to be a lattice: hazed back,
   * the dead mesquite came out as a grey scribble hanging over the dune, and
   * the only shapes that survive that treatment are solid ones.
   */
  butteSmall: [
    '...----------....',
    '..-__________/...',
    '.-___________//..',
    '-_____________//.',
    '-_____/_______//.',
    '-_____________//.',
    '-___/______/__//.',
    '-_____________//.',
    '.-___________//..',
    '.-____/_____///..',
    '.-__________//...',
    '.r-________//rr..',
    'rrr--_____//rrrr.',
    'rrrrr-///rrrrrrrr',
  ],

  /**
   * A tumbleweed that has stopped rolling, caught up against nothing in
   * particular. The same tangle the wind carries across the road in
   * `createDesertAmbient` — one of them lying still is what makes the moving
   * one read as the same object rather than as an effect.
   */
  weedRest: [
    '..xwx....',
    '.xwBwBwx.',
    'wxwBwxwBx',
    'xwBxwxBwx',
    '.wBwwwxBw',
    '.zwxwxBw.',
    '.zzrrrzz.',
  ],
};

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

const wrapX = (x) => ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;

/**
 * The mesas.
 *
 * A MESA IS A HORIZONTAL, AND THE RIDGE GENERATOR ONLY KNOWS CURVES
 * ---------------------------------------------------------------------------
 * `makeRidgeLayer` sums sines, which is right for dunes and wrong for this in
 * exactly the way it is wrong for a mountain: the defining feature of the
 * country the game opens in is a FLAT top with a vertical cliff under it, and
 * there is no amplitude or roughness that puts a corner in a sine. The desert
 * spent the whole project with rolling brown humps on its horizon for want of
 * this decorator — the same fix the pass needed for its peaks, upside down.
 *
 * Each butte is a stack of straight courses: a lit cap two pixels deep, a
 * cliff face banded with strata, and a talus skirt of scree spreading at the
 * foot where the cliff has been shedding for a thousand years. The strata run
 * dead level across the whole tile rather than per butte, because they are
 * beds of the same rock and a horizon where each hill has its own private
 * geology is the giveaway that a computer placed them.
 */
function mesas(ctx, heights, rng, height) {
  /** One shared bed table for the whole tile: the same rock, cut apart. */
  const beds = [];
  for (let y = 0; y < height; y++) beds[y] = rng.chance(0.16);

  const buttes = [];
  for (let i = 0; i < 9; i++) {
    buttes.push({
      cx: rng.int(0, LAYER_TILE_W - 1),
      h: rng.int(12, 34),
      half: rng.int(9, 30),
      // A step in the cap: most buttes are two tables, one lower than the other.
      step: rng.chance(0.55) ? rng.int(3, 8) : 0,
      stepAt: rng.range(0.3, 0.7),
      lean: rng.chance(0.5) ? 1 : -1,
    });
  }
  buttes.sort((a, b) => a.h - b.h);

  for (const b of buttes) {
    const foot = height - heights[b.cx];
    for (let dx = -b.half; dx <= b.half; dx++) {
      const x = wrapX(b.cx + dx);
      const k = (dx + b.half) / (b.half * 2);
      // The cap: flat, with one step in it, and the last two columns falling
      // away so the corner is a corner and not a razor.
      const stepped = b.lean > 0 ? k > b.stepAt : k < 1 - b.stepAt;
      const edge = Math.min(b.half - Math.abs(dx), 2);
      let top = foot - b.h + (stepped ? b.step : 0) + (2 - edge);
      const bottom = Math.min(height, height - heights[x] + 2);
      if (top >= bottom) continue;

      for (let y = Math.max(0, top); y < bottom; y++) {
        const depth = y - top;
        // Talus: the bottom fifth of the cliff is scree, and it spreads wider
        // than the cliff above it, so the butte sits ON the plain.
        const skirt = bottom - y < 4 && Math.abs(dx) > b.half - 3;
        if (depth < 2) ctx.fillStyle = PALETTE.mesaLight;
        else if (skirt) ctx.fillStyle = PALETTE.sandDark;
        else if (beds[y]) ctx.fillStyle = PALETTE.mesaDark;
        // The right-hand third of every butte is its shaded face. One light,
        // one dark, no gradient: rock this far off is two tones and a
        // silhouette.
        else ctx.fillStyle = k > 0.66 ? PALETTE.mesaDark : PALETTE.mesa;
        ctx.fillRect(x, y, 1, 1);
      }
      // Scree piling out from the foot.
      if (Math.abs(dx) > b.half - 4 && rng.chance(0.5)) {
        ctx.fillStyle = PALETTE.sandDark;
        ctx.fillRect(x + (dx > 0 ? 1 : -1), bottom - rng.int(1, 2), 1, 2);
      }
    }
  }
}

/**
 * The middle distance: broken rock rather than another dune, with boulders
 * shed down the slope and a few dry stems on the crest. The desert's fourth
 * layer is already a dune, and two dunes stacked is one dune.
 */
function brokenRock(ctx, heights, rng, height) {
  for (let i = 0; i < 40; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const base = height - heights[cx] + rng.int(0, 6);
    const r = rng.int(1, 3);
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * 1.6);
      for (let dx = -w; dx <= w; dx++) {
        ctx.fillStyle = dy < 0 && dx < 0 ? PALETTE.sandMid : PALETTE.sandDeep;
        ctx.fillRect(wrapX(cx + dx), base + dy, 1, 1);
      }
    }
  }
  // Dry stems standing off the crest, one pixel wide and two or three tall.
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (!rng.chance(0.14)) continue;
    ctx.fillStyle = PALETTE.sandDeep;
    ctx.fillRect(x, height - heights[x] - rng.int(2, 4), 1, 4);
  }
}

/**
 * Wind ripples running along the near dune, and the odd stone the wind has
 * uncovered. Sand is never smooth: the ripple is what tells you which way the
 * wind blows here, and the pass's sastrugi are the same pass in white.
 */
function duneRipples(ctx, heights, rng, height) {
  for (let i = 0; i < 52; i++) {
    const x0 = rng.int(0, LAYER_TILE_W - 1);
    const top = height - heights[x0];
    const y0 = top + rng.int(3, Math.max(4, height - top - 2));
    const len = rng.int(6, 20);
    for (let t = 0; t < len; t++) {
      const x = wrapX(x0 + t);
      const y = Math.round(y0 - Math.sin((t / len) * Math.PI) * 1.6);
      if (y <= height - heights[x] || y >= height) continue;
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = PALETTE.sandMid;
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }
  for (let i = 0; i < 26; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = height - heights[x] + rng.int(2, 10);
    ctx.fillStyle = PALETTE.sandDark;
    ctx.fillRect(x, y, rng.int(1, 3), 1);
  }
}

/**
 * The ground the player actually walks on: a wagon road worn through hardpan,
 * seen as a plane running away from the camera.
 *
 * THE WALK LINE IS IN THE MIDDLE OF IT, AND THAT CHANGED HOW IT IS DRAWN
 * ---------------------------------------------------------------------------
 * The boots used to land on row zero, so everything in this layer was in front
 * of the traveller and the road was a strip he walked along the back edge of.
 * They land on `PLANE_RISE` now — see the long note in `env-kit.js` — so this
 * canvas is a floor with a road down the middle of it: crust and blown sand
 * behind him, the wagon road under him, the cracked flat in front.
 *
 * THE SECOND CHANGE IS INVISIBLE HERE AND OBVIOUS ON SCREEN
 * ---------------------------------------------------------------------------
 * The renderer scrolls this layer in depth bands, each at its own speed, so a
 * pebble at the bottom of the canvas crosses the frame nearly twice as fast as
 * one at the top. Which imposes the single rule this file has to obey: NOTHING
 * WITH A TOP AND A BOTTOM MAY CROSS A BAND BOUNDARY, because the two halves
 * would slide apart forever. Every stone, rut and crack below is placed through
 * `bandFit` or clamped to `bandRange`.
 *
 * It also killed the wandering road edges. A road whose lip moves up and down
 * across four bands is torn into four lips, so the edges are horizontal now and
 * the straightness is broken the way a real verge breaks it: with stones and
 * dry stems lying ALONG it. That reads better than the old wave did, because
 * the litter is band-local and therefore travels at the speed of the ground it
 * is lying on — the eye reads a scattered edge moving at three speeds as depth,
 * and it read a smooth wave moving at one as a shape.
 */
function makeSandGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  /** Where the road begins and ends, in rows. The walk line is at 22. */
  const roadTop = 10;
  const roadBot = 40;

  // --- the crust behind the road ---
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);
  ctx.fillStyle = PALETTE.sandLight;
  ctx.fillRect(0, 0, LAYER_TILE_W, roadTop);
  // The far edge dithers into the ridge above it rather than butting against
  // it: one row of alternating pixels is worth more than any amount of blur,
  // and unlike a blur it survives being scrolled.
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (rng.chance(0.5)) continue;
    ctx.fillStyle = PALETTE.sandMid;
    ctx.fillRect(x, 0, 1, 1);
  }

  // --- the road ---
  ctx.fillStyle = PALETTE.sandMid;
  ctx.fillRect(0, roadTop, LAYER_TILE_W, roadBot - roadTop);
  // Lit along its far lip, in shadow along its near one: the road is a shallow
  // dish, and a dish has a bright side and a dark side.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, roadTop, LAYER_TILE_W, 1);
  ctx.fillStyle = PALETTE.sandDark;
  ctx.fillRect(0, roadBot - 2, LAYER_TILE_W, 2);

  /**
   * Two wheel ruts, and they are where they are for a reason: rows 14 and 32
   * sit inside one band each, one behind the traveller and one in front. A rut
   * is a groove, so each is a dark row with a lit one under it — and each
   * breaks rather than running true, because 320 unbroken pixels is a rule and
   * not a rut.
   */
  for (const y of [14, 32]) {
    const zoom = planeZoom(y, height);
    for (let x = 0; x < LAYER_TILE_W; x++) {
      if (rng.chance(0.3)) continue;
      ctx.fillStyle = PALETTE.sandDark;
      ctx.fillRect(x, y, 1, Math.max(1, Math.round(zoom)));
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(x, y + Math.max(1, Math.round(zoom)), 1, 1);
    }
  }

  // Hoof scuffs between the ruts, each one a comma of shadow with the sand it
  // threw lying beside it.
  for (let x = 2; x < LAYER_TILE_W; x += rng.int(7, 16)) {
    const y = bandFit(rng.int(roadTop + 3, roadBot - 5), 2, height);
    const zoom = planeZoom(y, height);
    const w = Math.max(2, Math.round(2 * zoom));
    ctx.fillStyle = PALETTE.sandDark;
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(x - 1, y, 1, 1);
  }

  // Grit in the road surface, growing towards the camera.
  planeGrain(ctx, rng, {
    height,
    from: roadTop + 1,
    to: roadBot - 2,
    count: 460,
    colors: [PALETTE.sandDark, PALETTE.sandLight, PALETTE.sandMid],
  });

  // --- the flat in front of the road, falling into shadow towards the camera --
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, roadBot, LAYER_TILE_W, height - roadBot);
  const near = Math.round(height * 0.62);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    ctx.globalAlpha = k * 0.55;
    ctx.fillStyle = PALETTE.sandDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  /**
   * Cracked hardpan in front of the road. The cracks are grown as short walks
   * that split rather than drawn as a grid — dried mud cracks into polygons
   * with three-way junctions, and a grid of squares reads as tiling, which is
   * exactly what this layer must not look like.
   *
   * They travel almost flat and they are clamped to the band they started in,
   * which is not the compromise it sounds like: a crack seen on a floor running
   * away from you IS mostly horizontal, and the near-vertical ones the old
   * version drew were the reason the flat used to read as a ploughed field.
   */
  for (let i = 0; i < 44; i++) {
    let x = rng.int(0, LAYER_TILE_W - 1);
    let y = rng.int(roadBot + 2, height - 2);
    const [top, bottom] = bandRange(y, height);
    const dir = rng.chance(0.5) ? 1 : -1;
    const len = rng.int(6, 26);
    for (let t = 0; t < len; t++) {
      x = wrapX(x + dir);
      if (rng.chance(0.3)) y += rng.chance(0.5) ? 1 : -1;
      if (y < top + 1 || y >= bottom) break;
      ctx.fillStyle = PALETTE.sandDark;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = PALETTE.sandLight;
      ctx.fillRect(x, y - 1, 1, 1);
    }
  }

  /**
   * Stones on the flat and along both lips of the road, each with a lit top
   * and a shadow under it. This is the pass that does the most for the depth of
   * the whole scene and it is the least interesting to read: two hundred small
   * things sitting ON the floor, at four sizes, moving at four speeds.
   */
  for (let i = 0; i < 150; i++) {
    planePebble(ctx, rng, {
      height,
      y: rng.chance(0.3) ? rng.int(1, roadTop - 1) : rng.int(roadBot, height - 2),
      colors: {
        body: rng.chance(0.5) ? PALETTE.sandDark : PALETTE.sandDeep,
        light: PALETTE.sandLight,
        shadow: PALETTE.sandDeep,
      },
    });
  }

  /**
   * Dry stems, in threes, sized by how near they are. There are fourteen of
   * them across the whole tile and they are drawn in dead moss rather than
   * anything greener: this is hardpan, and the first pass at this — three times
   * as many, in living green, scaled up by the perspective — left the flat
   * looking like a lawn somebody had spilled sand on.
   */
  for (let i = 0; i < 14; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.chance(0.35) ? rng.int(2, roadTop - 1) : rng.int(roadBot + 2, height - 4);
    const zoom = planeZoom(y, height);
    const len = Math.max(1, Math.round(rng.range(1, 2.2) * zoom));
    const base = bandFit(y, len, height);
    ctx.fillStyle = rng.chance(0.5) ? PALETTE.moss : PALETTE.sandDeep;
    for (let b = 0; b < 3; b++) ctx.fillRect(wrapX(x + b - 1), base, 1, len);
  }

  planeGrain(ctx, rng, {
    height,
    from: roadBot,
    to: height - 1,
    count: 320,
    colors: [PALETTE.sandMid, PALETTE.sandDark],
  });

  return canvas;
}

/**
 * The near bank at the bottom of the frame: a lip of blown sand a pace in
 * front of the traveller, running faster than the camera.
 *
 * It is the cheapest depth cue in the file and the one the desert most needed.
 * Everything else on screen is behind the man; this is the only thing in front
 * of him, and it is what turns a painted wall into a place he is standing in.
 */
function makeSandFringe({ seed, height }) {
  return makeRidgeLayer({
    seed,
    height,
    baseline: Math.round(height * 0.62),
    amplitude: 4,
    roughness: 1,
    crest: 2,
    colors: { body: PALETTE.sandDark, light: PALETTE.sandMid, dark: PALETTE.sandDeep },
    decorate: (ctx, heights, rng, h) => {
      // Stones and dry stems standing off the lip. They break the top edge,
      // which is the whole job: an unbroken edge reads as a bar across the
      // bottom of the screen no matter what colour it is.
      for (let x = 0; x < LAYER_TILE_W; x++) {
        const top = h - heights[x];
        if (rng.chance(0.1)) {
          ctx.fillStyle = PALETTE.sandDeep;
          ctx.fillRect(x, top - rng.int(1, 3), rng.int(1, 2), 3);
        }
        if (rng.chance(0.05)) {
          ctx.fillStyle = PALETTE.mossLight;
          ctx.fillRect(x, top - rng.int(2, 5), 1, 5);
        }
      }
      for (let i = 0; i < 220; i++) {
        const x = rng.int(0, LAYER_TILE_W - 1);
        const y = rng.int(h - heights[x] + 2, h - 1);
        ctx.fillStyle = rng.chance(0.5) ? PALETTE.sandDeep : PALETTE.sandMid;
        ctx.fillRect(x, y, rng.chance(0.3) ? 2 : 1, 1);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Ambient life
// ---------------------------------------------------------------------------

/**
 * What moves out here.
 *
 * The desert used to be the one biome with nothing in its air — the comment
 * said "nothing drifts through the desert but the weather", which is a fair
 * description of a desert and a poor description of a *scene*. Four
 * populations, each keyed to the hour so the place changes character at dusk
 * rather than only getting darker:
 *
 *   dust       fine grains lifted off the flat, out at every hour
 *   vultures   three of them, high and circling, daylight only. They are the
 *              only thing in the game that says something died here recently
 *   tumbleweed up to three at a time, at three depths, at any hour
 *   moths      pale, close to the ground, after dark
 *
 * THE TUMBLEWEEDS
 * ---------------------------------------------------------------------------
 * There used to be one weed, at one size, on one line, and it could roll either
 * way. All four of those are now wrong for the same reason: the road is a plane
 * with a depth to it, and anything crossing that plane has to say where on it
 * it is.
 *
 *   THEY HAVE A LANE. Each weed rolls along one row of the floor, and that row
 *   fixes everything else about it — how big it is drawn, how fast it crosses
 *   (`planeSpeed` of its own row, exactly like the roadside props), and whether
 *   it passes IN FRONT of the traveller or behind him. The far ones are drawn
 *   with the scene, in `renderBehind`; the near ones after he is, in
 *   `renderFront`. Watching one roll between you and the man walking is worth
 *   more than any amount of shading.
 *   THEY ALWAYS GO WEST. Rolling east was a coin flip that occasionally sent a
 *   weed the way the traveller is walking, and the wind on this road blows one
 *   way — every grain of sand, every gust sheet and every drop of rain in the
 *   game leans west. A weed going the other way is the one object on screen
 *   arguing with all of them.
 *   THEY OBEY THE WIND. `world.wind` is what the weather is driving things
 *   along the ground at, in source pixels a second (see `getGroundWind` in
 *   src/explore/weather.js). In fair weather it is zero and a weed ambles at
 *   its own pace; when a sandstorm arrives it climbs to the speed of the sand
 *   itself, and the weeds accelerate up to it over a second or two rather than
 *   snapping — so the storm visibly picks them up as it rolls in, and drops
 *   them again as it blows out.
 */
function createDesertAmbient(seed) {
  const rng = makeRng(seed >>> 0);
  const weed = getTumbleweedFrames();
  let clock = 0;

  const dust = Array.from({ length: 26 }, () => ({
    x: rng(),
    y: rng.range(0.5, 1),
    vx: rng.range(-0.09, -0.02),
    bob: rng.range(0.5, 2),
    phase: rng.range(0, Math.PI * 2),
    a: rng.range(0.15, 0.4),
  }));

  /**
   * The kettle: three birds sharing one thermal, a third of a turn apart.
   *
   * A vulture SOARS — that is the whole of what it does, and the old pair
   * dropped their wingtips by a pixel when they crossed the near side of the
   * orbit and did nothing else, forever. They now run the shared soar cycle
   * (see `BIRD_POSES` in env-kit): mostly held flat, with the occasional slow
   * adjustment, and a real flap only when the bird is climbing out of the far
   * side of the turn. Each one is on its own clock, so the three never beat
   * together.
   */
  const birds = Array.from({ length: 3 }, (_, i) => ({
    t: i * 0.34,
    rate: rng.range(19000, 26000),
    cx: rng.range(0.42, 0.72),
    cy: rng.range(0.13, 0.26),
    rx: rng.range(0.12, 0.2),
    ry: rng.range(0.03, 0.06),
    beat: rng.range(280, 460),
    phase: rng.range(0, Math.PI * 2),
  }));

  const moths = Array.from({ length: 12 }, () => ({
    x: rng(),
    y: rng.range(0.62, 0.95),
    vx: rng.range(-0.03, 0.03),
    vy: rng.range(-0.02, 0.02),
    rate: rng.range(90, 180),
    phase: rng.range(0, Math.PI * 2),
  }));

  /**
   * The weeds on the road, and the wait until the next one. Three lanes, in
   * source pixels from the walk line: one well behind the traveller, one on his
   * own line, one between him and the camera.
   */
  const LANES = [-14, 2, 15];
  const weeds = [];
  let weedWait = rng.range(1200, 6000);

  /** Position in the world, in source pixels, so the lanes can differ in speed. */
  const spawnWeed = () => {
    const lane = LANES[rng.int(0, LANES.length - 1)];
    return {
      lane,
      /** Screen position as a fraction of the frame, right to left. */
      x: 1.08 + rng.range(0, 0.3),
      /**
       * Its own pace on a still day, in fractions of the frame per second. The
       * lane's `planeSpeed` is applied on top, so the near ones genuinely
       * outrun the far ones instead of being drawn bigger.
       */
      pace: rng.range(0.075, 0.16),
      /** What it is doing now — eased towards the wind, never snapped to it. */
      speed: 0,
      spin: rng.range(0, 4),
      // Three sizes, in whole pixel steps: a weed scaled by a fraction is mush.
      size: lane < -6 ? -1 : lane > 8 ? 1 : rng.chance(0.4) ? 1 : 0,
      bounce: rng.range(2, 7),
      hop: 0,
    };
  };

  const wrap = (p) => {
    if (p.x < -0.05) p.x = 1.05;
    if (p.x > 1.05) p.x = -0.05;
    if (p.y < 0.55) p.y = 0.95;
    if (p.y > 1) p.y = 0.6;
  };

  /**
   * Draw the weeds in one lane group. Called twice a frame from two different
   * places in the render order, which is the whole point of them having lanes.
   */
  const drawWeeds = (ctx, view, sky, world, front) => {
    const s = view.scale;
    const gy = world?.groundY ?? view.h * 0.78;
    ctx.globalAlpha = 0.55 + sky.light * 0.45;
    for (const p of weeds) {
      if ((p.lane > 8) !== front) continue;
      const frame = weed[Math.floor(p.spin) % weed.length];
      const scale = Math.max(1, s + p.size);
      ctx.drawImage(
        frame,
        Math.round((p.x * view.w) / s) * s,
        Math.round((gy + (p.lane - p.hop) * s) / s) * s - frame.height * scale,
        frame.width * scale,
        frame.height * scale,
      );
    }
    ctx.globalAlpha = 1;
  };

  return {
    update(dt, world) {
      clock += dt;
      const step = dt / 1000;
      for (const d of dust) {
        d.x += d.vx * step;
        if (d.x < -0.05) {
          d.x = 1.05;
          d.y = rng.range(0.5, 1);
        }
      }
      for (const m of moths) {
        m.x += m.vx * step;
        m.y += m.vy * step;
        if (Math.random() < dt / 900) {
          m.vx = rng.range(-0.05, 0.05);
          m.vy = rng.range(-0.03, 0.03);
        }
        wrap(m);
      }
      for (const b of birds) b.t = (b.t + dt / b.rate) % 1;

      // --- the weeds ---
      /**
       * The wind, converted from source pixels a second into fractions of a
       * 320-pixel-wide view a second, which is what the weeds are measured in.
       * A sandstorm's sand runs at about six source pixels a frame, so this
       * comes out well over a whole frame width a second and the weeds fairly
       * fly — which is what a sandstorm does to them.
       */
      const wind = (world?.wind || 0) / LAYER_TILE_W;
      for (let i = weeds.length - 1; i >= 0; i--) {
        const p = weeds[i];
        // Its own pace, or the wind's, whichever is asking for more. Eased at a
        // fixed acceleration so the change happens over about a second: this is
        // what makes a storm look like it is picking the weed up rather than
        // teleporting it.
        const target = Math.max(p.pace, wind) * planeSpeed(PLANE_RISE + p.lane);
        p.speed += Math.sign(target - p.speed) * Math.min(Math.abs(target - p.speed), step * 1.6);
        p.x -= p.speed * step;
        // A rolling ball spins at the rate it travels: tie the two together and
        // a weed that speeds up in a gust visibly spins faster.
        p.spin += p.speed * dt * 0.09;
        // It does not roll level, either — it bounces off every stone it meets.
        p.hop = Math.abs(Math.sin(p.spin * 0.5)) * p.bounce;
        if (p.x < -0.15) weeds.splice(i, 1);
      }
      weedWait -= dt * (1 + wind * 2);
      if (weedWait <= 0 && weeds.length < 3) {
        // A storm tears more of them loose, and sooner.
        weedWait = rng.range(6000, 20000) / (1 + wind);
        weeds.push(spawnWeed());
      }
    },

    /**
     * The far weeds: drawn with the scene, before the traveller, so he passes
     * in front of them and the hour of the day falls on them with everything
     * else.
     */
    renderBehind(ctx, view, sky, world) {
      drawWeeds(ctx, view, sky, world, false);
    },

    /** And the near ones, after him. */
    renderFront(ctx, view, sky, world) {
      drawWeeds(ctx, view, sky, world, true);
    },

    /**
     * @param {object} sky the current `getSky()` snapshot — `light` fades the
     *   day's traffic out and `stars` brings the moths up.
     */
    render(ctx, view, sky) {
      const s = view.scale;
      const day = Math.max(0, Math.min(1, (sky.light - 0.4) / 0.4));
      const night = sky.stars;

      // --- vultures ---
      if (day > 0.05) {
        ctx.fillStyle = PALETTE.inkSoft;
        for (const b of birds) {
          const a = b.t * Math.PI * 2;
          const x = Math.round(((b.cx + Math.cos(a) * b.rx) * view.w) / s) * s;
          const y = Math.round(((b.cy + Math.sin(a) * b.ry) * view.h) / s) * s;
          ctx.globalAlpha = day * 0.7;
          /**
           * Soaring most of the way round, working the far half of the turn.
           * A bird climbing away from you flaps and a bird gliding towards you
           * does not, and the difference between those two is the only thing
           * that says the orbit has a near side and a far side at all.
           */
          const climbing = Math.sin(a) < -0.2;
          const pose = climbing ? BIRD_POSES.beat : BIRD_POSES.soar;
          const frame = climbing
            ? Math.floor(clock / b.beat + b.phase)
            : Math.floor(clock / (b.beat * 6) + b.phase);
          drawBird(ctx, x, y, s, pose, frame);
        }
        ctx.globalAlpha = 1;
      }

      // --- dust ---
      ctx.fillStyle = PALETTE.sandLight;
      for (const d of dust) {
        const y = d.y * view.h + Math.sin(clock / 900 + d.phase) * d.bob * s;
        ctx.globalAlpha = d.a * (0.3 + sky.light * 0.7);
        ctx.fillRect(Math.round((d.x * view.w) / s) * s, Math.round(y / s) * s, s, s);
      }
      ctx.globalAlpha = 1;

      // --- moths ---
      if (night > 0.05) {
        for (const m of moths) {
          const flutter = Math.sin(clock / m.rate + m.phase);
          const x = Math.round((m.x * view.w) / s) * s;
          const y = Math.round((m.y * view.h + flutter * s) / s) * s;
          ctx.globalAlpha = night * 0.5;
          ctx.fillStyle = PALETTE.boneDark;
          // Two pixels apart when the wings are open, one when they are shut.
          if (flutter > 0) {
            ctx.fillRect(x - s, y, s, s);
            ctx.fillRect(x + s, y, s, s);
          }
          ctx.globalAlpha = night * 0.75;
          ctx.fillStyle = PALETTE.bone;
          ctx.fillRect(x, y, s, s);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
}

// ---------------------------------------------------------------------------

export const DESERT_ART = {
  id: 'desert',

  props: DESERT_PROPS,

  buildLayers: () => ({
    clouds: makeCloudLayer({ seed: 7717, height: 48 }),
    /**
     * The mesa wall. Low baseline and almost no amplitude on purpose: the
     * sine here is not the horizon, it is the plain the buttes stand on, and
     * everything the eye reads as the skyline is drawn by `mesas`.
     */
    far: makeRidgeLayer({
      seed: 4242,
      height: 72,
      baseline: 12,
      amplitude: 4,
      roughness: 0.3,
      colors: { body: PALETTE.sandDeep, light: PALETTE.sandDark, dark: PALETTE.woodDeep },
      decorate: mesas,
    }),
    mid: makeRidgeLayer({
      seed: 1337,
      height: 64,
      baseline: 24,
      amplitude: 12,
      roughness: 0.7,
      colors: { body: PALETTE.sandDark, light: PALETTE.sandMid, dark: PALETTE.sandDeep },
      decorate: brokenRock,
    }),
    dunes: makeRidgeLayer({
      seed: 909,
      height: 44,
      baseline: 13,
      amplitude: 5,
      roughness: 0.9,
      colors: { body: PALETTE.sandMid, light: PALETTE.sand, dark: PALETTE.sandDark },
      decorate: duneRipples,
    }),
    ground: makeSandGround({ seed: 55, height: 72 }),
    fringe: makeSandFringe({ seed: 4114, height: 26 }),
  }),

  /**
   * The renderer walks this back to front; `y` is the layer's top edge measured
   * from the TOP OF THE FLOOR, which is a little behind the walk line. `near`
   * marks the rise the far band is planted behind, and `front` the one strip
   * that is drawn after everything else — the traveller included.
   *
   * The fringe runs at 1.9 rather than the 1.3 it used to. The floor's own near
   * edge now scrolls at about 1.7, and a foreground moving slower than the
   * ground behind it is a foreground the eye puts *further away* however low
   * down the frame it is drawn.
   */
  manifest: [
    { name: 'clouds', speed: 0.05, y: -104 },
    { name: 'far', speed: 0.15, y: -72 },
    { name: 'mid', speed: 0.4, y: -58 },
    { name: 'dunes', speed: 0.7, y: -34, near: true },
    { name: 'ground', speed: 1.0, y: 0 },
    { name: 'fringe', speed: 1.9, y: -15, anchor: 'bottom', front: true },
  ],

  /** Props that can be scattered along the road, with their placement weights. */
  scatter: [
    { name: 'sagebrush', weight: 16 },
    { name: 'cactusShort', weight: 14 },
    { name: 'cactusTall', weight: 12 },
    { name: 'rockSmall', weight: 12 },
    { name: 'pricklyPear', weight: 10 },
    { name: 'cactusRound', weight: 9 },
    { name: 'rockBig', weight: 9 },
    { name: 'ocotillo', weight: 8 },
    { name: 'yucca', weight: 8 },
    { name: 'mesaRock', weight: 7 },
    { name: 'deadTree', weight: 6 },
    { name: 'weedRest', weight: 6 },
    { name: 'skull', weight: 5 },
    { name: 'bones', weight: 5 },
    { name: 'wagonWheel', weight: 4 },
    { name: 'ruinWall', weight: 3 },
    // A signpost that has been mirrored is a signpost with its writing on the
    // back, and a wheel reads as a wheel either way round but never as two
    // different wheels.
    { name: 'sign', weight: 3, flip: false },
  ],

  /**
   * Tighter than it was. The desert is empty country, but "empty" was being
   * read off a road with one cactus a minute on it, and a stretch of road with
   * nothing in it is not lonely — it is unfinished.
   */
  scatterCell: 56,

  /**
   * The litter band. It runs on its own tight grid under the props, and it is
   * what lets the scatter cell stay wide: the road can keep a saguaro a
   * hundred pixels from the next one and still never be empty.
   */
  clutter: [
    { name: 'pebbles', weight: 12 },
    { name: 'twig', weight: 9 },
    { name: 'dryTuft', weight: 8 },
    { name: 'boneChip', weight: 4 },
  ],
  clutterCell: 23,

  /**
   * The far band: what stands on the plain behind the dune. Only tall, simple
   * silhouettes go in it — a skull or a wheel at this distance is four grey
   * pixels and reads as dirt on the screen.
   */
  backdrop: {
    cell: 84,
    y: -8,
    gap: 0.34,
    haze: PALETTE.sandLight,
    hazeA: 0.3,
    scatter: [
      { name: 'butteSmall', weight: 22 },
      { name: 'cactusTall', weight: 20 },
      { name: 'mesaRock', weight: 14 },
      { name: 'ruinWall', weight: 8 },
    ],
  },

  /** Fills below the ground strip on very tall windows. */
  groundFill: PALETTE.sandDeep,

  /** Colour of the dust the traveller kicks up. */
  dust: 'rgba(240, 214, 154, 0.5)',

  /** Buildings stand on their own sand apron — nothing to re-key. */
  structureGround: null,

  ambient: createDesertAmbient,
};
