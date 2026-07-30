/**
 * SHOOT! — Player character & horse sprites (Block 2a).
 *
 * ART SPEC
 * ---------------------------------------------------------------------------
 * Player  : 16 x 24 source pixels, feet on the last row, facing right.
 * Horse   : 32 x 24 source pixels, hooves on the last row, facing right.
 *
 * Animations (frame lists are consumed by src/explore/walk-engine.js and by the
 * duel screen; timings are in milliseconds per frame):
 *
 *   PLAYER.idle   — 4 frames @ 220ms  breathing loop, used when the walk is
 *                   paused (shop/inn/duel intro).
 *   PLAYER.walk   — 4 frames @ 130ms  contact / passing / contact / passing,
 *                   the classic 4-pose cycle. On horseback this is not used.
 *   PLAYER.duel   — 3 frames @ 160ms  ready stance: hand hovering over the
 *                   holster, arm rising, revolver levelled.
 *   PLAYER.ride   — 2 frames @ 200ms  seated upper body, drawn on top of the
 *                   horse at RIDER_OFFSET.
 *
 *   HORSE.idle    — 2 frames @ 400ms  tail flick.
 *   HORSE.walk    — 4 frames @ 150ms  leg cycle.
 *   HORSE.gallop  — 4 frames @ 90ms   gathered / extended / contact / suspended.
 *
 * Everything is authored as pixel strings and baked at load time (see
 * src/art/pixel.js), so the sprites stay in the shared palette and the repo
 * carries no binary assets.
 */

import { PALETTE } from './palette.js';
import { bake } from './pixel.js';

// Shared color key for every character-side sprite.
const KEY = {
  '.': null,
  k: PALETTE.ink,          // outline
  h: PALETTE.leatherDark,  // hat
  H: PALETTE.leather,      // hat highlight
  s: PALETTE.skin,
  d: PALETTE.skinDark,
  p: PALETTE.red,          // poncho
  P: PALETTE.redDark,      // poncho shade
  q: PALETTE.redLight,     // poncho highlight
  b: PALETTE.woodDark,     // trousers / boots
  B: PALETTE.wood,         // boot highlight
  l: PALETTE.gold,         // belt buckle
  g: PALETTE.steel,        // revolver
  G: PALETTE.steelDark,
  w: PALETTE.bone,
  e: PALETTE.horse,
  E: PALETTE.horseLight,
  m: PALETTE.horseDark,
  n: PALETTE.mane,
  t: PALETTE.leather,      // saddle
};

// ---------------------------------------------------------------------------
// PLAYER
// ---------------------------------------------------------------------------

/** Rows 0..16: head + torso. Shared by every ground animation. */
const TORSO = [
  '................',
  '.....hhhhhh.....',
  '....hHHHHHHh....',
  '...hhhhhhhhhh...',
  '..hhhhhhhhhhhh..',
  '.....ssssss.....',
  '.....sksks......',
  '.....ssssss.....',
  '......dddd......',
  '....pppppppp....',
  '...pqppppppqp...',
  '...ppPPPPPPpp...',
  '...pppppppppp...',
  '...pppppppppp...',
  '....pppppppp....',
  '....bbllbbbb....',
  '.....bbbbbb.....',
];

/** A one-pixel-lower torso, for the breathing/bob frames. */
const TORSO_LOW = ['................', ...TORSO.slice(0, TORSO.length - 1)];

const LEGS = {
  stand: [
    '.....bb.bb......',
    '.....bb.bb......',
    '.....bb.bb......',
    '....bbb.bbb.....',
    '...BBbb.bbBB....',
    '................',
    '................',
  ],
  contactA: [
    '.....bb.bb......',
    '....bb...bb.....',
    '...bb.....bb....',
    '..bbb.....bbb...',
    '.BBbb.....bbBB..',
    '................',
    '................',
  ],
  passing: [
    '.....bb.bb......',
    '.....bbbb.......',
    '.....bb.bb......',
    '....bbb..bb.....',
    '...BBbb..bbB....',
    '................',
    '................',
  ],
  contactB: [
    '.....bb.bb......',
    '.....bb..bb.....',
    '....bb....bbb...',
    '...bbb....bbb...',
    '..BBbb....bbBB..',
    '................',
    '................',
  ],
};

/** Arms are drawn over the torso by swapping two rows. */
function withArms(torso, left, right) {
  const rows = torso.slice();
  const y = rows.length - 5; // arm line inside the poncho block
  const chars = rows[y].split('');
  chars[1] = left;
  chars[2] = left;
  chars[13] = right;
  chars[14] = right;
  rows[y] = chars.join('');
  return rows;
}

const PLAYER_FRAMES = {
  idle: [
    [...TORSO, ...LEGS.stand],
    [...TORSO_LOW, ...LEGS.stand],
    [...TORSO, ...LEGS.stand],
    [...TORSO_LOW, ...LEGS.stand],
  ],
  walk: [
    [...withArms(TORSO, 's', '.'), ...LEGS.contactA],
    [...withArms(TORSO_LOW, '.', '.'), ...LEGS.passing],
    [...withArms(TORSO, '.', 's'), ...LEGS.contactB],
    [...withArms(TORSO_LOW, '.', '.'), ...LEGS.passing],
  ],
  duel: [
    // hand hovering over the holster
    [...TORSO, ...LEGS.stand].map((row, i) => (i === 14 ? '....pppppppps...' : row)),
    // arm rising, revolver clearing leather
    [...TORSO, ...LEGS.stand].map((row, i) => (i === 13 ? '...ppppppppppsG.' : row)),
    // levelled
    [...TORSO, ...LEGS.stand].map((row, i) => {
      if (i === 12) return '...ppppppppppssG';
      if (i === 13) return '...pppppppppp.Gg';
      return row;
    }),
  ],
  hit: [
    [...TORSO, ...LEGS.stand].map((row) => row.replace(/p/g, 'q')),
    [...TORSO_LOW, ...LEGS.contactB],
  ],
};

/** Seated upper body drawn over the horse. */
const RIDER_FRAMES = {
  ride: [
    [
      '................',
      '.....hhhhhh.....',
      '....hHHHHHHh....',
      '...hhhhhhhhhh...',
      '..hhhhhhhhhhhh..',
      '.....ssssss.....',
      '.....sksks......',
      '.....ssssss.....',
      '......dddd......',
      '....pppppppp....',
      '...pqppppppqp...',
      '...ppPPPPPPps...',
      '...pppppppppp...',
      '....bbllbbbb....',
      '.....bb..bb.....',
      '.....bb..bb.....',
      '................',
    ],
    [
      '................',
      '................',
      '.....hhhhhh.....',
      '....hHHHHHHh....',
      '...hhhhhhhhhh...',
      '..hhhhhhhhhhhh..',
      '.....ssssss.....',
      '.....sksks......',
      '.....ssssss.....',
      '......dddd......',
      '....pppppppp....',
      '...pqppppppqs...',
      '...ppPPPPPPpp...',
      '...pppppppppp...',
      '....bbllbbbb....',
      '.....bb..bb.....',
      '.....bb..bb.....',
    ],
  ],
};

// ---------------------------------------------------------------------------
// HORSE
// ---------------------------------------------------------------------------

/**
 * Rows 0..15 of the horse: head (top right), neck, barrel, saddle and tail.
 * Facing right. The saddle sits at x 8..13 — RIDER_OFFSET is derived from it.
 */
const HORSE_BODY = [
  '......................mmmm......',
  '.....................mEEEEm.....',
  '.....................mEEEEmm....',
  '.....................mEkEEEEm...',
  '.....................mEEEEEEEm..',
  '......................mEEEEEEm..',
  '......................mEEEEmm...',
  '....................nnmEEEEm....',
  '...................nnmEEEEEm....',
  '..................nnmEEEEEm.....',
  '.mmmmmmmmmmmmmmmmmmmEEEEm.......',
  'nmEEEEEEEEEEEEEEEEEEEEEm........',
  'nmEEEEEttttttEEEEEEEEEm.........',
  'nmEEEEEttttttEEEEEEEEm..........',
  'nmEEEEEEEEEEEEEEEEEEm...........',
  'n.mmEEEEEEEEEEEEEEEm............',
];

/** Tail flick: `lean` swings the tip of the tail hanging off the rump. */
function withTail(body, lean) {
  const rows = body.slice();
  const tip = 15;
  for (let i = tip - lean; i <= tip; i++) {
    if (i < 11) continue;
    const chars = rows[i].split('');
    if (chars[0] === '.') chars[0] = 'n';
    rows[i] = chars.join('');
  }
  return rows;
}

/**
 * Rows 16..23: the leg cycle. Hind legs sit around x 4..6, forelegs around
 * x 17..19, matching where the barrel ends in HORSE_BODY.
 */
const HOOVES = {
  stand: [
    '.mEEE..........mEEE.............',
    '.mEEE..........mEEE.............',
    '..mEE...........mEE.............',
    '..mEE...........mEE.............',
    '..mEE...........mEE.............',
    '..mEE...........mEE.............',
    '.mmmm..........mmmm.............',
    '................................',
  ],
  walkA: [
    '.mEEE..........mEEE.............',
    '.mEEE...........mEEE............',
    'mEE...............mEE...........',
    'mEE................mEE..........',
    'mEE.................mEE.........',
    'mEE..................mEE........',
    'mmm..................mmm........',
    '................................',
  ],
  walkB: [
    '.mEEE..........mEEE.............',
    '..mEEE..........mEEE............',
    '...mEE............mEE...........',
    '...mEE............mEE...........',
    '....mEE............mEE..........',
    '....mEE............mEE..........',
    '...mmm............mmm...........',
    '................................',
  ],
  gallopGather: [
    '.mEEEmEEE......mEEEmEEE.........',
    '.mEE...mEE.....mEE...mEE........',
    'mEE.....mEE...mEE.....mEE.......',
    'mEE......mE...mE.......mEE......',
    'mmm......mm...mm.......mmm......',
    '................................',
    '................................',
    '................................',
  ],
  gallopExtend: [
    '.mEEE..........mEEE.............',
    'mEE.............mEEE............',
    'mEE...............mEEE..........',
    'EE..................mEEE........',
    'EE....................mEE.......',
    'mm.....................mm.......',
    '................................',
    '................................',
  ],
  gallopSuspend: [
    '.mEEEmEEE......mEEEmEEE.........',
    '..mEE.mEE.......mEE.mEE.........',
    '..mEE.mEE.......mEE.mEE.........',
    '..mm..mm........mm..mm..........',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
};

const HORSE_FRAMES = {
  idle: [
    [...withTail(HORSE_BODY, 0), ...HOOVES.stand],
    [...withTail(HORSE_BODY, 1), ...HOOVES.stand],
  ],
  walk: [
    [...withTail(HORSE_BODY, 0), ...HOOVES.walkA],
    [...withTail(HORSE_BODY, 1), ...HOOVES.walkB],
    [...withTail(HORSE_BODY, 0), ...HOOVES.walkA],
    [...withTail(HORSE_BODY, 1), ...HOOVES.stand],
  ],
  gallop: [
    [...withTail(HORSE_BODY, 1), ...HOOVES.gallopGather],
    [...withTail(HORSE_BODY, 2), ...HOOVES.gallopExtend],
    [...withTail(HORSE_BODY, 1), ...HOOVES.gallopSuspend],
    [...withTail(HORSE_BODY, 2), ...HOOVES.gallopExtend],
  ],
};

// ---------------------------------------------------------------------------
// Baking + public API
// ---------------------------------------------------------------------------

function bakeSet(frames) {
  const out = {};
  for (const [name, list] of Object.entries(frames)) {
    out[name] = list.map((rows) => bake({ key: KEY, rows }));
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
 * source pixels. Derived from the saddle at x 8..13, row 10.
 */
export const RIDER_OFFSET = { x: 3, y: -6 };

export const PLAYER_SIZE = { w: 16, h: 24 };
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
 * Recolor helper — enemies reuse the player rig with a different poncho so the
 * duel screen can show a distinct silhouette without new art.
 */
export function bakeEnemyVariant(ponchoLight, poncho, ponchoDark, hat = PALETTE.woodDeep) {
  const key = { ...KEY, p: poncho, P: ponchoDark, q: ponchoLight, h: hat, H: PALETTE.woodDark };
  const out = {};
  for (const [name, list] of Object.entries(PLAYER_FRAMES)) {
    out[name] = list.map((rows) => bake({ key, rows }));
  }
  return out;
}
