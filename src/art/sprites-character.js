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
 *   PLAYER.duel   — 3 frames @ 160ms  hand on the holster, revolver clearing
 *                   leather, revolver levelled. The holster empties as the
 *                   gun comes out.
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
 */

import { PALETTE } from './palette.js';
import { bake } from './pixel.js';

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
function stamp(rows, art, x, y) {
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

/** Slide a whole frame vertically, keeping its height. Negative = up. */
function shiftY(rows, dy) {
  if (!dy) return rows;
  const w = rows[0].length;
  const empty = '.'.repeat(w);
  const h = rows.length;
  if (dy > 0) return [...Array(dy).fill(empty), ...rows].slice(0, h);
  return [...rows.slice(-dy), ...Array(-dy).fill(empty)];
}

/** Swap palette characters — used for the hit flash and the empty holster. */
function recolor(rows, map) {
  return rows.map((r) => r.replace(/./g, (c) => map[c] ?? c));
}

// ---------------------------------------------------------------------------
// PLAYER — 16 x 24
//
//   rows  0..10  hat, face, neckerchief
//   rows 11..17  serape and gun belt
//   rows 18..23  legs and boots
// ---------------------------------------------------------------------------

/** Hat, face and neckerchief. Identical in every ground animation. */
const HEAD = [
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
const TORSO = [
  '...kqqqqqqqqk...',
  '..kqppppppppqk..',
  '..kpwwwwwwwwpk..',
  '..kpPPPPPPPPpk..',
  '..kspPPPPPPpsk..',
  '...kPPPPPPPPk...',
  '...kTttllttTk...',
];

/** The serape flaring out as the body swings through a stride. */
const TORSO_FLARE = stamp(TORSO, ['..kPPPPPPPPPPk..'], 0, 5);

/** Holstered revolver on the leading hip; removed once the gun is drawn. */
const HOLSTER = ['G', 'T', 'T'];

const LEGS = {
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

const UPPER = [...HEAD, ...TORSO];
const UPPER_FLARE = [...HEAD, ...TORSO_FLARE];
const UPPER_LOW = settle(UPPER);
const UPPER_LOW_FLARE = settle(UPPER_FLARE);

/** Everything but the duel poses wears the revolver on its hip. */
const holstered = (rows) => stamp(rows, HOLSTER, 13, 17);

const PLAYER_FRAMES = {
  idle: [
    holstered(ground(UPPER, LEGS.stand)),
    holstered(ground(UPPER_LOW, LEGS.stand)),
    holstered(ground(UPPER, LEGS.stand)),
    holstered(ground(UPPER_LOW_FLARE, LEGS.stand)),
  ],
  /**
   * Contacts sit a pixel low (weight on the planted foot) and the passing
   * poses ride high, which is the whole trick to a walk that does not look
   * like a sprite sliding along the ground.
   */
  walk: [
    holstered(ground(UPPER_LOW_FLARE, LEGS.contactA)),
    holstered(ground(UPPER, LEGS.passingA)),
    holstered(ground(UPPER_LOW_FLARE, LEGS.contactB)),
    holstered(ground(UPPER, LEGS.passingB)),
  ],
  duel: [
    // Hand dropped onto the holster, gun still in leather.
    holstered(
      stamp(ground(UPPER, LEGS.stand), ['..kspPPPPPPPpk..', '...kPPPPPPPPsk..'], 0, 15),
    ),
    // Arm up, barrel clearing leather. The holster is empty from here on.
    stamp(
      ground(UPPER, LEGS.stand),
      ['..kpwwwwwwwwpkG.', '..kpPPPPPPPPpsgk', '..kspPPPPPPpk...'],
      0,
      13,
    ),
    // Levelled, dead flat, muzzle at the sprite edge where the flash lands.
    stamp(
      ground(UPPER, LEGS.stand),
      ['..kpPPPPPPPPsGgg', '..kspPPPPPPpk...'],
      0,
      14,
    ),
  ],
  hit: [
    // Knocked back a pixel and washed out by the impact.
    shiftX(recolor(holstered(ground(UPPER, LEGS.stand)), { P: 'p', p: 'q', q: 'w' }), -1),
    // Stagger: weight thrown onto the trailing foot.
    holstered(ground(UPPER_LOW, LEGS.contactB)),
  ],
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
 * @param {number} lift vertical offset — the gallop's suspension phase
 */
function horseFrame(gait, tail = 'hang', lift = 0) {
  // Barrel, then the tail draped over the rump, then the far pair of legs, then
  // the near pair in front of everything.
  let rows = stamp(Array(24).fill('.'.repeat(32)), HORSE_BODY, 0, 0);
  rows = stamp(rows, TAILS[tail], 0, 9);
  rows = stamp(rows, farLeg(gait.hindFar), LEG_X.hindFar, LEG_Y);
  rows = stamp(rows, farLeg(gait.foreFar), LEG_X.foreFar, LEG_Y);
  rows = stamp(rows, nearLeg(gait.hindNear), LEG_X.hindNear, LEG_Y);
  rows = stamp(rows, nearLeg(gait.foreNear), LEG_X.foreNear, LEG_Y);
  return lift ? shiftY(rows, -lift) : rows;
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
   * Gathered → extended → landing → drive. The two airborne frames are lifted
   * clear of the ground so the whole animal leaves the road, which is what
   * separates a gallop from a fast walk.
   */
  gallop: [
    horseFrame({ hindFar: 'tuck', hindNear: 'tuck', foreFar: 'tuck', foreNear: 'tuck' }, 'stream', 2),
    horseFrame({ hindFar: 'back', hindNear: 'back', foreFar: 'reach', foreNear: 'reach' }, 'stream', 1),
    horseFrame({ hindFar: 'back', hindNear: 'back', foreFar: 'plant', foreNear: 'fwd' }, 'stream'),
    horseFrame({ hindFar: 'fwd', hindNear: 'plant', foreFar: 'lift', foreNear: 'back' }, 'stream'),
  ],
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

/** Milliseconds per frame for each animation. */
export const CHARACTER_TIMING = {
  idle: 220,
  walk: 130,
  duel: 160,
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
    player: bakeSet(PLAYER_FRAMES),
    rider: bakeSet(RIDER_FRAMES),
    horse: bakeSet(HORSE_FRAMES),
  };
  return cache;
}

/**
 * Recolor helper — enemies reuse the player rig with a different serape so the
 * duel screen can show a distinct silhouette without new art.
 */
export function bakeEnemyVariant(ponchoLight, poncho, ponchoDark, hat = PALETTE.woodDeep) {
  const key = { ...KEY, p: poncho, P: ponchoDark, q: ponchoLight, h: hat, H: PALETTE.woodDark };
  return bakeSet(PLAYER_FRAMES, key);
}
