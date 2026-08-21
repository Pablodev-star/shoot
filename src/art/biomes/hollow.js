/**
 * SHOOT! — Hollow biome art (Gallows Hollow).
 *
 * The sixth world: a dry grey valley of turned earth and grave timber, under a
 * sky that is usually too dark to see the far end of the road.
 *
 * IT IS THE ONLY BIOME BUILT AROUND SOMETHING THAT DOES NOT MOVE
 * ---------------------------------------------------------------------------
 * Every other landscape in this game is drawn to be looked at. This one is
 * drawn to be LEARNED — and the thing it is teaching is a single sentence:
 * *the skulls on the stakes do not move.*
 *
 * `stakedBody` is the commonest prop on this road by a distance, and it is
 * placed on both the near verge and the far band, so the player passes dozens
 * of them on a crossing. Every one of them faces right, away from the traveller
 * walking up behind it. Every one of them is completely inert. And then,
 * exactly once in a run, one of them is not — see `src/explore/scare.js`, which
 * borrows this file's prop rather than drawing one of its own, because the
 * whole effect depends on it being the SAME object the player has been walking
 * past all world.
 *
 * That is why the prop table is weighted the way it is, and why nothing else
 * out here is skull-shaped. Two competing bone silhouettes would give the
 * player two things to half-remember instead of one thing they are sure of.
 *
 * A COLOUR SCHEME THAT IS MOSTLY ABSENCE
 * ---------------------------------------------------------------------------
 * The ramp (`pall` → `gloamDeep`, see src/art/palette.js) is grey with the
 * last of a green in it, and the world's only saturated colour is corpse-light
 * — in the lanterns, in a socket here and there, and in the gallows when the
 * special is up. There is NO RED anywhere in this file. That is a rule rather
 * than a preference: the scare is two red pixels, and they only work if they
 * are the first red the player has seen since the Basin.
 *
 * Shading is the same as everywhere else: 1px ink outline on made things, light
 * from the top left, a darker step of the same ramp down the right and lower
 * edges, and a contact shadow where anything meets the ground.
 *
 * SCALE
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels. A skull on its stake comes to his
 * chest, a grave board to his hip, a fence post to his shoulder, and the dead
 * trees on the ridge behind are the only thing out here taller than he is.
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

/**
 * THE THING ON THE STAKE, AS THREE POSES OF ONE BODY
 * ---------------------------------------------------------------------------
 * A whole skeleton — skull, ribs, arms, pelvis, legs — run through from the
 * crown to below the heels by a single stake, which is the only thing holding
 * it up. Not crucified: there is no crossbar and there are no nails. It is the
 * shape a body makes when somebody drove a post through it and pushed the post
 * into the ground.
 *
 * It hangs in three poses, and they are the whole of the scare:
 *
 *   `slack`  what it always is. The head has dropped between the shoulders,
 *            there is no neck showing, and the arms hang straight down at the
 *            sides. Everything about it is what gravity did to it.
 *   `risen`  what it is for a fraction of a second. The head is up — the neck
 *            appears, which is the tell — the arms are raised, and both eye
 *            sockets are lit.
 *   `mid`    one frame between the two, arms out sideways, used only on the way
 *            BACK down. The way up has no in-between at all.
 *
 * THE LOWER BODY IS IDENTICAL IN ALL THREE
 * ---------------------------------------------------------------------------
 * From the ribs down, every row is the same string in every pose. That is not
 * economy, it is the point: the thing is impaled and cannot move, so what the
 * player sees change is exactly a head and two arms on a body that stays nailed
 * where it is. A pose that shifted the pelvis would read as the whole prop
 * being swapped for a different one.
 *
 * It faces the camera rather than up the road, because the scare needs BOTH
 * sockets — one lit eye is a wink and two is something looking at you.
 */
export const SKELETON = {
  w: 15,
  h: 30,
  /**
   * Where the two sockets are, in the prop's own source pixels, per pose. Read
   * by src/explore/scare.js to put the red in the right holes; measured off the
   * art below rather than guessed, so if the skull is ever redrawn this is the
   * one line that has to be redrawn with it.
   */
  eyes: {
    slack: { y: 6, x: [4, 9] },
    mid: { y: 6, x: [4, 9] },
    risen: { y: 4, x: [4, 9] },
  },
  eye: { w: 2, h: 2 },
};

export const HOLLOW_PROPS = {
  /**
   * THE PROP THIS WHOLE WORLD IS BUILT AROUND — the slack pose, which is the
   * only one the road ever shows.
   *
   * A skeleton hanging off a stake that goes through the crown of its skull and
   * out below its heels: head dropped between the shoulders with no neck
   * showing, arms hanging straight down, feet clear of the ground. It has been
   * there a long time and it is not doing anything.
   *
   * There are dozens of them on a crossing, and that is deliberate — read the
   * note at the top of the file for what is done with the fact that not one of
   * them has ever moved.
   */
  stakedBody: [
    '......k{}k.....',
    '......k{}k.....',
    '....kkkkkkk....',
    '...k*******k...',
    '..k*(((((((*k..',
    '..k*(((((((*k..',
    '..k*]]*(*]]*k..',
    '..k*]]*(*]]*k..',
    '...k*(((((*k...',
    '....kkkkkkk....',
    '...............',
    '..kk*******kk..',
    'k*k.k*****k.k*k',
    'k*k.k*]*]*k.k*k',
    'k*k.k]]*]]k.k*k',
    'k*k.k*]*]*k.k*k',
    'k*k.k]]*]]k.k*k',
    'k*k..kkkkk..k*k',
    'k(k....k....k(k',
    'kkk...k*k...kkk',
    '.....kkkkk.....',
    '....k*****k....',
    '....kk*k*kk....',
    '.....k*k*k.....',
    '.....k*k*k.....',
    '.....k(k(k.....',
    '.....kkkkk.....',
    '......k{}k.....',
    '......k{}k.....',
    '......k[]k.....',
  ],

  /**
   * The same body with its head up and its arms raised. Never on the road — the
   * scare is the only thing that ever asks for it (src/explore/scare.js).
   *
   * Two things changed and nothing else did. The skull moved up one row and a
   * NECK appeared under it, which is the whole of "the head came up": at this
   * size a tilt would be two pixels nobody sees, and a neck that was not there
   * a frame ago is unmistakable. And the arms left the sides and went up, which
   * is the half you catch out of the corner of your eye.
   */
  stakedBodyRisen: [
    '......k{}k.....',
    '....kkkkkkk....',
    '...k*******k...',
    '..k*(((((((*k..',
    '..k*]]*(*]]*k..',
    '..k*]]*(*]]*k..',
    '...k*(((((*k...',
    '...k*k*k*k*k...',
    '....kkkkkkk....',
    'k*k...k*k...k*k',
    'k*k..k{}k...k*k',
    'k*kk*******kk*k',
    '....k*****k....',
    '....k*]*]*k....',
    '....k]]*]]k....',
    '....k*]*]*k....',
    '....k]]*]]k....',
    '.....kkkkk.....',
    '.......k.......',
    '......k*k......',
    '.....kkkkk.....',
    '....k*****k....',
    '....kk*k*kk....',
    '.....k*k*k.....',
    '.....k*k*k.....',
    '.....k(k(k.....',
    '.....kkkkk.....',
    '......k{}k.....',
    '......k{}k.....',
    '......k[]k.....',
  ],

  /**
   * One frame between the two, and it is only ever played on the way DOWN.
   *
   * The head is already back between the shoulders and the arms are caught
   * halfway, straight out at the sides. Going up there is no in-between at all
   * — that is the rule the whole effect is built on — but coming down there has
   * to be one, or the thing does not fall, it teleports.
   */
  stakedBodyMid: [
    '......k{}k.....',
    '......k{}k.....',
    '....kkkkkkk....',
    '...k*******k...',
    '..k*(((((((*k..',
    '..k*(((((((*k..',
    '..k*]]*(*]]*k..',
    '..k*]]*(*]]*k..',
    '...k*(((((*k...',
    '....kkkkkkk....',
    '...............',
    '..kk*******kk..',
    'k***k*****k***k',
    'kkkkk*]*]*kkkkk',
    '....k]]*]]k....',
    '....k*]*]*k....',
    '....k]]*]]k....',
    '.....kkkkk.....',
    '.......k.......',
    '......k*k......',
    '.....kkkkk.....',
    '....k*****k....',
    '....kk*k*kk....',
    '.....k*k*k.....',
    '.....k*k*k.....',
    '.....k(k(k.....',
    '.....kkkkk.....',
    '......k{}k.....',
    '......k{}k.....',
    '......k[]k.....',
  ],



  /**
   * A grave board: a plank driven in at whatever angle the ground allowed,
   * with a crosspiece nailed on and nothing written on it. Nothing is written
   * on any of them — a legible name would make the Hollow a place with a
   * history, and what it needs to be is a place with a backlog.
   */
  graveBoard: [
    '...kkk...',
    '..k}{}k..',
    '..k{{{k..',
    'kkk{{{kkk',
    'k}}}}}}}k',
    'k{{{{{{{k',
    'kkk{{{kkk',
    '..k{{{k..',
    '..k{[{k..',
    '..k{{{k..',
    '..k[{{k..',
    '..k[[{k..',
    '.k)]])k..',
  ],


  /** Its neighbour, leaning, with the crosspiece long since off it. */
  graveStub: [
    '..kkkk..',
    '.k}{{}k.',
    '.k{{{{k.',
    '.k{{{{k.',
    '.k{[{{k.',
    '..k{{{k.',
    '..k{{{k.',
    '..k[{{k.',
    '..k[[{k.',
    '.k)]])k.',
  ],

  /**
   * A fence post with two strands of wire still on it, going nowhere. The wire
   * runs off both edges of the sprite on purpose: it is the one prop out here
   * that implies a neighbour, so a line of them across the verge reads as a
   * boundary somebody once cared about.
   */
  fencePost: [
    '..kkk...',
    '.k}{{k..',
    '.k{{{k..',
    '.k{{{k..',
    '*k{{{k**',
    '.k{[{k..',
    '.k{{{k..',
    '*k{{{k**',
    '.k{{{k..',
    '.k[{{k..',
    '.k[[{k..',
    'k)]])k..',
  ],

  /**
   * A grave that has been opened rather than dug: the mound is beside the hole
   * instead of on it, and the spade is still standing in the heap. Whoever was
   * working here has not come back.
   */
  openGrave: [
    '..........k......',
    '..........k......',
    '.........k)k.....',
    '.........k)k.....',
    '.........k)k.....',
    '..(((....k)k.....',
    '.((((*...k)k.....',
    '((((((*.k}}}k....',
    '(()))((*k{{{k....',
    '))))))))k{{{k....',
    'kkkkkkkkkkkkkkkkk',
    'k]]]]]]]]]]]]]]]k',
    'k]]]]]]]]]]]]]]]k',
    '.kkkkkkkkkkkkkkk.',
  ],

  /** The mound that came out of it, settled and gone grey. */
  graveMound: [
    '....((((....',
    '..((*****(..',
    '.(((*****((.',
    '((())))))(((',
    '())))))))))(',
    'k)]]]]]]]])k',
    '.kkkkkkkkkk.',
  ],

  /**
   * A dead thorn. No leaves, no green, nothing soft on it anywhere — the
   * prairie's scrub and the bayou's reeds are both drawn as things that are
   * still growing, and the whole point of this one is that it stopped.
   */
  deadThorn: [
    '..k...k...k..',
    '.k[k.k[k.k[k.',
    '..k[k[[k[k...',
    '...k[[[[k....',
    'k.k[[[[[[k.k.',
    '.k[[[k[[[[k..',
    '..k[[[[[k....',
    '...k[[[k.....',
    '....k[k......',
    '...k[[[k.....',
    '..k)]]])k....',
  ],

  /**
   * A ribcage, half in the ground. Big — this came off something the size of a
   * horse — and lying down, so it never competes with the skulls on the stakes
   * for the same silhouette.
   */
  ribcage: [
    '.....kkkk......',
    '..kkk****kk....',
    '.k**kkkkkk**k..',
    'k*k*k**k*k*k*k.',
    'k*k*k**k*k*k*k.',
    'k*k(k(*k(k*k(k.',
    'k*k(k(*k(k*k(k.',
    '.k(kk((kk(k(k..',
    '..k))))))))k...',
    '...kk)]])kk....',
    '.....kkkk......',
  ],

  /**
   * An iron lantern on a hook, with something in it that is not a flame.
   *
   * The only lit prop on the road, and the reason to have one at all is the
   * same reason the basin has three: a world painted in one narrow band of
   * value has nothing for the eye to travel to. It is drawn RARE (see the
   * scatter table) so that a lit one is an event rather than street lighting.
   */
  graveLantern: [
    '...kkk...',
    '..k{{{k..',
    '...k{k...',
    '..kkkkk..',
    '.k)))))k.',
    'k)|,,,|)k',
    'k)|,",|)k',
    'k)|,,,|)k',
    'k)|,,,|)k',
    '.k)))))k.',
    '..kkkkk..',
    '...k)k...',
    '..k)))k..',
    '.k)]]]k..',
  ],

  /**
   * A coffin lid, propped where somebody set it down. Nothing else out here is
   * a plain rectangle, so at a distance it is the one prop you can identify by
   * shape alone.
   */
  coffinLid: [
    '...kkkk..',
    '..k}}}}k.',
    '.k}{{{{}k',
    'k}{{{{{{}',
    'k{{{{{{{}',
    'k{{[[[{{}',
    'k{{[[[{{}',
    'k{{{{{{{}',
    'k{{{{{{{}',
    'k[{{{{{{}',
    'k[[{{{{[}',
    'k)]]]]])k',
    '.kkkkkkk.',
  ],

  /** A stump, cut and then forgotten about for thirty years. */
  stump: [
    '..kkkkk..',
    '.k}}}}}k.',
    'k}{[{{{}k',
    'k{{[[{{{}',
    'k{{{{{{{}',
    'k[{{{{{[}',
    'k[[{{{[[}',
    '.k)]]])k.',
    '..kkkkk..',
  ],

  /**
   * A bare tree. It is the tallest thing on the road and it is planted in the
   * BACKDROP band as well as the near one, so the ridge behind the traveller
   * has a skyline made of these rather than a clean edge.
   */
  deadTree: [
    '...k....k......',
    '..k[k..k[k.....',
    '...k[kk[k......',
    'k...k[[[k...k..',
    '.k[k.k[[k.k[k..',
    '..k[[k[[k[[k...',
    '...k[[[[[[k....',
    '....k[{{[k.....',
    '.....k{{k......',
    '.....k{{k......',
    '....k}{{k......',
    '....k{{{k......',
    '....k{[{k......',
    '....k{{{k......',
    '...k{{{[{k.....',
    '..k{{[[[{{k....',
    '.k)]]]]]]])k...',
    '..kkkkkkkkk....',
  ],

  /** What is left of a wagon wheel, leaning on nothing. */
  wheelWreck: [
    '..kkkkk..',
    '.k}{k{}k.',
    'k}k{k{k}k',
    'k{kk{kk{k',
    'kk{{k{{kk',
    'k{k{{{k{k',
    'k}k{k{k}k',
    '.k}{k{}k.',
    '..k)])k..',
  ],
};

/** The litter this ground has instead of leaves. */
const HOLLOW_CLUTTER = {
  boneChip: [
    '.k*k.',
    'k*(*k',
    '.k)k.',
  ],
  gritStone: [
    '.kk.',
    'k)]k',
    '.kk.',
  ],
  deadLeaf: [
    '..k..',
    '.k)k.',
    'k)]]k',
    '.k)k.',
  ],
  splinter: [
    'k{}k.',
    '.k{}k',
  ],
};

Object.assign(HOLLOW_PROPS, HOLLOW_CLUTTER);

const wrapX = (x) => ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/**
 * The far ridge: a line of dead trees on the skyline, and nothing else.
 *
 * They are drawn as bare verticals with two or three forks, never as a canopy.
 * A treeline with any mass in it reads as a wood, and a wood is somewhere you
 * could shelter — the Hollow must not offer that anywhere in its art.
 */
function deadTreeline(ctx, heights, rng, height) {
  for (let i = 0; i < 26; i++) {
    const x0 = rng.int(0, LAYER_TILE_W - 1);
    const foot = height - heights[x0];
    const h = rng.int(6, 17);
    for (let t = 0; t < h; t++) {
      ctx.fillStyle = t > h * 0.6 ? PALETTE.gloamDark : PALETTE.gloamDeep;
      ctx.fillRect(x0, foot - t, 1, 1);
    }
    // Two limbs, both up and out, both short. A limb that droops reads as a
    // living branch with weight on it.
    const limbs = rng.int(1, 3);
    for (let l = 0; l < limbs; l++) {
      const from = foot - Math.round(h * rng.range(0.55, 0.95));
      const dir = rng.chance(0.5) ? 1 : -1;
      let y = from;
      for (let t = 1; t <= rng.int(2, 5); t++) {
        y -= rng.chance(0.6) ? 1 : 0;
        ctx.fillStyle = PALETTE.gloamDeep;
        ctx.fillRect(wrapX(x0 + dir * t), y, 1, 1);
      }
    }
  }
}

/**
 * The middle rise: rows of grave mounds, seen end on.
 *
 * Two hundred small humps in a line is the one image that says what this valley
 * is used for, and it says it without a single skull in the layer — the props
 * on the road can carry that. From here they are three pixels each.
 */
function moundField(ctx, heights, rng, height) {
  for (let i = 0; i < 90; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const top = height - heights[x] + rng.int(0, 5);
    const w = rng.int(3, 7);
    if (top + 2 >= height) continue;
    for (let dx = 0; dx < w; dx++) {
      const k = Math.abs(dx - (w - 1) / 2) / ((w - 1) / 2 || 1);
      const lift = Math.round((1 - k) * 2);
      ctx.fillStyle = dx < w / 2 ? PALETTE.gloam : PALETTE.gloamDark;
      ctx.fillRect(wrapX(x + dx), top - lift, 1, lift + 2);
    }
    // A board at the head of about one in four of them.
    if (rng.chance(0.26)) {
      ctx.fillStyle = PALETTE.gravewood;
      ctx.fillRect(wrapX(x - 1), top - rng.int(3, 5), 1, 4);
    }
  }
}

/**
 * The near bank: a rim of turned earth with roots and the odd board coming out
 * of it. The one layer in the biome with any warmth in it at all, which is what
 * separates it from the mound field behind.
 */
function vergeRoots(ctx, heights, rng, height) {
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const top = height - heights[x];
    if (rng.chance(0.07)) {
      ctx.fillStyle = PALETTE.gravewood;
      ctx.fillRect(x, top - rng.int(1, 3), rng.int(1, 2), 4);
    }
    if (rng.chance(0.05)) {
      ctx.fillStyle = PALETTE.gloamDeep;
      ctx.fillRect(x, top + rng.int(2, 6), rng.int(2, 5), 1);
    }
  }
}

/**
 * The fringe at the bottom of the frame: the near lip of the cut the road runs
 * through, with roots hanging out of it and bone showing where the bank has
 * come away.
 */
function makeHollowFringe({ seed, height }) {
  return makeRidgeLayer({
    seed,
    height,
    baseline: Math.round(height * 0.6),
    amplitude: 4,
    roughness: 1,
    crest: 2,
    colors: { body: PALETTE.gloamDeep, light: PALETTE.gloamDark, dark: PALETTE.gloamDeep },
    decorate: (ctx, heights, rng, h) => {
      for (let x = 0; x < LAYER_TILE_W; x++) {
        const top = h - heights[x];
        // Tufts of dead grass standing off the lip.
        if (rng.chance(0.16)) {
          ctx.fillStyle = PALETTE.gloam;
          ctx.fillRect(x, top - rng.int(1, 4), 1, 4);
        }
        // And, rarely, the end of something the bank has stopped holding.
        if (rng.chance(0.012)) {
          ctx.fillStyle = PALETTE.pallMid;
          ctx.fillRect(x, top + rng.int(1, 4), rng.int(2, 4), 1);
        }
      }
      speckle(ctx, rng, {
        from: h - Math.round(height * 0.4),
        to: h - 1,
        count: 150,
        colors: [PALETTE.gloamDark, PALETTE.gloamDeep, PALETTE.gloam],
      });
    },
  });
}

/**
 * The floor: packed earth that has been dug over and filled in more times than
 * the ground can take, with a cart track worn down the middle of it.
 *
 * The one thing this ground does that no other floor in the game does is
 * SUBSIDE. Old graves settle, so the earth over them dips — and a dip drawn
 * from above is a shallow ellipse of darker ground with a lighter rim on its
 * upper edge. Two dozen of those, fitted to their depth bands, is what stops
 * the floor from reading as a road across a field.
 */
function makeHollowGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  ctx.fillStyle = PALETTE.gloam;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  // The track, straight and dithered at both lips for exactly the reason the
  // basin's is (see `makeInfernoGround`): a wandering edge crossing four depth
  // bands is torn into four.
  const roadTop = 10;
  const roadBot = 40;
  ctx.fillStyle = PALETTE.pallMid;
  ctx.fillRect(0, roadTop, LAYER_TILE_W, roadBot - roadTop);
  for (const edge of [roadTop, roadBot - 1]) {
    for (let x = 0; x < LAYER_TILE_W; x++) {
      if (rng.chance(0.5)) continue;
      ctx.fillStyle = PALETTE.gloam;
      ctx.fillRect(x, edge, 1, 1);
    }
  }
  // Two wheel ruts down the track. They are the only long horizontals allowed
  // on this floor and they are broken every few pixels, so they read as ruts
  // rather than as lines.
  for (const ry of [roadTop + 9, roadTop + 20]) {
    for (let x = 0; x < LAYER_TILE_W; x++) {
      if (rng.chance(0.32)) continue;
      ctx.fillStyle = PALETTE.gloam;
      ctx.fillRect(x, ry, 1, 1);
      if (rng.chance(0.3)) {
        ctx.fillStyle = PALETTE.gloamDark;
        ctx.fillRect(x, ry + 1, 1, 1);
      }
    }
  }

  // --- the subsidence ------------------------------------------------------
  for (let i = 0; i < 26; i++) {
    const cy = rng.int(2, height - 4);
    const zoom = planeZoom(cy, height);
    const rx = Math.round(rng.int(7, 22) * zoom);
    const ry = Math.max(1, Math.round(rng.int(1, 3) * zoom));
    const base = bandFit(cy, ry * 2 + 2, height);
    const cx = rng.int(0, LAYER_TILE_W);
    for (let y = 0; y <= ry * 2; y++) {
      const k = (y - ry) / (ry + 0.001);
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - k * k)));
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = PALETTE.gloamDark;
      ctx.fillRect(cx - half, base + y, half * 2 + 1, 1);
      // The rim, on the far edge only: light from the top left, and a dip is
      // lit on the side the light can still reach into.
      if (y === 0) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = PALETTE.pall;
        ctx.fillRect(cx - half, base - 1, half * 2 + 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;

  /**
   * --- the diggings ---
   *
   * Spade marks: short, straight, parallel scores in the earth, in groups.
   * They are the opposite of the basin's crack network on purpose — a crack is
   * something the ground did and a spade mark is something a person did, and
   * this world's whole argument is that somebody has been out here working.
   */
  for (let g = 0; g < 20; g++) {
    const gx = rng.int(0, LAYER_TILE_W - 1);
    const gy = rng.int(2, height - 3);
    const [bandTop, bandBottom] = bandRange(gy, height);
    const zoom = planeZoom(gy, height);
    const len = Math.max(2, Math.round(rng.int(3, 8) * zoom));
    for (let i = 0; i < rng.int(2, 5); i++) {
      const y = Math.max(bandTop, Math.min(bandBottom - 1, gy + i));
      ctx.fillStyle = PALETTE.gloamDark;
      ctx.fillRect(wrapX(gx + rng.int(-2, 2)), y, len, 1);
      if (rng.chance(0.4)) {
        ctx.fillStyle = PALETTE.pall;
        ctx.fillRect(wrapX(gx + rng.int(-2, 2)), y - 1, Math.max(1, len - 2), 1);
      }
    }
  }

  planeGrain(ctx, rng, {
    height,
    from: 2,
    to: height - 1,
    count: 420,
    colors: [PALETTE.gloamDark, PALETTE.pallMid],
  });

  // Stones and chips lying on the verge and along both lips of the track.
  for (let i = 0; i < 80; i++) {
    planePebble(ctx, rng, {
      height,
      y: rng.chance(0.35) ? rng.int(1, roadTop - 1) : rng.int(roadBot, height - 3),
      colors: {
        body: rng.chance(0.1) ? PALETTE.pall : PALETTE.gloamDark,
        light: PALETTE.pallMid,
        shadow: PALETTE.gloamDeep,
      },
    });
  }

  // The ground going into shadow towards the camera, as everywhere — but
  // deeper here than anywhere except the basin, because there is nothing in
  // this sky throwing much light onto anything.
  const near = Math.round(height * 0.55);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    ctx.globalAlpha = k * 0.55;
    ctx.fillStyle = PALETTE.gloamDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  return canvas;
}

// ---------------------------------------------------------------------------
// Ambient
// ---------------------------------------------------------------------------

/**
 * The air of the Hollow, which is the emptiest in the game and is meant to be.
 *
 * Two populations, both slow:
 *
 *   dust   grave dust turning over in the still air. It does not fall and it
 *          does not rise — it hangs, drifts a few pixels and comes back, which
 *          is the one motion nothing else in this game does
 *   wisps  three or four points of corpse-light down near the ground, a long
 *          way off, that fade all the way out and come back somewhere else
 *
 * The wisps are the reason this exists at all. The Hollow's whole design is a
 * road where nothing moves; a road where NOTHING moves is a still image, and
 * the eye stops looking at it after a minute. Four lights that appear, hold and
 * go keep the player checking the middle distance — which is exactly where the
 * thing they should not be checking is standing.
 */
function createHollowAmbient(seed) {
  const rng = makeRng(seed >>> 0);
  let clock = 0;

  const dust = Array.from({ length: 34 }, () => ({
    x: rng(),
    y: rng.range(0.35, 1),
    rate: rng.range(2600, 7000),
    amp: rng.range(0.002, 0.01),
    drift: rng.range(-0.004, -0.001),
    phase: rng.range(0, Math.PI * 2),
    a: rng.range(0.1, 0.3),
    big: rng.chance(0.18),
  }));

  const spawnWisp = () => ({
    x: rng(),
    // Down near the walk line and behind it: a wisp at eye level would read as
    // a firefly, and there is nothing alive out here.
    y: rng.range(0.62, 0.78),
    t: 0,
    life: rng.range(2600, 6400),
    hold: rng.range(0.3, 0.6),
    drift: rng.range(-0.012, 0.012),
  });
  const wisps = Array.from({ length: 4 }, () => {
    const w = spawnWisp();
    w.t = rng() * w.life;
    return w;
  });

  return {
    update(dt) {
      clock += dt;
      const step = dt / 1000;
      for (const d of dust) {
        d.x += (d.drift + Math.sin(clock / d.rate + d.phase) * d.amp) * step;
        if (d.x < -0.05) d.x = 1.05;
      }
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i];
        w.t += dt;
        w.x += w.drift * step;
        if (w.t >= w.life) wisps[i] = spawnWisp();
      }
    },

    render(ctx, view, sky) {
      const s = view.scale;

      ctx.fillStyle = PALETTE.pall;
      for (const d of dust) {
        // Dust is lit BY the day, so it is nearly gone at night — the opposite
        // of the wisps below, which is what keeps the two apart.
        ctx.globalAlpha = d.a * (0.35 + sky.light * 0.65);
        const x = Math.round((d.x * view.w) / s) * s;
        const y = Math.round((d.y * view.h) / s) * s;
        ctx.fillRect(x, y, s, s);
        if (d.big) {
          ctx.globalAlpha *= 0.4;
          ctx.fillRect(x - s, y, s, s);
        }
      }
      ctx.globalAlpha = 1;

      for (const w of wisps) {
        const k = w.t / w.life;
        // In, hold, out. A wisp that pops on is a bug; one that fades is a
        // light somebody is carrying a long way off.
        const env = k < 0.25 ? k / 0.25 : k > 0.75 ? (1 - k) / 0.25 : 1;
        const a = env * w.hold * (0.45 + sky.stars * 0.55);
        if (a < 0.03) continue;
        const x = Math.round((w.x * view.w) / s) * s;
        const y = Math.round((w.y * view.h) / s) * s;
        ctx.globalAlpha = a * 0.25;
        ctx.fillStyle = PALETTE.corpseDeep;
        ctx.fillRect(x - s, y - s, s * 3, s * 3);
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = PALETTE.corpse;
        ctx.fillRect(x, y, s, s);
        ctx.globalAlpha = a;
        ctx.fillStyle = PALETTE.corpseLight;
        ctx.fillRect(x, y, s, Math.max(1, Math.round(s / 2)));
      }
      ctx.globalAlpha = 1;
    },
  };
}

// ---------------------------------------------------------------------------

export const HOLLOW_ART = {
  id: 'hollow',

  props: HOLLOW_PROPS,

  /**
   * Four layers of grey, and what keeps them apart is what is standing ON each
   * one rather than the colour of it: bare trees on the skyline, the mound
   * field in the middle distance, roots and boards on the near bank. The value
   * range across the whole stack is the narrowest in the game — this world is
   * about six greys — so the silhouettes are doing all of the work.
   */
  buildLayers: () => ({
    /**
     * NOT A CLOUD DECK — A LID
     * -----------------------------------------------------------------------
     * Every other biome's cloud layer is weather passing over a sky. This one
     * is the sky: eleven overlapping puffs at nearly twice the radius any other
     * biome uses, so the tile is close to solid and what shows through it is
     * gaps rather than the other way round.
     *
     * That is doing a job the world tint cannot. A `multiply` wash can darken a
     * blue sky but it cannot make it stop being blue — the blue channel starts
     * too high — so at any alpha the road can afford, a clear day in the Hollow
     * came out as a slightly murky summer afternoon. Covering the sky with the
     * GROUND'S OWN TONES fixes it at the source: the lid is grey-green, it is
     * lit by the same sun as everything else, and the strips of sky between the
     * puffs read as the last of the daylight rather than as the weather.
     *
     * It is also why the tones run pale at the top and dark at the belly, which
     * is upside down for a cloud. Cloud is lit from above; a ceiling is lit
     * from the room.
     */
    clouds: makeCloudLayer({
      seed: 7373,
      /**
       * Deeper than any other biome's and hung lower (see the manifest), so
       * the lid comes right down onto the far ridge. What is left of the sky is
       * a band along the horizon, which is exactly the shape a heavy overcast
       * leaves and the one place daylight ever gets into this valley.
       */
      height: 74,
      count: 13,
      size: [12, 22],
      sag: 2,
      tones: [PALETTE.pallMid, PALETTE.gloam, PALETTE.gloamDark],
    }),
    far: makeRidgeLayer({
      seed: 3131,
      height: 84,
      baseline: 24,
      amplitude: 8,
      roughness: 0.35,
      colors: { body: PALETTE.gloamDark, light: PALETTE.gloam, dark: PALETTE.gloamDeep },
      decorate: deadTreeline,
    }),
    mid: makeRidgeLayer({
      seed: 9292,
      height: 66,
      baseline: 24,
      amplitude: 11,
      roughness: 0.5,
      colors: { body: PALETTE.gloam, light: PALETTE.pallMid, dark: PALETTE.gloamDark },
      decorate: moundField,
    }),
    verge: makeRidgeLayer({
      seed: 2424,
      height: 40,
      baseline: 17,
      amplitude: 7,
      roughness: 0.8,
      colors: { body: PALETTE.gloamDark, light: PALETTE.gloam, dark: PALETTE.gloamDeep },
      crest: 2,
      decorate: vergeRoots,
    }),
    ground: makeHollowGround({ seed: 8181, height: 72 }),
    fringe: makeHollowFringe({ seed: 4242, height: 26 }),
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -98 },
    { name: 'far', speed: 0.15, y: -84 },
    { name: 'mid', speed: 0.4, y: -58 },
    { name: 'verge', speed: 0.7, y: -40, near: true },
    { name: 'ground', speed: 1.0, y: 0 },
    { name: 'fringe', speed: 1.9, y: -15, anchor: 'bottom', front: true },
  ],

  /**
   * THE TABLE THE SCARE IS BUILT ON
   * -------------------------------------------------------------------------
   * `stakedBody` is weighted at nearly a third of the roll, which is more than
   * any single prop gets in any other biome and is deliberately overdone. The
   * player has to pass enough of them that "skull on a stake" stops being a
   * thing they look at and becomes a thing they look PAST — that is the whole
   * mechanism, and it does not work at a tasteful one in ten.
   *
   * Everything else here is chosen not to compete with it: boards, posts, wood
   * and earth, none of them skull-shaped and none of them lit.
   */
  scatter: [
    { name: 'stakedBody', weight: 26 },
    { name: 'graveBoard', weight: 14 },
    { name: 'graveStub', weight: 12 },
    { name: 'fencePost', weight: 11 },
    { name: 'graveMound', weight: 10 },
    { name: 'deadThorn', weight: 9 },
    { name: 'stump', weight: 7 },
    { name: 'coffinLid', weight: 5 },
    { name: 'openGrave', weight: 4 },
    { name: 'ribcage', weight: 4 },
    { name: 'wheelWreck', weight: 3 },
    { name: 'deadTree', weight: 3 },
    /** One lit thing, and it is the rarest roll on the road. */
    { name: 'graveLantern', weight: 2 },
  ],

  clutter: [
    { name: 'gritStone', weight: 12 },
    { name: 'boneChip', weight: 9 },
    { name: 'splinter', weight: 7 },
    { name: 'deadLeaf', weight: 5 },
  ],
  clutterCell: 20,

  /**
   * The far band: stakes and trees standing on the bank behind the road, so
   * the lesson is being taught at two depths at once. The haze is the world's
   * own pale grey — there is no colour out here for distance to take away, so
   * what distance does instead is flatten things towards the sky.
   */
  backdrop: {
    cell: 74,
    y: -8,
    gap: 0.28,
    haze: PALETTE.pallMid,
    hazeA: 0.34,
    scatter: [
      { name: 'stakedBody', weight: 20 },
      { name: 'deadTree', weight: 16 },
      { name: 'fencePost', weight: 12 },
      { name: 'graveBoard', weight: 9 },
    ],
  },

  scatterCell: 58,

  groundFill: PALETTE.gloamDark,

  /** Dry grave earth, and it hangs rather than puffing. */
  dust: 'rgba(167, 172, 156, 0.3)',

  /** Buildings out here are propped on old sleepers and packed earth. */
  structureGround: { r: PALETTE.gloamDeep, s: PALETTE.gravewood },

  ambient: createHollowAmbient,
};
