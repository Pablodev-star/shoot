/**
 * SHOOT! — Player character & horse sprites (Block 2a).
 *
 * ART SPEC
 * ---------------------------------------------------------------------------
 * Player  : 16 x 24 source pixels, soles on the last row, facing right.
 * Rider   : 16 x 21 source pixels, seated, drawn on top of the horse.
 * Horse   : 32 x 24 source pixels, hooves on the last row, facing right.
 *
 * Every figure carries a 1px ink outline and a single light source at the top
 * left, the same contract the item icons follow, so a duellist and a coin read
 * as the same set. The player is drawn in three-quarter profile: the hat brim
 * is wider on the leading side, the eye sits right of centre and the boot toes
 * point forward, which is what makes a 16px silhouette read as "facing right"
 * without any motion.
 *
 * Animations (frame lists are consumed by src/explore/walk-engine.js and by the
 * duel screen; timings are in milliseconds per frame):
 *
 *   PLAYER.idle   — 4 frames @ 220ms  breathing loop with a serape sway, used
 *                   when the walk is paused (shop/inn/duel intro).
 *   PLAYER.walk   — 4 frames @ 130ms  contact / passing / contact / passing,
 *                   the classic 4-pose cycle, with a 1px body bob so the
 *                   passing poses sit high and the contacts sit low.
 *   PLAYER.aim    — 4 frames @ 130ms  hand on the holster, revolver clearing
 *                   leather, arm rising, arm levelled. The holster empties as
 *                   the gun comes out.
 *   PLAYER.fire   — 3 frames @ 60/110/90ms  the shot: the gun driven back into
 *                   the hand, the muzzle kicked up, then dropping back on line.
 *   PLAYER.hit    — 2 frames @ 120ms  knocked back a pixel and lit up, then a
 *                   stagger onto the back foot.
 *   RIDER.ride    — 2 frames @ 200ms  seated upper body + a leg in the stirrup.
 *
 *   HORSE.idle    — 2 frames @ 400ms  tail swish and a cocked hind hoof.
 *   HORSE.walk    — 4 frames @ 150ms  diagonal 4-beat leg cycle.
 *   HORSE.gallop  — 4 frames @ 90ms   gathered / extended / contact / suspended,
 *                   the suspension frame lifted clear of the ground.
 *
 * Everything is authored as pixel strings and baked at load time (see
 * src/art/pixel.js), so the sprites stay in the shared palette and the repo
 * carries no binary assets. Limbs are stamped onto the body rather than
 * re-typed per frame: a leg pose is drawn once and placed four times, which is
 * what keeps a 4-beat gait consistent from frame to frame.
 *
 * THE REVOLVER IS NOT PART OF THE BODY
 * ---------------------------------------------------------------------------
 * It used to be: three grey pixels typed into the last column of the duel
 * poses, because that is all a 16-wide canvas has room for once a man is
 * standing in it. A gun drawn that way can never be more than a smudge, can
 * never leave the silhouette, and gives the muzzle flash nowhere to be.
 *
 * The gun is now its own sprite (see REVOLVERS below) with a grip anchor and a
 * muzzle anchor, drawn over the fighter at the hand pixel of whichever pose is
 * up. That buys three things at once: a revolver with a barrel, a cylinder and
 * a hammer; a muzzle the flash can be pinned to exactly; and one place to
 * change if a fighter should ever hold something else.
 *
 * ONE RIG, EVERY FIGHTER
 * ---------------------------------------------------------------------------
 * `composeFighter()` takes a head, a torso and a set of legs and returns the
 * whole animation set. The player is what you get when you pass nothing; the
 * enemies in src/art/sprites-enemies.js are what you get when you pass their
 * parts. Nobody re-implements a walk cycle to put a different hat on a man.
 */

import { PALETTE } from './palette.js';
import { bake, makeCanvas } from './pixel.js';

// Shared color key for every character-side sprite.
const KEY = {
  '.': null,
  ' ': null,
  k: PALETTE.ink,          // outline
  K: PALETTE.inkSoft,      // interior line
  h: PALETTE.leatherDark,  // hat
  H: PALETTE.leather,      // hat highlight
  s: PALETTE.skin,
  d: PALETTE.skinDark,
  p: PALETTE.red,          // serape
  P: PALETTE.redDark,      // serape shade
  q: PALETTE.redLight,     // serape highlight
  w: PALETTE.bone,         // neckerchief + serape stripe
  W: PALETTE.boneDark,
  b: PALETTE.woodDark,     // trousers
  B: PALETTE.wood,         // boot highlight
  l: PALETTE.gold,         // belt buckle
  g: PALETTE.steel,        // revolver
  G: PALETTE.steelDark,
  t: PALETTE.leather,      // belt / saddle
  T: PALETTE.leatherDark,  // belt shade / saddle horn
  e: PALETTE.horse,
  E: PALETTE.horseLight,
  m: PALETTE.horseDark,
  M: PALETTE.mane,         // hooves
  // A flaxen mane and tail. A black mane is the realistic choice and the wrong
  // one at 32px: it lands on top of the ink outline and the whole neck turns
  // into one dark smear. Pale hair separates from both the outline and the coat.
  n: PALETTE.boneDark,
  N: PALETTE.sandDark,     // hair in shadow
  u: PALETTE.redDark,      // saddle blanket
};

// ---------------------------------------------------------------------------
// Composition helpers
//
// Pixel strings are easy to read but painful to edit once a limb has to move.
// These four helpers let a frame be described as "this body, with that leg
// here", which is how the gaits below stay consistent.
// ---------------------------------------------------------------------------

/**
 * Draw `art` onto a copy of `rows` at (x, y).
 * '.' in the stamp leaves whatever is underneath; ' ' punches a hole.
 */
export function stamp(rows, art, x, y) {
  const out = rows.map((r) => r.split(''));
  for (let dy = 0; dy < art.length; dy++) {
    const ty = y + dy;
    if (ty < 0 || ty >= out.length) continue;
    const line = art[dy];
    for (let dx = 0; dx < line.length; dx++) {
      if (line[dx] === '.') continue;
      const tx = x + dx;
      if (tx < 0 || tx >= out[ty].length) continue;
      out[ty][tx] = line[dx];
    }
  }
  return out.map((r) => r.join(''));
}

/** Slide a whole frame sideways, keeping its width. */
function shiftX(rows, dx) {
  if (!dx) return rows;
  const w = rows[0].length;
  return rows.map((r) =>
    dx > 0 ? ('.'.repeat(dx) + r).slice(0, w) : (r.slice(-dx) + '.'.repeat(-dx)));
}

/** Swap palette characters — used for the hit flash and the empty holster. */
export function recolor(rows, map) {
  return rows.map((r) => r.replace(/./g, (c) => map[c] ?? c));
}

// ---------------------------------------------------------------------------
// PLAYER — 16 x 24
//
//   rows  0..10  hat, face, neckerchief
//   rows 11..17  serape and gun belt
//   rows 18..23  legs and boots
//
// Every fighter in the game — the player and all of src/art/sprites-enemies.js
// — is built on exactly this skeleton, so a head is interchangeable with a
// head and a torso with a torso. `composeFighter` at the bottom of the file is
// the only thing that knows how the three stack up.
// ---------------------------------------------------------------------------

/** Hat, face and neckerchief. Identical in every ground animation. */
export const HEAD = [
  '................',
  '.....kkkkk......',
  '....kHHHHHk.....',
  '....khhhhhk.....',
  '..kkkhhhhhkkkk..',
  '.kHHHHHHHHHHHk..',
  '.kkkkkkkkkkkkk..',
  '....ksssssk.....',
  '....ksssksk.....',
  '....kdssssk.....',
  '...kpqqqqqqpk...',
];

/**
 * Serape and belt. The cream stripe across row 13 is what stops the torso
 * reading as one red block at 16px, and the two skin pixels on row 15 are the
 * hands showing under the hem.
 */
export const TORSO = [
  '...kqqqqqqqqk...',
  '..kqppppppppqk..',
  '..kpwwwwwwwwpk..',
  '..kpPPPPPPPPpk..',
  '..kspPPPPPPpsk..',
  '...kPPPPPPPPk...',
  '...kTttllttTk...',
];

/**
 * Holstered revolver on the leading hip: butt and hammer above the leather,
 * the pouch below it. Removed from the moment the gun clears leather, so the
 * hip is empty for exactly as long as the gun is in the hand.
 */
export const HOLSTER = ['Gk', 'Tt', 'Tt'];

export const LEGS = {
  stand: [
    '...kbbbbbbbbk...',
    '...kbbk..kbbk...',
    '...kbbk..kbbk...',
    '...kbbk..kbbk...',
    '..kBBBk.kBBBk...',
    '..kkkkk.kkkkk...',
  ],
  contactA: [
    '...kbbbbbbbbk...',
    '..kbbk...kbbk...',
    '..kbbk....kbbk..',
    '.kbbk.....kbbk..',
    '.kBBk.....kBBBk.',
    '.kkkk.....kkkkk.',
  ],
  passingA: [
    '...kbbbbbbbbk...',
    '...kbbk.kbbk....',
    '...kbbk.kbbk....',
    '...kbbkkbbk.....',
    '..kBBBkkBBk.....',
    '..kkkkk.........',
  ],
  contactB: [
    '...kbbbbbbbbk...',
    '..kbbk...kbbk...',
    '.kbbk.....kbbk..',
    '.kbbk......kbbk.',
    'kBBBk......kBBk.',
    'kkkkk......kkkk.',
  ],
  passingB: [
    '...kbbbbbbbbk...',
    '...kbbk.kbbk....',
    '...kbbk.kbbk....',
    '....kbbkbbk.....',
    '....kBBkBBBk....',
    '.......kkkkk....',
  ],
};

/** Head + torso, dropped one pixel: the exhale of the breathing loop. */
function settle(upper) {
  return ['................', ...upper.slice(0, upper.length - 1)];
}

function ground(upper, legs) {
  return [...upper, ...legs];
}

// ---------------------------------------------------------------------------
// THE DRAW
//
// Six arm poses, each one a stamp laid over whatever torso the fighter is
// wearing, and each one saying where the gun hand ends up. Because they are
// stamps rather than whole frames, a skeleton and a gunslinger draw with the
// same timing and the same reach without either of them being redrawn.
//
// The stamps are deliberately NARROW: they only paint the three or four
// columns the arm actually occupies, and leave the rest of the torso row
// alone. A stamp that rewrote the whole row would work for the player's
// serape and quietly flatten every ribcage, lapel and chest lamp behind it.
//
//   `at`   the fighter row the stamp starts on
//   `hand` the pixel the grip sits in, in fighter space
//   `gun`  which revolver sprite is in that hand, if any
// ---------------------------------------------------------------------------

const DRAW_POSES = {
  /** Weight settled, gun hand hanging over the holster. Nothing drawn yet. */
  ready: {
    at: 16,
    rows: ['............ksk.'],
    holstered: true,
    gun: null,
  },
  /** Barrel out of leather, still pointed at the road. Holster empty now. */
  clear: {
    at: 15,
    rows: ['............ksk.'],
    holstered: false,
    gun: { art: 'raised', hand: { x: 13, y: 15 } },
  },
  /** Arm swinging up, gun coming round with it. */
  rising: {
    at: 13,
    rows: ['.............kss', '.............skk'],
    holstered: false,
    gun: { art: 'raised', hand: { x: 14, y: 13 } },
  },
  /** Levelled: arm dead flat, barrel on the rival's chest. */
  level: {
    at: 14,
    rows: ['.............ss.', '............kkk.'],
    holstered: false,
    gun: { art: 'level', hand: { x: 14, y: 14 } },
  },
  /**
   * The instant of the shot. The arm has not moved yet — it cannot, the bullet
   * is already gone — but the gun is driven back a pixel into the hand. One
   * pixel of compression before the kick is what stops the recoil reading as
   * the arm deciding to point somewhere else.
   */
  recoil: {
    at: 14,
    rows: ['.............ss.', '............kkk.'],
    holstered: false,
    gun: { art: 'level', hand: { x: 13, y: 14 } },
  },
  /** The kick: muzzle thrown up and back over the shoulder line. */
  kicked: {
    at: 12,
    rows: ['..............ss', '.............sk.'],
    holstered: false,
    gun: { art: 'raised', hand: { x: 14, y: 12 } },
  },
};

/** The order the poses play in. `fire` runs once and hands back to `level`. */
const AIM_SEQUENCE = ['ready', 'clear', 'rising', 'level'];
const FIRE_SEQUENCE = ['recoil', 'kicked', 'level'];

/** Milliseconds each frame of the shot is held. See CHARACTER_TIMING.fire. */
export const FIRE_FRAME_MS = [60, 110, 90];

// ---------------------------------------------------------------------------
// THE REVOLVER
//
// Two sprites, drawn over the fighter rather than into it: one levelled, one
// raised (used both on the way out of leather and on the way up off the kick).
// Each carries the two anchors the scene needs — `hand`, the pixel the grip is
// held by, and `muzzle`, where the flash and the smoke come out.
// ---------------------------------------------------------------------------

const REVOLVERS = {
  /**
   * Levelled. Hammer back over the frame, a brass round showing in the
   * cylinder, five pixels of barrel and a grip falling away under the fist.
   *
   * The two columns left of the grip are deliberately empty from the hand row
   * down: that is where the fist is, and a backstrap drawn across it turns the
   * gunslinger's forearm into a grey bar with no hand on the end of it.
   */
  level: {
    hand: { x: 2, y: 5 },
    muzzle: { x: 9, y: 3 },
    rows: [
      '..kk.....',
      '.kggk....',
      'kkggkkkkk',
      'kgogggggk',
      'kgGGGGGGk',
      '..Ttkkkk.',
      '.kTTk....',
      '..kTk....',
    ],
  },
  /** Coming out of leather, and coming down off the kick: the same arc. */
  raised: {
    hand: { x: 2, y: 6 },
    muzzle: { x: 7, y: -1 },
    rows: [
      '......kk.',
      '.....kggk',
      '....kggk.',
      '...kggk..',
      '..kggk...',
      '.kgok....',
      '.kTtk....',
      '..kTk....',
    ],
  },
};

/**
 * Gun metal, for fighters who should not be carrying the same blued steel as
 * everyone else. The key is otherwise the fighter's own.
 */
export const GUN_FINISHES = {
  steel: {},
  brass: { g: PALETTE.gold, G: PALETTE.goldDark, o: PALETTE.bone },
  bone: { g: PALETTE.bone, G: PALETTE.boneDark, o: PALETTE.red, T: PALETTE.greyDark, t: PALETTE.grey },
  void: { g: PALETTE.purple, G: PALETTE.purpleDark, o: PALETTE.star, T: PALETTE.cosmic, t: PALETTE.purpleDark },
};

const GUN_KEY = { ...KEY, o: PALETTE.goldLight };

const gunCache = new Map();

/**
 * Baked revolver art for one finish.
 * @returns {Record<'level'|'raised', {sprite: HTMLCanvasElement, hand: {x,y}, muzzle: {x,y}}>}
 */
export function getRevolverSprites(finish = 'steel') {
  if (gunCache.has(finish)) return gunCache.get(finish);
  const key = { ...GUN_KEY, ...(GUN_FINISHES[finish] || {}) };
  const out = {};
  for (const [name, def] of Object.entries(REVOLVERS)) {
    out[name] = { sprite: bake({ key, rows: def.rows }), hand: def.hand, muzzle: def.muzzle };
  }
  gunCache.set(finish, out);
  return out;
}

/**
 * Where the gun is, for every frame of every pose list a fighter can be in.
 * The renderer looks a pose up by name and frame index; nothing else needs to
 * know that a revolver is a separate sprite at all.
 */
export const GUN_TRACK = {
  idle: [null, null, null, null],
  walk: [null, null, null, null],
  hit: [null, null],
  aim: AIM_SEQUENCE.map((name) => DRAW_POSES[name].gun),
  fire: FIRE_SEQUENCE.map((name) => DRAW_POSES[name].gun),
};

// ---------------------------------------------------------------------------
// RIDER — 16 x 21, the seated upper body drawn over the horse.
// ---------------------------------------------------------------------------

const RIDER_BODY = [
  ...HEAD,
  '...kqqqqqqqqk...',
  '..kqppppppppqk..',
  '..kpwwwwwwwwpk..',
  '..kspPPPPPPPpk..',
  '...kPPPPPPPPsk..',
  '...kTttllttTkG..',
  '...kbbbbbbbbk...',
  '....kbbbbbbbk...',
  '......kbbbbk....',
  '.......kBBBk....',
];

const RIDER_FRAMES = {
  ride: [
    RIDER_BODY,
    // Half a beat later the rider has posted out of the saddle by a pixel; the
    // leg in the stirrup stays put, which is what makes it read as posting
    // rather than as the whole sprite jittering.
    [...settle(RIDER_BODY.slice(0, 18)), ...RIDER_BODY.slice(18)],
  ],
};

// ---------------------------------------------------------------------------
// HORSE — 32 x 24
//
//   rows  0..16  head, neck, barrel, saddle
//   rows 17..23  the leg cycle, stamped from the poses below
// ---------------------------------------------------------------------------

/**
 * Head, neck and barrel. Rows 0..8 are the head on top of a neck that tapers
 * as it rises — the single thing that stops a 32px quadruped reading as a
 * llama — with the mane running down its crest into the withers. Rows 9..16
 * are the barrel: lit along the topline, mid-tone through the flank, dark
 * under the belly, with a western saddle and blanket over the ribs.
 */
const HORSE_BODY = [
  '.......................k...k....',
  '......................kEk.kEk...',
  '......................knEEEEk...',
  '.....................knnEEwEEk..',
  '.....................knEEkEwEEk.',
  '....................knnEEEEwEEk.',
  '...................knnEEEEEwEeek',
  '..................knnEEEEmmeeMk.',
  '................knnEEEEEEmmk....',
  '.......kkkkkknnnnEEEEEEEEEk.....',
  '.....kkEEEEEEEEEEEEEEEEEEEEk....',
  '....kEEEEEEEEETEEEEEEEEEEEEk....',
  '...knEeeeTeeeeTeeeeeeeeeeeek....',
  '...kneeeuTttttTueeeeeeeeeeek....',
  '...knmeeuTTTTTTueeeeeeeeeeek....',
  '....kmmeeeeeeeeeeeeeeeeeeek.....',
  '.....kmmmmmmmmmmmmmmmmmmmk......',
];

/**
 * Tail poses. Docked on the croup and drawn over the rump, hanging past the
 * belly line so the hair is still visible under a body that fills most of the
 * sprite. A horse at rest flicks its tail; a horse at speed streams it out.
 */
const TAILS = {
  hang: [
    '....knn',
    '...knnk',
    '..knNnk',
    '..knNNk',
    '..knNNk',
    '..kNNk.',
    '..kNNk.',
    '..kNNk.',
    '...kNk.',
    '...kk..',
  ],
  swish: [
    '....knn',
    '...knnk',
    '..knNnk',
    '.knNNk.',
    'knNNk..',
    'kNNk...',
    'kNNk...',
    '.kNk...',
    '.kk....',
    '.......',
  ],
  stream: [
    '....knn',
    '..knnnk',
    'knNNNk.',
    'kNNk...',
    '.kk....',
    '.......',
    '.......',
    '.......',
    '.......',
    '.......',
  ],
};

/**
 * One leg, seven rows tall, drawn once per pose and re-tinted for the far side
 * of the animal. Templates are 8 columns wide so a limb can swing three pixels
 * either way without running off its own stamp.
 */
const LEG_POSES = {
  plant: [
    '..keeEk.',
    '..keeEk.',
    '..keEk..',
    '..keEk..',
    '..keEk..',
    '..keEk..',
    '..kMMk..',
  ],
  fwd: [
    '..keeEk.',
    '..keeEk.',
    '...keEk.',
    '...keEk.',
    '....keEk',
    '....keEk',
    '....kMMk',
  ],
  back: [
    '..keeEk.',
    '..keeEk.',
    '.keEk...',
    '.keEk...',
    'keEk....',
    'keEk....',
    'kMMk....',
  ],
  lift: [
    '..keeEk.',
    '..keeEk.',
    '...keEk.',
    '...keEk.',
    '...kMMk.',
    '........',
    '........',
  ],
  reach: [
    '..keeEk.',
    '...keEk.',
    '....keEk',
    '....keEk',
    '....kMMk',
    '........',
    '........',
  ],
  tuck: [
    '..keeEk.',
    '..keeEk.',
    '..keEk..',
    '.keEk...',
    '.kMMk...',
    '........',
    '........',
  ],
};

/** The far pair is a shade darker so the near pair reads in front of it. */
const farLeg = (pose) => recolor(LEG_POSES[pose], { e: 'm', E: 'm' });
const nearLeg = (pose) => LEG_POSES[pose];

/** Column each leg is stamped at. Far legs sit behind and slightly inboard. */
const LEG_X = { hindFar: 3, hindNear: 6, foreFar: 17, foreNear: 20 };
const LEG_Y = 17;

/**
 * Compose one horse frame.
 * @param {{hindFar:string, hindNear:string, foreFar:string, foreNear:string}} gait
 * @param {keyof TAILS} tail
 */
function horseFrame(gait, tail = 'hang') {
  // Barrel, then the tail draped over the rump, then the far pair of legs, then
  // the near pair in front of everything.
  let rows = stamp(Array(24).fill('.'.repeat(32)), HORSE_BODY, 0, 0);
  rows = stamp(rows, TAILS[tail], 0, 9);
  rows = stamp(rows, farLeg(gait.hindFar), LEG_X.hindFar, LEG_Y);
  rows = stamp(rows, farLeg(gait.foreFar), LEG_X.foreFar, LEG_Y);
  rows = stamp(rows, nearLeg(gait.hindNear), LEG_X.hindNear, LEG_Y);
  rows = stamp(rows, nearLeg(gait.foreNear), LEG_X.foreNear, LEG_Y);
  return rows;
}

const HORSE_FRAMES = {
  idle: [
    horseFrame({ hindFar: 'plant', hindNear: 'plant', foreFar: 'plant', foreNear: 'plant' }, 'hang'),
    // Weight shifted off one hind hoof, tail flicked across.
    horseFrame({ hindFar: 'plant', hindNear: 'lift', foreFar: 'plant', foreNear: 'plant' }, 'swish'),
  ],
  /** A diagonal 4-beat: each leg leads its diagonal partner by half a cycle. */
  walk: [
    horseFrame({ hindFar: 'back', hindNear: 'fwd', foreFar: 'fwd', foreNear: 'back' }, 'hang'),
    horseFrame({ hindFar: 'lift', hindNear: 'plant', foreFar: 'plant', foreNear: 'lift' }, 'swish'),
    horseFrame({ hindFar: 'fwd', hindNear: 'back', foreFar: 'back', foreNear: 'fwd' }, 'hang'),
    horseFrame({ hindFar: 'plant', hindNear: 'lift', foreFar: 'lift', foreNear: 'plant' }, 'swish'),
  ],
  /**
   * Gathered → extended → landing → drive. The first two frames are airborne;
   * see HORSE_FRAME_LIFT for how they leave the road.
   */
  gallop: [
    horseFrame({ hindFar: 'tuck', hindNear: 'tuck', foreFar: 'tuck', foreNear: 'tuck' }, 'stream'),
    horseFrame({ hindFar: 'back', hindNear: 'back', foreFar: 'reach', foreNear: 'reach' }, 'stream'),
    horseFrame({ hindFar: 'back', hindNear: 'back', foreFar: 'plant', foreNear: 'fwd' }, 'stream'),
    horseFrame({ hindFar: 'fwd', hindNear: 'plant', foreFar: 'lift', foreNear: 'back' }, 'stream'),
  ],
};

/**
 * How far off the ground each frame sits, in source pixels.
 *
 * The lift is deliberately *not* baked into the sprites. The horse fills its
 * 24-row canvas edge to edge — ears on row 0, hooves on row 23 — so shifting
 * the art up inside its own frame would have to throw the ears away, and they
 * would blink out and back on every stride. Offsetting at draw time keeps the
 * whole animal intact, and carries the rider up with it, which is what a
 * suspension phase should look like.
 */
export const HORSE_FRAME_LIFT = {
  idle: [0, 0],
  walk: [0, 0, 0, 0],
  gallop: [2, 1, 0, 0],
};

// ---------------------------------------------------------------------------
// Baking + public API
// ---------------------------------------------------------------------------

function bakeSet(frames, key = KEY) {
  const out = {};
  for (const [name, list] of Object.entries(frames)) {
    out[name] = list.map((rows) => bake({ key, rows }));
  }
  return out;
}

/**
 * Build one fighter's whole animation set from a head, a torso and a leg set.
 *
 * This is the rig. The player passes nothing and gets the gunslinger; every
 * enemy archetype passes its own parts and gets the same five animations, at
 * the same timings, holding the same revolver. That is deliberate: a skeleton
 * that draws on a different beat from the man it is shooting at is a skeleton
 * the player cannot read.
 *
 * @param {object} [parts]
 * @param {string[]} [parts.head]   11 rows
 * @param {string[]} [parts.torso]  7 rows
 * @param {string[]} [parts.flare]  7 rows — the torso mid-stride; defaults to
 *   the torso with its hem kicked out one row
 * @param {object}  [parts.legs]    a LEGS-shaped set of 6-row poses
 * @param {string[]|null} [parts.holster] hip art, or null for a fighter who
 *   carries no holster (the gun simply appears in the hand)
 * @param {Record<string, string|null>} [parts.key] palette overrides
 */
export function composeFighter(parts = {}) {
  const head = parts.head || HEAD;
  const torso = parts.torso || TORSO;
  const flare = parts.flare || stamp(torso, ['..kPPPPPPPPPPk..'], 0, 5);
  const legs = parts.legs || LEGS;
  const holsterArt = parts.holster === undefined ? HOLSTER : parts.holster;
  const key = parts.key ? { ...KEY, ...parts.key } : KEY;

  const upper = [...head, ...torso];
  const upperFlare = [...head, ...flare];
  const low = settle(upper);
  const lowFlare = settle(upperFlare);

  const holstered = (rows) => (holsterArt ? stamp(rows, holsterArt, 13, 17) : rows);
  const standing = (up) => ground(up, legs.stand);

  /** One frame of the draw: the arm stamp over a standing body. */
  const drawPose = (name) => {
    const pose = DRAW_POSES[name];
    const body = stamp(standing(upper), pose.rows, 0, pose.at);
    return pose.holstered ? holstered(body) : body;
  };

  const frames = {
    idle: [
      holstered(standing(upper)),
      holstered(standing(low)),
      holstered(standing(upper)),
      holstered(ground(lowFlare, legs.stand)),
    ],
    /**
     * Contacts sit a pixel low (weight on the planted foot) and the passing
     * poses ride high, which is the whole trick to a walk that does not look
     * like a sprite sliding along the ground.
     */
    walk: [
      holstered(ground(lowFlare, legs.contactA)),
      holstered(ground(upper, legs.passingA)),
      holstered(ground(lowFlare, legs.contactB)),
      holstered(ground(upper, legs.passingB)),
    ],
    aim: AIM_SEQUENCE.map(drawPose),
    fire: FIRE_SEQUENCE.map(drawPose),
    hit: [
      // Knocked back a pixel and washed out by the impact.
      shiftX(recolor(holstered(standing(upper)), { P: 'p', p: 'q', q: 'w' }), -1),
      // Stagger: weight thrown onto the trailing foot.
      holstered(ground(low, legs.contactB)),
    ],
  };

  const baked = bakeSet(frames, key);
  baked.finish = parts.gun || 'steel';
  baked.portrait = makePortrait(baked, baked.finish);
  return baked;
}

/**
 * A single composed still — fighter levelled, revolver in hand — for the parts
 * of the interface that want a picture of someone rather than an animation.
 * The gun lives in its own sprite now, so a portrait has to be assembled; a
 * raw pose frame would show a man aiming an empty fist.
 */
function makePortrait(set, finish) {
  const pose = DRAW_POSES.level;
  const gun = getRevolverSprites(finish)[pose.gun.art];
  const body = set.aim[AIM_SEQUENCE.indexOf('level')];
  const gx = pose.gun.hand.x - gun.hand.x;
  const gy = pose.gun.hand.y - gun.hand.y;
  const width = Math.max(body.width, gx + gun.sprite.width);
  const { canvas, ctx } = makeCanvas(width, body.height);
  ctx.drawImage(body, 0, 0);
  ctx.drawImage(gun.sprite, gx, gy);
  return canvas;
}

/** Milliseconds per frame for each animation. */
export const CHARACTER_TIMING = {
  idle: 220,
  walk: 130,
  /** The draw. Fast: a slow draw is a dead gunslinger. */
  aim: 130,
  hit: 120,
  ride: 200,
};

export const HORSE_TIMING = {
  idle: 400,
  walk: 150,
  gallop: 90,
};

/**
 * Where the rider sprite sits relative to the horse's top-left corner, in
 * source pixels. Derived from the saddle: its seat runs x 9..14 with the top of
 * the seat on row 13, and the rider's hips are row 17 of a 21-row sprite,
 * centred on x 7.5. So x = 11.5 - 7.5 and y = 13 - 17.
 */
export const RIDER_OFFSET = { x: 4, y: -4 };

export const PLAYER_SIZE = { w: 16, h: 24 };
export const RIDER_SIZE = { w: 16, h: 21 };
export const HORSE_SIZE = { w: 32, h: 24 };

let cache = null;

/** Bake (once) and return every character-side sprite set. */
export function getCharacterSprites() {
  if (cache) return cache;
  cache = {
    player: composeFighter(),
    rider: bakeSet(RIDER_FRAMES),
    horse: bakeSet(HORSE_FRAMES),
  };
  return cache;
}
