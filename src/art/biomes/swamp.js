/**
 * SHOOT! — Swamp biome art (Blackwater Bayou).
 *
 * The fourth world: a causeway of mud raised through standing black water,
 * drowned cypress on both banks, and moss hanging off everything that has been
 * still long enough for it to catch.
 *
 * THE GROUND IS THE IDEA
 * ---------------------------------------------------------------------------
 * Every other biome in the game is a surface with things standing on it. This
 * one is a surface with a *hole* in it — the road is the only part of the frame
 * you could put a boot on, and the water in front of it and behind it is
 * telling the player, every second of the walk, that there is nowhere to go but
 * forward. That is the whole design of the place, and it lives in
 * `makeSwampGround` rather than in any of the props.
 *
 * BLACK WATER IS NOT A DARK BLUE
 * ---------------------------------------------------------------------------
 * Bog water has no colour of its own at all: it is a mirror with a green scum
 * on it, and everything you can see in it is either the sky lying on the
 * surface or something rotting under it. So the bog ramp runs from a sickly
 * green-grey highlight (`bogLight`, which is the scum, not a shine) down to
 * near-black, and the only bright pixels the water ever gets are horizontal —
 * reflections lie flat, and the fastest way to make water read as glass is to
 * put one vertical highlight in it.
 *
 * Shading rules are the ones every biome follows: no ink outline, light from
 * the top left, a darker tone of the same ramp down the right and lower edges,
 * and a contact shadow where a prop meets the mud. See `biomes/desert.js`.
 *
 * SCALE
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels. Cypress knees come to his shin, the
 * reeds to his shoulder, and the big cypress is the tallest prop in the game
 * so far — a bayou has a canopy, and a canopy is the one thing the first pass
 * at this was missing.
 */

import { PALETTE } from '../palette.js';
import { makeCanvas } from '../pixel.js';
import { makeRng } from '../../core/rng.js';
import { LAYER_TILE_W, makeCloudLayer, makeRidgeLayer } from '../env-kit.js';

export const SWAMP_PROPS = {
  /**
   * The big cypress: a buttressed trunk, a thin high canopy, and moss hanging
   * off the lower branches. The trunk flares at the base rather than meeting
   * the ground at a right angle — a cylinder planted in mud reads as a post,
   * and the flare is the single detail that says "this grew here".
   */
  cypress: [
    '......JJJJJlll.........',
    '....JJJJJJlllllll......',
    '..JJJJJJJlllllllllll...',
    '.JJJJJJlllllllJJJllll..',
    'JJJJJlllllllJJJJJJllll.',
    'JJJlllllllJJJJJJJJlllll',
    'JlllllllJJJJJlllJJJllll',
    'lllllJJJJJlllllllJJllll',
    '..lllJJJJlll+++llJJlll.',
    '....llJJll++++++lllll..',
    '......ll+++Wwx+++lll...',
    '.......VV..Wwx..VV.....',
    '.......VV..Wwx..VV.....',
    '.......VA..Wwx..AV.....',
    '.......AA..Wwx..AA.....',
    '........A..Wwx..A......',
    '...........Wwx.........',
    '...........Wwx.........',
    '..........WWwxx........',
    '..........WWwxx........',
    '.........WWWwwxx.......',
    '........WWWwwwwxx......',
    '.......WWwwwwwwwxx.....',
    '......WWwwwwwwwwwxx....',
    '.....WWwwwx+++wwwwxx...',
    '....WWwwwx+++++wwwwxx..',
    '...NNMMMMMMMMMMMMMMNN..',
    '..NNNMMMMMMMMMMMMMMNNN.',
    '...LLLLLLLLLLLLLLLLLL..',
  ],

  /**
   * Cypress knees: the roots that come up for air. They are always in a
   * cluster of different heights, never alone and never matched — a row of
   * equal ones reads as a fence, and a single one reads as a stick.
   */
  cypressKnees: [
    '....W........',
    '....Ww...W...',
    '...WWw...Ww..',
    '.W.WWwx.WWwx.',
    '.Ww.Wwx.WWwx.',
    'WWwxWwx.WWwx.',
    'WWwxWwxxWWwxx',
    'NMMMMMMMMMMMN',
    '.LLLLLLLLLLL.',
  ],

  /**
   * A dead snag standing in the water, stripped white by the sun and going
   * green at the waterline. Nothing rots faster than a tree the bayou has
   * taken, and nothing takes longer to fall over.
   */
  deadSnag: [
    '...+.......',
    '..++...+...',
    '..+...++...',
    '..++.++....',
    '...+++.....',
    '...+++.+...',
    '...+++++...',
    '...++++....',
    '...+++.....',
    '...+++.....',
    '..V+++V....',
    '..A+++A....',
    '...+++.....',
    '..++++V....',
    '..UU+++....',
    '.NMMMMMN...',
    '.LLLLLLL...',
  ],

  /**
   * Reeds. Two-pixel blades, exactly like the prairie's grass and for the same
   * reason: a one-pixel blade against dark water is a scratch on the screen.
   * The seed heads are what make them reeds rather than tall grass.
   */
  reedClump: [
    '..x..........',
    '..x....x.....',
    '..x....x..x..',
    '.Ux...Ux..x..',
    '.UU...UU.Ux..',
    'U.UU..UU.UU..',
    'U.UU.UUU.UU.U',
    'UU.UUUU.UUU.U',
    'UU.UUUU.UUUUU',
    'UUUUUUUUUUUUU',
    'NMMMMMMMMMMMN',
    '.LLLLLLLLLLL.',
  ],

  /** Cattails: the heads are the whole silhouette, so they get the dark tone. */
  cattails: [
    '..x....x.....',
    '..X....x..x..',
    '..x....X..X..',
    '..+....+..+..',
    '.U+...U+..+..',
    '.U....U..U+..',
    'UU....U..U...',
    'U.U..UU.UU...',
    'U.U..UU.UU.U.',
    'UUU.UUU.UU.U.',
    'UUUUUUUUUUUU.',
    'NMMMMMMMMMMMN',
    '.LLLLLLLLLLL.',
  ],

  /**
   * A log lying half in the water with three shelves of fungus on its back —
   * and, if you look at the near end, two eyes. The bayou's one joke, and the
   * only prop in the game the player is meant to look at twice.
   */
  gatorLog: [
    '.....VA.....VA.......',
    '....VVAA...VVAA......',
    'WWWwwwwwwwwwwwwwwwx..',
    'WXwwwwwwwwwwwwwwwwwx.',
    'WwwwwwwwwwwwwwwwwwwxU',
    'XwwwwwwwwwwwwwwwwwwxU',
    '.xxxxxxxxxxxxxxxxxx..',
    '..IIIIIIIIIIIIIIII...',
    '.LLLLLLLLLLLLLLLLLL..',
  ],

  /**
   * A stump with the water up to its shoulders, wearing a full cap of moss.
   * The rings are still visible on the cut face, so it reads as felled rather
   * than broken.
   */
  bogStump: [
    '..UUUUUU...',
    '.UAAAAAAU..',
    'UAAaaaaAAU.',
    '.WwWWWWWwW.',
    'WwWWxxxWWwW',
    'WwWWxWxWWwW',
    '.WwWWxWWwW.',
    '..Wwwwwww..',
    '.NMMMMMMMN.',
    '..LLLLLLL..',
  ],

  /**
   * Shelf fungus on a broken stub. Four brackets, each lit along its top edge
   * and dark underneath, so they read as shelves rather than as blobs.
   */
  fungusShelf: [
    '...WwX.....',
    '..VVwX.....',
    '.VAAwX.VV..',
    '..llwXVAA..',
    '...WwX.ll..',
    '.VVWwX.....',
    'VAAWwX.VV..',
    '.llWwXVAA..',
    '...WwX.ll..',
    '..NMMMMN...',
    '..LLLLLL...',
  ],

  /**
   * Spanish moss hanging off a low branch, and the one prop here with nothing
   * underneath it: it is drawn as an object in the air with a bare stub going
   * off frame, because moss that ends in a tidy point is seaweed.
   */
  mossVeil: [
    'WWwwwwwwwwwwx',
    'VAV.VAV..VAV.',
    'AAVAVAVA.VAA.',
    '.VA.VA.VA.VAV',
    '.AA.AA.AA.AAA',
    '.VA.VA..A.VA.',
    '.AA..A..A..A.',
    '.VA..A.....A.',
    '..A..A.....A.',
    '..A........A.',
    '..A..........',
  ],

  /**
   * A lily pad raft with one bloom on it. Pads are drawn as flat discs with a
   * notch cut out of them, which is the only way a circle reads as a leaf
   * lying on water rather than as a stone in it.
   */
  lilyPads: [
    '..UUUU....p......',
    '.UUAAUU..pOp.UU..',
    'UUAAAAUU..p.UAAU.',
    'UUAAAAUU....UAAU.',
    '.UUAAUU..UU..UU..',
    '..UUUU..UAAU.....',
    '........UAAU.....',
    '.........UU......',
    '.LLLLLL..LLLL....',
  ],

  /** Roots arching out of the mud and back into it, with water standing under them. */
  mangroveRoot: [
    '.....WwX.....',
    '....WwX......',
    'W..WwX....Wwx',
    'Ww.WwX...WwX.',
    '.WwWwX..WwX..',
    '.WWwwX.WwX...',
    '..WwwXWwX....',
    '..IIIIIII....',
    '.LLLLLLLLL...',
  ],

  /** What the water gave back: a skull with the bayou still growing on it. */
  skullBog: [
    '.b...VA..b.',
    '.bB.VAA.Bb.',
    'bbB..ll.Bbb',
    'bbbBBBBBbbb',
    '.BbbbbbbbB.',
    '.BbvbbbvbB.',
    '..bbbbbbb..',
    '..NMMMMMN..',
    '..LLLLLLL..',
  ],
};

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/**
 * The drowned forest on the far bank.
 *
 * A FOREST AT THIS DISTANCE IS ONE OBJECT, NOT FORTY
 * ---------------------------------------------------------------------------
 * Three passes at this drew individual trees — trunk, crown, moss — and every
 * one of them came out as a row of street lamps, then a row of palms, then a
 * row of mushrooms. The mistake was the premise. Two hundred yards away across
 * open water you do not see trees at all; you see a dark band with a ragged
 * top edge and a few taller things standing out of it, and the moment the eye
 * can count the trees the horizon has become a fence.
 *
 * So the band is drawn first, as overlapping masses with no trunks in them at
 * all, and only then do a dozen emergent cypress rise out of it with their own
 * crowns. Everything else — trunks, branches, individual leaves — is left out
 * on purpose. The moss is drawn last and drawn faint, because at this range it
 * is a softening of the underside rather than a thing you can see hanging.
 */
function drownedTreeLine(ctx, heights, rng, height) {
  const plot = (x, y, color, alpha = 1) => {
    if (y < 0 || y >= height) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W, y, 1, 1);
    ctx.globalAlpha = 1;
  };

  /** The tallest point of the canopy over each column, for the moss pass. */
  const canopy = new Array(LAYER_TILE_W).fill(Infinity);

  // --- 1. the band ---
  for (let i = 0; i < 150; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const w = rng.int(3, 10);
    const h = rng.int(4, 13);
    for (let dx = -w; dx <= w; dx++) {
      const x = ((cx + dx) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
      const base = height - heights[x];
      const k = Math.abs(dx) / (w + 1);
      // A rounded mass with a bite or two taken out of its top.
      const local = Math.round(h * Math.cos((k * Math.PI) / 2)) - rng.int(0, 1);
      for (let dy = 0; dy < local; dy++) {
        const y = base - dy - 1;
        plot(x, y, dy === local - 1 ? PALETTE.bogHaze : PALETTE.bogDark);
      }
      if (local > 0) canopy[x] = Math.min(canopy[x], base - local);
    }
  }

  // --- 2. the emergents ---
  for (let i = 0; i < 13; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const base = height - heights[cx];
    const h = rng.int(16, 30);
    const top = base - h;
    /**
     * Trunk: two pixels at the waterline, one at the top, and it stops four
     * rows INSIDE the crown rather than at the top of it. A trunk that reaches
     * the top of its own canopy is an aerial, and that single pixel of mast
     * sticking out was most of why three versions of this read as street
     * lighting.
     */
    for (let y = top + 4; y < base; y++) {
      plot(cx, y, PALETTE.bogDark);
      if (y > base - h * 0.4) plot(cx + 1, y, PALETTE.bogDeep);
    }
    /**
     * The crown is two or three small masses, off-centre from the trunk and
     * from each other, and it is drawn in the SAME dark as the trunk with no
     * lit edge on it at all.
     *
     * Both of those are load-bearing. A symmetrical cap centred on a vertical
     * stroke is a lamp whatever it is made of, and a light top edge on it is
     * the shade. Against an open sky a tree two hundred yards off is a
     * silhouette — there is nothing up there to light its top.
     */
    for (let m = 0; m < rng.int(2, 3); m++) {
      const mx = cx + rng.int(-3, 3);
      const my = top + rng.int(1, 5);
      const rx = rng.int(3, 6);
      const ry = rng.int(2, 4);
      for (let dy = -ry; dy <= ry; dy++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.4))));
        for (let dx = -half; dx <= half; dx++) {
          // Eroded at the rim: a solid ellipse is a blob, and a blob on a
          // stick is the lamp again. Roughly a third of the edge is missing.
          if (Math.abs(dx) >= half - 1 && rng.chance(0.4)) continue;
          const x = ((mx + dx) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
          plot(x, my + dy, PALETTE.bogDark);
          canopy[x] = Math.min(canopy[x], my + ry);
        }
      }
      // A handful of leaves thrown clear of the mass, which is what stops the
      // silhouette having any edge you could put a ruler along.
      for (let k = 0; k < 7; k++) {
        plot(mx + rng.int(-rx - 2, rx + 2), my + rng.int(-ry - 1, ry + 2), PALETTE.bogDark);
      }
    }
    // One limb, drooping, off one side of the trunk below the crown.
    const dir = rng.chance(0.5) ? -1 : 1;
    const limb = rng.int(3, 7);
    for (let t = 1; t <= limb; t++) {
      plot(cx + dir * t, top + rng.int(4, 7) + Math.floor(t / 2), PALETTE.bogDark);
    }
  }

  // --- 3. the moss ---
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (!Number.isFinite(canopy[x]) || rng.chance(0.72)) continue;
    const hang = rng.int(2, 7);
    for (let t = 0; t < hang; t++) {
      // Faint, and in the haze tone rather than the lichen one: a bright khaki
      // pixel at this distance reads as a light on a pole, which is the exact
      // failure this whole function is written around.
      plot(x, canopy[x] + t + 1, PALETTE.bogHaze, 0.34 - t * 0.04);
    }
  }
}

/**
 * The middle bank: scrub standing up off it in clumps rather than evenly, and
 * the odd bare trunk going up out of the clump. What separates this from the
 * reed fringe on the near bank is that it is *massed* — at this distance you
 * do not see plants, you see the outline of a thicket.
 */
function bankGrowth(ctx, heights, rng, height) {
  for (let i = 0; i < 34; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const w = rng.int(3, 11);
    const h = rng.int(3, 8);
    for (let dx = -w; dx <= w; dx++) {
      const x = ((cx + dx) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
      const top = height - heights[x];
      // A clump is tallest in the middle and ragged at both ends.
      const local = Math.round(h * Math.sin((1 - Math.abs(dx) / (w + 1)) * (Math.PI / 2)) - rng.int(0, 2));
      for (let dy = 0; dy < local; dy++) {
        ctx.fillStyle = dy === local - 1 ? PALETTE.bogLight : PALETTE.bogDark;
        ctx.fillRect(x, top - dy - 1, 1, 1);
      }
    }
    if (rng.chance(0.4)) {
      const top = height - heights[cx];
      ctx.fillStyle = PALETTE.bogDeep;
      ctx.fillRect(cx, top - h - rng.int(3, 9), 1, h + 6);
    }
  }
}

/**
 * The near bank: a fringe of reeds standing off its crest, and moss hanging
 * down over the water side of it.
 */
function reedFringe(ctx, heights, rng, height) {
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const top = height - heights[x];
    if (rng.chance(0.38)) {
      ctx.fillStyle = rng.chance(0.4) ? PALETTE.algae : PALETTE.grassDeep;
      ctx.fillRect(x, top - rng.int(2, 5), 1, 5);
    }
    if (rng.chance(0.08)) {
      ctx.fillStyle = PALETTE.lichen;
      ctx.fillRect(x, top + rng.int(0, 3), 1, rng.int(2, 6));
    }
  }
}

/**
 * The ground: a mud causeway with black water on both sides of it.
 *
 * Row zero is the walk line. The band of mud is narrow on purpose — narrower
 * than the prairie's trail and much narrower than the desert's open sand — so
 * that the water in the foreground is the biggest single area of the frame and
 * the road looks like something that had to be built.
 *
 * The reflections are the part that makes it water. They are horizontal
 * streaks of a lighter bog tone, they wobble, and they only ever appear in the
 * *far* channel — the near one is in the shadow of the causeway, and putting
 * sky in it would mean the light was coming from underneath the player.
 */
function makeSwampGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  // Everything starts as water; the causeway is laid on top of it.
  ctx.fillStyle = PALETTE.bog;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  // --- the far channel, above the road ---
  for (let x = 0; x < LAYER_TILE_W; x++) {
    ctx.fillStyle = PALETTE.bogDark;
    ctx.fillRect(x, 0, 1, 3);
  }
  for (let i = 0; i < 70; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(0, 5);
    ctx.fillStyle = rng.chance(0.5) ? PALETTE.bogLight : PALETTE.bogHaze;
    ctx.fillRect(x, y, rng.int(2, 7), 1);
  }

  // --- the causeway ---
  const top = new Array(LAYER_TILE_W);
  const bot = new Array(LAYER_TILE_W);
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const u = x / LAYER_TILE_W;
    top[x] = Math.max(0, Math.round(4 + Math.sin(u * Math.PI * 2 + 1.1) * 1.6 + Math.sin(u * Math.PI * 8) * 0.7));
    bot[x] = Math.round(22 + Math.sin(u * Math.PI * 2 + 3.4) * 2.4 + Math.sin(u * Math.PI * 6 + 0.9) * 1.2);

    ctx.fillStyle = PALETTE.soil;
    ctx.fillRect(x, top[x], 1, bot[x] - top[x]);
    // The far edge is wet and dark where the water laps it; the near edge is
    // the crumbling lip of the bank.
    ctx.fillStyle = PALETTE.soilDeep;
    ctx.fillRect(x, top[x], 1, 2);
    ctx.fillStyle = PALETTE.soilLight;
    ctx.fillRect(x, top[x] + 2, 1, 1);
    ctx.fillStyle = PALETTE.soilDark;
    ctx.fillRect(x, bot[x] - 3, 1, 3);
  }

  // Puddles standing in the ruts: the causeway never fully drains.
  for (let i = 0; i < 26; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const cy = rng.int(top[cx] + 4, Math.max(top[cx] + 5, bot[cx] - 5));
    const rx = rng.int(3, 11);
    ctx.fillStyle = PALETTE.bogDark;
    ctx.fillRect(cx - rx, cy, rx * 2, 2);
    ctx.fillStyle = PALETTE.bogLight;
    ctx.fillRect(cx - rx + 2, cy, rng.int(2, 5), 1);
  }

  // Grit, boot-churn and the odd tuft of weed pushing through the mud.
  for (let i = 0; i < 260; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(top[x] + 2, Math.max(top[x] + 3, bot[x] - 2));
    ctx.fillStyle = rng.chance(0.55) ? PALETTE.soilDark : PALETTE.soilLight;
    ctx.fillRect(x, y, rng.chance(0.2) ? 2 : 1, 1);
  }
  for (let i = 0; i < 34; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    ctx.fillStyle = rng.chance(0.5) ? PALETTE.algae : PALETTE.grassDeep;
    ctx.fillRect(x, bot[x] - rng.int(2, 5), 1, rng.int(2, 4));
  }

  // --- the near channel, in front of the road ---
  for (let x = 0; x < LAYER_TILE_W; x++) {
    ctx.fillStyle = PALETTE.bogDark;
    ctx.fillRect(x, bot[x], 1, height - bot[x]);
  }
  const near = Math.round(height * 0.62);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    // Half the weight the other biomes give this pass. Water in shadow is
    // still water, and the first version pushed the near channel so far down
    // that it stopped reading as a surface and started reading as a hole.
    ctx.globalAlpha = k * 0.45;
    ctx.fillStyle = PALETTE.bogDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  /**
   * What makes it water: the sky lying on it.
   *
   * Long horizontal streaks, broken into two or three runs each, in a tone
   * lighter than anything else down there. They are dense near the causeway —
   * where the water is catching the open sky between the trees — and thin out
   * towards the camera as the bank's own shadow falls across them. Nothing
   * here is vertical, because a vertical highlight on still water is the one
   * mark that turns a lake back into a floor.
   */
  for (let i = 0; i < 150; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const depth = rng() ** 1.8;              // biased towards the far side
    const y = Math.round(bot[x] + 2 + depth * (height - bot[x] - 4));
    if (y >= height) continue;
    const len = rng.int(3, 14);
    ctx.globalAlpha = (1 - depth) * rng.range(0.3, 0.75);
    ctx.fillStyle = rng.chance(0.28) ? PALETTE.lichen : PALETTE.bogHaze;
    for (let t = 0; t < len; t++) {
      // Broken, not solid: a reflection is a run of dashes.
      if (rng.chance(0.28)) continue;
      ctx.fillRect((x + t) % LAYER_TILE_W, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  /**
   * Scum and duckweed on the near water. It gathers in drifts rather than
   * spreading evenly, because it is pushed around by a current that has
   * nowhere to go — and it is the only thing down there with any light in it,
   * so it is doing all the work of telling the near channel apart from the
   * shadow under the causeway.
   */
  for (let i = 0; i < 22; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const cy = rng.int(near - 8, height - 3);
    const rx = rng.int(6, 22);
    const ry = rng.int(1, 3);
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.001))));
      for (let dx = -half; dx <= half; dx++) {
        if (rng.chance(0.35)) continue; // ragged, never a solid island
        const x = ((cx + dx) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
        ctx.fillStyle = rng.chance(0.3) ? PALETTE.algae : PALETTE.bogLight;
        ctx.fillRect(x, cy + y, 1, 1);
      }
    }
  }

  // The last thing: a few flat glints on the water either side of the road, so
  // the surface reads as wet rather than as dark ground.
  for (let i = 0; i < 40; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.chance(0.4) ? rng.int(0, 4) : rng.int(bot[x] + 1, height - 2);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = PALETTE.bogHaze;
    ctx.fillRect(x, y, rng.int(2, 6), 1);
  }
  ctx.globalAlpha = 1;

  return canvas;
}

// ---------------------------------------------------------------------------
// Ambient
// ---------------------------------------------------------------------------

/**
 * What is in the air over the water.
 *
 *   midges   knots of them, out in daylight, moving as a swarm rather than as
 *            individuals — each one orbits the knot instead of flying its own
 *            course, which is what a cloud of insects actually looks like and
 *            what thirty independent motes never do
 *   wisps    marsh lights. Night only, low over the water, huge and slow next
 *            to the prairie's fireflies and pale green rather than gold
 *   bubbles  marsh gas coming up out of the mud, at any hour
 *
 * The wisps are deliberately few — three — because a bayou with a dozen
 * lights bobbing over it is a fairground, and one that has three is haunted.
 */
function createSwampAmbient(seed) {
  const rng = makeRng(seed >>> 0);
  let clock = 0;

  const swarms = Array.from({ length: 4 }, () => ({
    x: rng(),
    y: rng.range(0.45, 0.85),
    vx: rng.range(-0.02, -0.004),
    drift: rng.range(0.01, 0.03),
    phase: rng.range(0, Math.PI * 2),
    flies: Array.from({ length: 7 }, () => ({
      r: rng.range(0.004, 0.02),
      rate: rng.range(400, 1100),
      phase: rng.range(0, Math.PI * 2),
      squash: rng.range(0.4, 1),
    })),
  }));

  const wisps = Array.from({ length: 3 }, () => ({
    x: rng(),
    y: rng.range(0.72, 0.94),
    vx: rng.range(-0.012, 0.012),
    bob: rng.range(0.006, 0.018),
    rate: rng.range(2600, 5200),
    phase: rng.range(0, Math.PI * 2),
  }));

  const bubbles = Array.from({ length: 14 }, () => ({
    x: rng(),
    y: rng.range(0.78, 1),
    vy: rng.range(-0.05, -0.02),
    a: rng.range(0.2, 0.5),
  }));

  return {
    update(dt) {
      clock += dt;
      const step = dt / 1000;
      for (const s of swarms) {
        s.x += s.vx * step;
        s.y += Math.sin(clock / 2400 + s.phase) * s.drift * step;
        if (s.x < -0.08) {
          s.x = 1.08;
          s.y = rng.range(0.45, 0.85);
        }
      }
      for (const w of wisps) {
        w.x += w.vx * step;
        w.y += Math.sin(clock / w.rate * 2 + w.phase) * w.bob * step;
        if (w.x < -0.06) w.x = 1.06;
        if (w.x > 1.06) w.x = -0.06;
      }
      for (const b of bubbles) {
        b.y += b.vy * step;
        if (b.y < 0.7) {
          b.y = rng.range(0.95, 1.02);
          b.x = rng();
        }
      }
    },

    render(ctx, view, sky) {
      const s = view.scale;
      const day = Math.max(0, Math.min(1, (sky.light - 0.35) / 0.4));
      const night = sky.stars;

      // --- bubbles ---
      ctx.fillStyle = PALETTE.bogLight;
      for (const b of bubbles) {
        ctx.globalAlpha = b.a * (0.4 + sky.light * 0.6);
        ctx.fillRect(
          Math.round((b.x * view.w) / s) * s,
          Math.round((b.y * view.h) / s) * s,
          s,
          s,
        );
      }
      ctx.globalAlpha = 1;

      // --- midges ---
      if (day > 0.02) {
        ctx.fillStyle = PALETTE.bogDeep;
        for (const sw of swarms) {
          const cx = sw.x * view.w;
          const cy = sw.y * view.h;
          for (const f of sw.flies) {
            const a = clock / f.rate + f.phase;
            const x = cx + Math.cos(a) * f.r * view.w;
            const y = cy + Math.sin(a * 1.7) * f.r * view.h * f.squash;
            ctx.globalAlpha = 0.55 * day;
            ctx.fillRect(Math.round(x / s) * s, Math.round(y / s) * s, s, s);
          }
        }
        ctx.globalAlpha = 1;
      }

      // --- will-o'-the-wisps ---
      if (night > 0.05) {
        for (const w of wisps) {
          const pulse = 0.55 + 0.45 * Math.sin(clock / 1700 + w.phase);
          const a = night * pulse;
          const x = Math.round((w.x * view.w) / s) * s;
          const y = Math.round((w.y * view.h) / s) * s;
          // Three rings, each bigger and fainter: at this size a glow is a
          // stack of squares and nothing else will do.
          ctx.globalAlpha = a * 0.12;
          ctx.fillStyle = PALETTE.poison;
          ctx.fillRect(x - s * 3, y - s * 3, s * 7, s * 7);
          ctx.globalAlpha = a * 0.3;
          ctx.fillRect(x - s * 2, y - s * 2, s * 5, s * 5);
          ctx.globalAlpha = a * 0.7;
          ctx.fillStyle = PALETTE.poison;
          ctx.fillRect(x - s, y - s, s * 3, s * 3);
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = PALETTE.bloomCream;
          ctx.fillRect(x, y, s, s);
          // Its reflection, directly below and dimmer. Nothing else in the
          // game reflects, and this is the one place the ground can.
          ctx.globalAlpha = a * 0.22;
          ctx.fillStyle = PALETTE.poison;
          ctx.fillRect(x - s, y + s * 4, s * 3, s);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
}

// ---------------------------------------------------------------------------

export const SWAMP_ART = {
  id: 'swamp',

  props: SWAMP_PROPS,

  /**
   * The stack goes murk, forest, bank, water. There is no bright layer in it
   * anywhere — this is the darkest biome in the game by a wide margin, and the
   * separation between the layers comes from how *green* each one is rather
   * than from how light it is. The far haze is the greenest thing on screen;
   * everything closer loses colour until the near bank is nearly black.
   *
   * That inversion is deliberate. The desert and the prairie put their darkest
   * value at the front to silhouette the props against it, and it works
   * because both grounds are bright. Here the ground is already dark, so the
   * props are read against the *water* instead — which is why the causeway is
   * narrow and why every prop in the scatter table is a light shape.
   */
  buildLayers: () => ({
    clouds: makeCloudLayer({
      seed: 8802,
      height: 58,
      count: 8,
      size: [5, 11],
      sag: 2,
      tones: [PALETTE.bogHaze, PALETTE.bogDark, PALETTE.bogDeep],
    }),
    far: makeRidgeLayer({
      seed: 3720,
      height: 74,
      baseline: 20,
      // Almost flat. There is no relief in a bayou — the horizon is a line of
      // trees standing in water, and a rolling one reads as farmland, which is
      // what the first pass at this looked like.
      amplitude: 4,
      roughness: 0.4,
      // The crest was `lichen`, and a khaki line along the top of the far bank
      // read as a beach. Water has no lit crest; it has a slightly paler edge.
      colors: { body: PALETTE.bogHaze, light: PALETTE.bogLight, dark: PALETTE.bogDark },
      decorate: drownedTreeLine,
    }),
    // A bank of vegetation, not a hill. The amplitude is the lowest of any
    // middle layer in the game: rolling mounds behind a swamp read as pasture,
    // and the moment this looked like pasture the whole biome looked like the
    // prairie after dark.
    mid: makeRidgeLayer({
      seed: 5164,
      height: 64,
      baseline: 17,
      amplitude: 4,
      roughness: 0.7,
      colors: { body: PALETTE.bog, light: PALETTE.bogLight, dark: PALETTE.bogDark },
      decorate: bankGrowth,
    }),
    bank: makeRidgeLayer({
      seed: 9091,
      height: 34,
      baseline: 15,
      amplitude: 6,
      roughness: 0.9,
      colors: { body: PALETTE.bogDark, light: PALETTE.bog, dark: PALETTE.bogDeep },
      crest: 2,
      decorate: reedFringe,
    }),
    ground: makeSwampGround({ seed: 3344, height: 72 }),
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -108 },
    { name: 'far', speed: 0.15, y: -74 },
    { name: 'mid', speed: 0.4, y: -56 },
    { name: 'bank', speed: 0.7, y: -34 },
    { name: 'ground', speed: 1.0, y: 0 },
  ],

  /**
   * The busiest scatter table in the game. A bayou is not empty country — the
   * whole feeling of it is that something is growing out of every square foot
   * of water, and the road is the only gap in it.
   */
  scatter: [
    { name: 'reedClump', weight: 17 },
    { name: 'cypressKnees', weight: 14 },
    { name: 'cattails', weight: 12 },
    { name: 'lilyPads', weight: 10 },
    { name: 'deadSnag', weight: 9 },
    { name: 'bogStump', weight: 8 },
    { name: 'mangroveRoot', weight: 7 },
    { name: 'cypress', weight: 7 },
    { name: 'fungusShelf', weight: 6 },
    { name: 'gatorLog', weight: 5 },
    { name: 'mossVeil', weight: 4 },
    { name: 'skullBog', weight: 3 },
  ],

  scatterCell: 48,

  groundFill: PALETTE.bogDeep,

  /** Wet mud does not throw dust. What comes off a boot here is a splash. */
  dust: 'rgba(85, 112, 95, 0.5)',

  /** Buildings here are on piles driven into the mud, so the apron is mud. */
  structureGround: { r: PALETTE.soilDeep, s: PALETTE.soilDark },

  ambient: createSwampAmbient,
};
