/**
 * SHOOT! — The things an ability actually throws.
 *
 * Every themed trick in src/game/world-abilities.js used to be a coloured
 * square leaving one fighter and arriving at the other. Six motions, eighteen
 * abilities, and the only difference between a stick of dynamite and a lungful
 * of marsh gas was the hex code on the particles.
 *
 * A DUEL IS A PLACE WHERE OBJECTS ARRIVE
 * ---------------------------------------------------------------------------
 * So the abilities throw OBJECTS now, and this file is what they throw: a stick
 * with a fuse on it, a gourd of poison, a rope, a nest, a rock out of the sky,
 * a mirror assembling itself out of nothing. The scene flies them across the
 * road (src/duel/duel-cast.js), and the particles that used to be the whole
 * effect are the dust the object kicks up when it gets there.
 *
 * TWO WAYS OF DRAWING, AND THE SPLIT IS THE SAME ONE AS EVERYWHERE ELSE
 * ---------------------------------------------------------------------------
 * Small hard things — a stick, a bullet, a flask, a loop of rope — are typed
 * out pixel by pixel, exactly like the item icons, because somebody has to
 * decide where the fuse is. Big soft things — a fireball, a slab of ice around
 * a man, a column of magma — are BUILT, for the same reason the landmarks in
 * src/art/sprites-hazards.js are: an explosion is twenty by twenty and drawn
 * five times over as it grows, and a hand-typed one is two thousand characters
 * nobody can check. What is hand-decided there is the shape — the radius per
 * frame, where the ramp turns from white to gold to soot — and that is the part
 * worth reading.
 *
 * ANCHORS
 * ---------------------------------------------------------------------------
 * Every prop carries the pixel INSIDE it that the scene is aiming: the middle
 * of a fireball, the base of a column, the fuse-end of a stick. Nothing outside
 * this file has to know how big any of these are, which is what lets an ice
 * shell fit a man and the same call fit something two and a half times his
 * size.
 */

import { PALETTE } from './palette.js';
import { bake, makeCanvas } from './pixel.js';
import { makeRng } from '../core/rng.js';

/**
 * One letter, one colour — the same discipline as src/art/sprites-items.js,
 * and deliberately the same letters wherever the two files overlap.
 */
const KEY = {
  '.': null,
  k: PALETTE.ink,
  K: PALETTE.inkSoft,
  W: PALETTE.white,
  w: PALETTE.bone,
  d: PALETTE.boneDark,
  // fire and brass
  r: PALETTE.red,
  R: PALETTE.redLight,
  q: PALETTE.redDark,
  o: PALETTE.gold,
  O: PALETTE.goldLight,
  y: PALETTE.goldDark,
  m: PALETTE.magma,
  M: PALETTE.magmaDeep,
  e: PALETTE.emberGlow,
  x: PALETTE.char,
  X: PALETTE.charDark,
  // metal, wood, leather
  s: PALETTE.steel,
  S: PALETTE.steelDark,
  t: PALETTE.wood,
  T: PALETTE.woodDark,
  h: PALETTE.leather,
  H: PALETTE.leatherDark,
  // the flats
  z: PALETTE.sand,
  Z: PALETTE.sandDark,
  E: PALETTE.sandLight,
  // the bayou
  p: PALETTE.poison,
  P: PALETTE.poisonDark,
  a: PALETTE.algae,
  A: PALETTE.lichen,
  b: PALETTE.bog,
  B: PALETTE.bogLight,
  Q: PALETTE.bogDark,
  // the pass
  i: PALETTE.iceLight,
  I: PALETTE.ice,
  J: PALETTE.iceDark,
  n: PALETTE.snowLight,
  N: PALETTE.snowShade,
  // The hollow. Letters ran out four biomes ago, so these are the same
  // punctuation the biome art uses in src/art/env-kit.js — one character, one
  // colour, across every file that draws this world.
  '*': PALETTE.pall,
  '(': PALETTE.pallMid,
  ')': PALETTE.gloam,
  '[': PALETTE.gloamDark,
  ']': PALETTE.gloamDeep,
  '{': PALETTE.gravewood,
  '}': PALETTE.gravewoodLight,
  '|': PALETTE.corpseLight,
  ',': PALETTE.corpse,
  '"': PALETTE.corpseDeep,
  // the void
  u: PALETTE.purple,
  U: PALETTE.purpleDark,
  c: PALETTE.astralLight,
  C: PALETTE.astral,
  v: PALETTE.cosmic,
  V: PALETTE.cosmicHigh,
};

// ---------------------------------------------------------------------------
// The hard things, typed
// ---------------------------------------------------------------------------

/**
 * DYNAMITE, TUMBLING.
 *
 * Three frames of one stick end over end: upright with the fuse up, flat with
 * the fuse trailing, upright with the fuse down. Nobody throws a stick of
 * dynamite and has it arrive the same way up it left, and a prop that does not
 * turn in the air reads as a sprite being slid across the screen.
 *
 * The spark on the fuse is NOT in here — the scene burns it as a particle, so
 * it goes on sputtering while the stick is lying at somebody's boots waiting
 * for the round to resolve.
 */
const DYNAMITE = [
  [
    '....O....',
    '....y....',
    '...kkk...',
    '...krk...',
    '...kRk...',
    '...krk...',
    '...kRk...',
    '...kkk...',
    '.........',
  ],
  [
    '.........',
    '.O.......',
    '..y......',
    '.kkkkkkk.',
    '.krRrRrk.',
    '.kkkkkkk.',
    '.........',
    '.........',
    '.........',
  ],
  [
    '.........',
    '...kkk...',
    '...kRk...',
    '...krk...',
    '...kRk...',
    '...krk...',
    '...kkk...',
    '....y....',
    '....O....',
  ],
];

/** A single brass round, for everything that steals one or hands one back. */
const ROUND = [
  ['.s.', 'ksk', 'kok', 'kOk', 'kok', 'kkk'],
];

/**
 * A gust off the flats: a curl of grit, whipping. Three frames of the same
 * hook travelling through itself, which is the cheapest thing that reads as
 * wind and the only one that reads as wind at nine pixels wide.
 */
const GUST = [
  [
    '....zEEz.',
    '..zEEz...',
    '.zEz.....',
    'zEz......',
    '.zEz.....',
    '..zEEz...',
    '....zEEz.',
  ],
  [
    '...zEEz..',
    '.zEEz....',
    'zEz......',
    '.Ez......',
    'zEz......',
    '.zEEz....',
    '...zEEz..',
  ],
  [
    '..zEEz...',
    'zEEz.....',
    'Ez.......',
    'z........',
    'Ez.......',
    'zEEz.....',
    '..zEEz...',
  ],
];

/**
 * A lasso closing. Wide open as it leaves the hand, narrower as it drops over
 * the arm, cinched at the end — so the rope is doing the jamming rather than
 * being a circle that happens to be nearby.
 */
const LASSO = [
  [
    '..dwwwd..',
    '.d.....d.',
    'w.......w',
    'w.......w',
    'w.......w',
    '.d.....d.',
    '..dwwwd..',
  ],
  [
    '.........',
    '...dwd...',
    '..d...d..',
    '.w.....w.',
    '..d...d..',
    '...dwd...',
    '.........',
  ],
  [
    '.........',
    '.........',
    '...dwd...',
    '..d.k.d..',
    '...dwd...',
    '.........',
    '.........',
  ],
];

/** The hornets' nest, whole and then split open. */
const NEST = [
  [
    '...ddd...',
    '..dwwwd..',
    '.dwoOowd.',
    'dwoOOOowd',
    'dwoOOOowd',
    '.dwoOowd.',
    '..dwwwd..',
    '...ddd...',
  ],
  [
    '...d.d...',
    '..dw.wd..',
    '.dwo.owd.',
    'dwoO.Oowd',
    'dwo...owd',
    '.dw...wd.',
    '..d...d..',
    '...d.d...',
  ],
];

/** The bayou's gourd of poison, tumbling. It is thrown to be broken. */
const GOURD = [
  [
    '..kkk..',
    '..kPk..',
    '..kpk..',
    '.kkpkk.',
    'kpPPPpk',
    'kPpppPk',
    'kPpppPk',
    'kPPPPPk',
    '.kkkkk.',
  ],
  [
    '.......',
    'k......',
    '.kkk...',
    'kppkkk.',
    'kPppppk',
    'kPppppk',
    '.kPPPk.',
    '..kkk..',
    '.......',
  ],
];

/** A wisp over the water. Cold light, and nothing holding it up. */
const WISP = [
  [
    '...a...',
    '..aAa..',
    '.aAWAa.',
    'aAWWWAa',
    '.aAWAa.',
    '..aAa..',
    '...a...',
  ],
  [
    '.......',
    '...a...',
    '..aWa..',
    '.aWWWa.',
    '..aWa..',
    '...a...',
    '.......',
  ],
];

/** A life, coming off one of them and going onto the other. */
const LIFE = [
  ['..R..', '.RrR.', 'RrqrR', '.RrR.', '..R..'],
];

/** A shard of the pass, falling point first. */
const SHARD = [
  ['..i..', '.iIi.', 'iIJIi', '.iIi.', '..I..', '..I..', '..i..'],
];

/**
 * The gravity well: a hole with a lit rim. The rim breaks in a different place
 * on each frame, which is the only way a circle this small looks like it is
 * turning rather than pulsing.
 */
const WELL = [
  [
    '...ccc...',
    '..cCVCc..',
    '.cCVVVCc.',
    'cCVVVVVCc',
    'cCVVVVVCc',
    'cCVVVVVCc',
    '.cCVVVCc.',
    '..cCVCc..',
    '...ccc...',
  ],
  [
    '...c.c...',
    '..cCVC...',
    '.cCVVVCc.',
    '.CVVVVVCc',
    'cCVVVVVC.',
    'cCVVVVVCc',
    '.cCVVVC..',
    '...CVCc..',
    '...c.c...',
  ],
  [
    '....c....',
    '..cCVCc..',
    '..CVVVC..',
    'cCVVVVVC.',
    '.CVVVVVCc',
    '.CVVVVVC.',
    '..CVVVCc.',
    '..cCVC...',
    '....c....',
  ],
];

/**
 * The void mirror, assembling. Shards drifting, shards gathering, and a plane
 * with a rival's reflection already in it — which is the whole promise of the
 * ability in one frame.
 */
const MIRROR = [
  [
    '..c......c.',
    '.....c.....',
    '.c.......c.',
    '....c.c....',
    '.c.......c.',
    '.....c.....',
    '..c......c.',
  ],
  [
    '...ccccc...',
    '..c.....c..',
    '.c...C...c.',
    '.c..CCC..c.',
    '.c...C...c.',
    '..c.....c..',
    '...ccccc...',
  ],
  [
    '...ccccc...',
    '..cCCCCCc..',
    '.cCWCCCCCc.',
    '.cCCWCCCCc.',
    '.cCCCWCCCc.',
    '..cCCCCCc..',
    '...ccccc...',
  ],
];

/** A rock out of nothing at all, with its own fire wrapped around it. */
const METEOR = [
  [
    '...eee...',
    '..emmMe..',
    '.emMXXMe.',
    'emMXxXXMe',
    '.eMXxxXM.',
    '..eMXXMe.',
    '...eMMe..',
    '....ee...',
  ],
  [
    '...ee....',
    '..eMmMe..',
    '.emXxXMe.',
    'eMXxxxXMe',
    '.eMXxXXM.',
    '..eMXMe..',
    '...emMe..',
    '....ee...',
  ],
];

/**
 * The thing that does the whispering. A head with horns and two coals in it,
 * and no body under it at all — it is not standing anywhere, it is leaning in.
 */
const SHADE = [
  [
    '.X.......X.',
    '.XX.....XX.',
    '..XXkkkXX..',
    '...XxxxX...',
    '..XxmXmxX..',
    '..XxxxxxX..',
    '...XxkxX...',
    '....XxX....',
    '.....X.....',
  ],
  [
    'XX.......XX',
    '.XX.....XX.',
    '..XXkkkXX..',
    '...XxxxX...',
    '..XxeXexX..',
    '..XxxxxxX..',
    '...XkkkX...',
    '....XxX....',
    '.....X.....',
  ],
];

/** Something under the water, coming up for somebody. Fingers, then the hand. */
const GRASP = [
  [
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '..b.b.b..',
    '.bBbBbBb.',
    '.bBBBBBb.',
    '..bbbbb..',
  ],
  [
    '.........',
    '.........',
    '.........',
    '..b.b.b..',
    '.bBbBbBb.',
    '.bBBBBBb.',
    '.bBBBBBb.',
    '.bBBBBBb.',
    '..bBBBb..',
    '..bQQQb..',
    '...bbb...',
  ],
  [
    '..b.b.b..',
    '.bBbBbBb.',
    'bBBbBbBBb',
    'bBBBBBBBb',
    'bBBBBBBBb',
    '.bBBBBBb.',
    '.bQBBBQb.',
    '..bQQQb..',
    '..bQbQb..',
    '..bQ.Qb..',
    '...b.b...',
  ],
];

/** The fever's brand: a cross burned over somebody, pulsing. */
const BRAND = [
  [
    'q.......q',
    '.q.....q.',
    '..R...R..',
    '...R.R...',
    '....R....',
    '...R.R...',
    '..R...R..',
    '.q.....q.',
    'q.......q',
  ],
  [
    'R.......R',
    'RR.....RR',
    '.RR...RR.',
    '..RR.RR..',
    '...RRR...',
    '..RR.RR..',
    '.RR...RR.',
    'RR.....RR',
    'R.......R',
  ],
];

/** A tear over somebody's head, opening. */
const TEAR = [
  [
    '....u....',
    '....c....',
    '....u....',
    '....u....',
    '....c....',
    '....u....',
    '....u....',
    '....c....',
    '....u....',
    '....u....',
    '....c....',
  ],
  [
    '....u....',
    '...ucu...',
    '...uVu...',
    '..ucVcu..',
    '..uVVVu..',
    '..ucVcu..',
    '..uVVVu..',
    '..ucVcu..',
    '...uVu...',
    '...ucu...',
    '....u....',
  ],
  [
    '....c....',
    '...cVc...',
    '..cVVVc..',
    '.cVVVVVc.',
    '.cVVWVVc.',
    'cVVWWWVVc',
    '.cVVWVVc.',
    '.cVVVVVc.',
    '..cVVVc..',
    '...cVc...',
    '....c....',
  ],
];

/** The ground coming apart, with what is under it showing through. */

/**
 * A hand out of the ground, opening and then closing.
 *
 * The bayou's `grasp` drags somebody under and lets go; this one takes hold of
 * a wrist and is still holding it three rounds later, so the last frame is a
 * FIST rather than an open hand. Three frames, and the third is the one that
 * stays on screen.
 */
const BONE_HAND = [
  [
    '.*...*...*.',
    '*(*.*(*.*(*',
    '*(*.*(*.*(*',
    '.*(*.*(*.*.',
    '..*(*(*(*..',
    '..*(((((*..',
    '...*(((*...',
    '...k[[[k...',
    '....k[k....',
  ],
  [
    '..*.*.*....',
    '.*((*((*(..',
    '.*((*((*(..',
    '..*(((((*..',
    '..*(((((*..',
    '...*(((*...',
    '...*(((*...',
    '...k[[[k...',
    '....k[k....',
  ],
  [
    '...........',
    '...***.....',
    '..*(((*....',
    '..*(*((*...',
    '..*((((*...',
    '...*(((*...',
    '...*((*....',
    '...k[[[k...',
    '....k[k....',
  ],
];

/**
 * A bone cup, thrown to be spilled. It is the Hollow's answer to the bayou's
 * gourd and it is deliberately the same size and the same weight — what
 * changes between the two worlds is what comes out of it.
 */
const OSSUARY = [
  [
    '.kkkkkkk.',
    'k*(((((*k',
    'k*(,,,(*k',
    'k.*(((*.k',
    '..*(((*..',
    '...*(*...',
    '..k*(*k..',
    '..k(((k..',
    '...kkk...',
  ],
  [
    '.........',
    'k.,...,.k',
    '.k.,.,.k.',
    '..k*(*k..',
    '.k*(((*k.',
    '.k*(((*k.',
    '..k*(*k..',
    '...kkk...',
    '.........',
  ],
];

/**
 * A grave marker: a board, a crosspiece and a point on the end of it, driven
 * into the road in front of somebody. Two frames — arriving, and then standing
 * with the mark on it lit.
 */
const MARKER = [
  [
    '..kkkkk..',
    '.k}{{{}k.',
    '.k{{{{{k.',
    'kk{{{{{kk',
    'k}{{{{{}k',
    'kk{{{{{kk',
    '.k{{{{{k.',
    '.k{{{{{k.',
    '.k[{{{[k.',
    '..k{{{k..',
    '...k{k...',
    '....k....',
  ],
  [
    '..kkkkk..',
    '.k}{{{}k.',
    '.k{|||{k.',
    'kk{|{|{kk',
    'k}{|||{}k',
    'kk{|{|{kk',
    '.k{|||{k.',
    '.k{{{{{k.',
    '.k[{{{[k.',
    '..k{{{k..',
    '...k{k...',
    '....k....',
  ],
];

const FISSURE = [
  [
    '......X......',
    '.....XmX.....',
    '......X......',
  ],
  [
    '..XX..X..XX..',
    '.XmXXXmXXXmX.',
    '..XX..X..XX..',
  ],
  [
    '.XXX.XXX.XXX.',
    'XmMXXmMmXXMmX',
    '.XXXmMmXXXX..',
  ],
];

// ---------------------------------------------------------------------------
// The soft things, built
// ---------------------------------------------------------------------------

/** Fill one source pixel. Everything built below draws through this. */
function px(ctx, x, y, color, w = 1, h = 1) {
  if (!color) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/**
 * A FIREBALL, IN FIVE FRAMES.
 *
 * The one shape in the game that has to be drawn as a sequence rather than as
 * a picture, because an explosion is not a thing — it is a thing happening.
 * Each frame is a disc of a given radius with a fixed ramp read from the
 * middle out (white core, gold, magma, red, soot at the edge), roughened by a
 * seeded noise so the edge is torn rather than circular, and the last two
 * frames drop the core entirely and keep only the smoke.
 *
 * `radii` is the whole animation: out fast, out slower, and then it stops
 * growing and goes dark, which is what a stick of dynamite looks like.
 */
const BLAST_RADII = [4, 9, 13, 15, 16];
const BLAST_SIZE = 35;

/**
 * The ramp is read per FRAME, not once: an explosion is white in the middle for
 * about a tenth of a second and then it is smoke, and a fireball that fades
 * from orange to transparent reads as a sprite being turned down rather than as
 * something burning out. The last two frames are grey on purpose — smoke has to
 * be lighter than the road or nothing is left on screen at all.
 */
const FIRE_RAMPS = [
  [PALETTE.white, PALETTE.goldLight, PALETTE.gold, PALETTE.magma, PALETTE.magmaDeep],
  [PALETTE.white, PALETTE.goldLight, PALETTE.gold, PALETTE.magma, PALETTE.magmaDeep],
  [PALETTE.goldLight, PALETTE.gold, PALETTE.magma, PALETTE.magmaDeep, PALETTE.grey],
  [PALETTE.bone, PALETTE.boneDark, PALETTE.grey, PALETTE.grey, PALETTE.greyDark],
  [PALETTE.boneDark, PALETTE.grey, PALETTE.greyDark, PALETTE.charLight, PALETTE.charLight],
];

const SMOKE_RAMPS = FIRE_RAMPS.map(() => [
  PALETTE.bone,
  PALETTE.boneDark,
  PALETTE.grey,
  PALETTE.greyDark,
  PALETTE.charLight,
]);

function buildBlast(hot = true) {
  const ramps = hot ? FIRE_RAMPS : SMOKE_RAMPS;
  const mid = (BLAST_SIZE - 1) / 2;
  return BLAST_RADII.map((r, frame) => {
    const { canvas, ctx } = makeCanvas(BLAST_SIZE, BLAST_SIZE);
    const rng = makeRng(0x4a17 + frame * 9173);
    const ramp = ramps[Math.min(ramps.length - 1, frame)];
    /**
     * The silhouette is torn rather than round: the radius is modulated by
     * three sine terms of the angle, which is the cheapest thing that stops a
     * fireball reading as a planet. Per-pixel noise alone does not do it — it
     * roughens the edge by a pixel and leaves the circle underneath.
     */
    const lobes = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)];
    for (let y = 0; y < BLAST_SIZE; y++) {
      for (let x = 0; x < BLAST_SIZE; x++) {
        const dx = x - mid;
        const dy = (y - mid) * 1.08; // a shade wider than it is tall
        const a = Math.atan2(dy, dx);
        const wobble =
          1 +
          0.16 * Math.sin(a * 3 + lobes[0]) +
          0.11 * Math.sin(a * 5 + lobes[1]) +
          0.07 * Math.sin(a * 8 + lobes[2]);
        const edge = r * wobble;
        const d = Math.hypot(dx, dy) + rng.range(-0.7, 0.7);
        if (d > edge) continue;
        // Hollow the smoke frames out — smoke is a shell, not a ball.
        if (frame >= 3 && d < edge * 0.34 && rng.chance(0.6)) continue;
        const k = d / edge;
        px(ctx, x, y, ramp[Math.min(ramp.length - 1, Math.floor(k * ramp.length))]);
      }
    }
    return canvas;
  });
}

/**
 * A MAN IN A BLOCK OF ICE, IN THREE.
 *
 * Drawn over the fighter rather than instead of him: the slab is translucent
 * where he is (the scene draws it at three quarters alpha) and solid at the
 * rim, so what the player sees is the man they were shooting at, behind glass.
 * It grows from the boots up, because that is how the bayou's water and the
 * pass's melt both freeze — from the ground.
 */
const ICE_W = 18;
const ICE_H = 26;

function buildIceShell() {
  return [0.45, 0.78, 1].map((grow, frame) => {
    const { canvas, ctx } = makeCanvas(ICE_W, ICE_H);
    const rng = makeRng(0x1ce0 + frame * 5171);
    const top = Math.round(ICE_H * (1 - grow));
    for (let y = top; y < ICE_H; y++) {
      const k = (y - top) / Math.max(1, ICE_H - top);
      // A lens: widest across the chest, pulled in at the crown and the boots.
      const half = Math.round(2 + Math.sin(Math.min(1, k * 1.15) * Math.PI) * 6.4);
      const cx = ICE_W / 2;
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const edge = Math.abs(x - cx) >= half - 0.5;
        if (edge) px(ctx, x, y, PALETTE.iceDark);
        else if (Math.abs(x - cx) >= half - 1.6) px(ctx, x, y, PALETTE.ice);
        else if (rng.chance(0.16)) px(ctx, x, y, PALETTE.iceLight);
      }
      // The facets: a few vertical strokes of hard light down the front of it.
      if (rng.chance(0.35)) {
        px(ctx, cx + rng.int(-half + 2, half - 2), y, PALETTE.snowLight);
      }
    }
    return canvas;
  });
}

/**
 * MAGMA, COMING UP THROUGH SOMEBODY.
 *
 * A column with a white-hot centre, ragged at both edges and thinner as it
 * rises, built base-first so the anchor can be the hole it came out of. Three
 * frames: breaking the crust, full height, falling back.
 */
const SPOUT_W = 13;
const SPOUT_H = 30;

function buildSpout() {
  return [0.4, 1, 0.72].map((grow, frame) => {
    const { canvas, ctx } = makeCanvas(SPOUT_W, SPOUT_H);
    const rng = makeRng(0x5a11 + frame * 3313);
    const height = Math.round(SPOUT_H * grow);
    const cx = (SPOUT_W - 1) / 2;
    for (let i = 0; i < height; i++) {
      const y = SPOUT_H - 1 - i;
      const k = i / Math.max(1, height);
      // Wide at the ground, a jet at the top, and never quite symmetrical.
      const half = Math.max(0.6, (1 - k) * 4.6 + rng.range(-0.7, 0.7));
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const t = Math.abs(x - cx) / Math.max(0.6, half);
        const color = t > 0.78 ? PALETTE.magmaDeep : t > 0.42 ? PALETTE.magma : PALETTE.emberGlow;
        px(ctx, x, y, color);
      }
      if (rng.chance(0.3)) px(ctx, cx + rng.range(-half, half), y, PALETTE.sulfurLight);
    }
    // What it threw clear of the hole on the way up.
    for (let i = 0; i < 7; i++) {
      px(ctx, cx + rng.range(-6, 6), SPOUT_H - 1 - rng.range(0, height * 0.8), PALETTE.emberGlow);
    }
    return canvas;
  });
}

/**
 * A CLOUD THAT STAYS WHERE IT IS PUT.
 *
 * Grit in the eyes, snow across a pass, gas off a bog: three things that are
 * the same thing — a soft mass hanging over a fighter and thinning out. Built
 * from one generator taking the colours, so adding a fourth is a line rather
 * than a sprite sheet.
 */
const CLOUD_W = 22;
const CLOUD_H = 14;

function buildCloud(colors, seed) {
  return [0.55, 0.85, 1, 0.8].map((grow, frame) => {
    const { canvas, ctx } = makeCanvas(CLOUD_W, CLOUD_H);
    const rng = makeRng(seed + frame * 7717);
    const cx = CLOUD_W / 2;
    const cy = CLOUD_H / 2;
    const blobs = 7;
    for (let b = 0; b < blobs; b++) {
      const bx = cx + rng.range(-8, 8);
      const by = cy + rng.range(-4, 4);
      const r = rng.range(2, 4.6) * grow;
      for (let y = Math.round(by - r); y <= by + r; y++) {
        for (let x = Math.round(bx - r); x <= bx + r; x++) {
          if (x < 0 || y < 0 || x >= CLOUD_W || y >= CLOUD_H) continue;
          const d = Math.hypot(x - bx, y - by);
          if (d > r) continue;
          // Thin at the last frame, so it reads as blowing away.
          if (frame === 3 && rng.chance(0.45)) continue;
          const step = d > r * 0.72 ? 0 : d > r * 0.4 ? 1 : 2;
          px(ctx, x, y, colors[Math.min(colors.length - 1, step)]);
        }
      }
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

/**
 * `anchor` is the pixel the scene aims, in the prop's own source pixels.
 * `pivot` names what that pixel is for anybody reading a cast spec: `mid` for
 * anything that arrives centred on a target, `base` for anything standing on
 * the ground it came out of.
 */
const DEFS = {
  dynamite: { rows: DYNAMITE, anchor: [4, 4] },
  round: { rows: ROUND, anchor: [1, 3] },
  life: { rows: LIFE, anchor: [2, 2] },
  gust: { rows: GUST, anchor: [4, 3] },
  lasso: { rows: LASSO, anchor: [4, 3] },
  nest: { rows: NEST, anchor: [4, 4] },
  gourd: { rows: GOURD, anchor: [3, 4] },
  wisp: { rows: WISP, anchor: [3, 3] },
  shard: { rows: SHARD, anchor: [2, 3] },
  well: { rows: WELL, anchor: [4, 4] },
  mirror: { rows: MIRROR, anchor: [5, 3] },
  meteor: { rows: METEOR, anchor: [4, 4] },
  shade: { rows: SHADE, anchor: [5, 4] },
  grasp: { rows: GRASP, anchor: [4, 10] },
  brand: { rows: BRAND, anchor: [4, 4] },
  tear: { rows: TEAR, anchor: [4, 5] },
  fissure: { rows: FISSURE, anchor: [6, 2] },
  // The hollow. `boneHand` and `marker` are `base`-pivoted — both come out of
  // or go into the ground — and the cup is aimed at its middle like the gourd.
  boneHand: { rows: BONE_HAND, anchor: [5, 8] },
  ossuary: { rows: OSSUARY, anchor: [4, 4] },
  marker: { rows: MARKER, anchor: [4, 11] },
};

const BUILT = {
  blast: () => ({ frames: buildBlast(true), anchor: [(BLAST_SIZE - 1) / 2, (BLAST_SIZE - 1) / 2] }),
  smother: () => ({ frames: buildBlast(false), anchor: [(BLAST_SIZE - 1) / 2, (BLAST_SIZE - 1) / 2] }),
  ice: () => ({ frames: buildIceShell(), anchor: [ICE_W / 2, ICE_H] }),
  spout: () => ({ frames: buildSpout(), anchor: [(SPOUT_W - 1) / 2, SPOUT_H - 1] }),
  grit: () => ({
    frames: buildCloud([PALETTE.sandDark, PALETTE.sand, PALETTE.sandLight], 0x9001),
    anchor: [CLOUD_W / 2, CLOUD_H / 2],
  }),
  flurry: () => ({
    frames: buildCloud([PALETTE.snowShade, PALETTE.snow, PALETTE.snowLight], 0x9002),
    anchor: [CLOUD_W / 2, CLOUD_H / 2],
  }),
  miasma: () => ({
    frames: buildCloud([PALETTE.poisonDark, PALETTE.poison, PALETTE.greenLight], 0x9003),
    anchor: [CLOUD_W / 2, CLOUD_H / 2],
  }),
  swarm: () => ({
    frames: buildCloud([PALETTE.ink, PALETTE.goldDark, PALETTE.gold], 0x9004),
    anchor: [CLOUD_W / 2, CLOUD_H / 2],
  }),
  /**
   * The Hollow's dread: the same cloud primitive the grit, the flurry, the
   * miasma and the swarm are built from, in the one colour ramp that does not
   * describe a substance. There is nothing in it — that is the point of the
   * ability it belongs to — so it is drawn as the ground's own tones with the
   * corpse-light on the top edge, which reads as the air going wrong rather
   * than as something arriving in it.
   */
  dread: () => ({
    frames: buildCloud([PALETTE.gloamDeep, PALETTE.gloam, PALETTE.corpseLight], 0x9005),
    anchor: [CLOUD_W / 2, CLOUD_H / 2],
  }),
};

let cache = null;

/**
 * Every prop, baked once.
 * @returns {Record<string, {frames: HTMLCanvasElement[], anchor: [number, number]}>}
 */
export function getCastProps() {
  if (cache) return cache;
  cache = {};
  for (const [name, def] of Object.entries(DEFS)) {
    cache[name] = {
      frames: def.rows.map((rows) => bake({ key: KEY, rows })),
      anchor: def.anchor,
    };
  }
  for (const [name, build] of Object.entries(BUILT)) cache[name] = build();
  return cache;
}

/** One prop by name, or null — an unknown art id must never take a duel down. */
export function getCastProp(name) {
  return getCastProps()[name] || null;
}
