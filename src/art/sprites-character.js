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
 *
 * That is also the whole of the wardrobe: an outfit is a set of parts, handed
 * in through `setPlayerParts` by src/game/wardrobe.js, and this file never
 * learns what a "hat" is. See `getCharacterSprites` at the bottom.
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
  /**
   * WARDROBE ACCENTS
   * -----------------------------------------------------------------------
   * Four garment slots, two characters each, and no slot is allowed to touch
   * another's pair. A hatband's brass and a boot's brass are then free to be
   * different brass, and a shirt that wants a glowing seam cannot accidentally
   * set fire to the trousers. The values here are only the fallbacks — every
   * garment in src/art/sprites-wardrobe.js states its own.
   */
  a: PALETTE.gold,         // hat accent
  A: PALETTE.goldDark,
  f: PALETTE.bone,         // shirt accent
  F: PALETTE.boneDark,
  c: PALETTE.woodLight,    // trouser accent
  C: PALETTE.wood,
  v: PALETTE.leatherDark,  // boot accent
  V: PALETTE.leather,
  /**
   * …and the fifth slot, which is not on the man at all. A harness is tack
   * hung on the horse (see HARNESS in src/art/sprites-wardrobe.js) and it gets
   * its own three characters for exactly the same reason the four above have
   * theirs: the brass on a bridle and the brass on a hatband are allowed to be
   * different brass, and neither may repaint the other.
   */
  j: PALETTE.leather,      // strap
  J: PALETTE.leatherDark,  // strap shade
  i: PALETTE.goldLight,    // buckle / conchos
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

/**
 * Lean a whole figure over, pivoting on its last row.
 *
 * Each row is slid sideways by its distance from the floor times `k`, so the
 * feet stay planted and the head travels furthest — which is what a body
 * pivoting on its heels actually does. Rows that slide off the edge are lost;
 * that is correct, because a man going over is on his way out of his own
 * bounding box.
 */
function lean(rows, k) {
  const floor = rows.length - 1;
  const w = rows[0].length;
  return rows.map((row, i) => {
    const dx = Math.round((floor - i) * k);
    if (!dx) return row;
    return dx > 0
      ? ('.'.repeat(dx) + row).slice(0, w)
      : (row.slice(-dx) + '.'.repeat(-dx));
  });
}

/**
 * Turn a figure a quarter-turn anticlockwise: it ends up lying with its head
 * to the LEFT and the side that was facing away from us underneath it.
 *
 * Anticlockwise rather than clockwise, and it matters for both fighters at once.
 * A fighter faces right in its own space, so its head going left is its head
 * going BACKWARDS — knocked over by whatever hit it. The duellist on the far
 * side of the road is drawn mirrored, so the same rotation reads as backwards
 * for him too, and one transform serves both.
 *
 * The result is `width` rows of `height` characters: a 16 x 24 man becomes a
 * 24 x 16 body.
 */
function rotateCCW(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const out = [];
  for (let i = 0; i < w; i++) {
    let line = '';
    for (let j = 0; j < h; j++) line += rows[j][w - 1 - i];
    out.push(line);
  }
  return out;
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

/**
 * The head with nothing on it: brow, eye, jaw, and eleven rows of empty
 * everywhere a garment can be.
 *
 * Rows 0..6 are headwear, 7..9 the face, 10 the collar. The wardrobe
 * (src/art/sprites-wardrobe.js) stamps a hat and a collar onto this, which is
 * how a sombrero is allowed to shade the brow and a kerchief is allowed to be
 * pulled up over the mouth — a hat that could only own rows 0..6 could never do
 * either.
 */
export const FACE = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....ksssssk.....',
  '....ksssksk.....',
  '....kdssssk.....',
  '................',
];

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

/**
 * THE FALL
 * ---------------------------------------------------------------------------
 * What a fighter does when the last diamond goes. It used to be nothing: the
 * bar hit zero, a banner said YOU WIN and the man across the road was still
 * standing in his idle loop underneath it, breathing, while the overview slid
 * up over him. The one thing a duel is about had no picture of itself.
 *
 * It is five frames, and every one of them is built out of the SAME head,
 * torso and legs the fighter has been wearing all fight — which is what makes
 * it adaptive without a line of art per archetype. The Sexton goes down as the
 * Sexton, in his own apron and his own brim; a wraith goes down in its rags.
 * Nobody had to draw either.
 *
 * The shape of it, and why:
 *
 *   `hit`     one frame of the stagger that already exists. A fall that starts
 *             from a standing idle reads as a sprite being switched
 *   `buckle`  the knees go: the whole body drops onto the last three rows of
 *             its own legs, which is a crouch for a man and a slump for
 *             anything with a hem
 *   `tip`     past the point of no return — the body leans a third of the way
 *             over, pivoting on the heels (`lean`)
 *   `over`    two thirds, and lifted a pixel: the feet have left the road
 *   `down`    the quarter-turn (`rotateCCW`). Head to the left, flat out, and
 *             this is the frame that holds — it is what is lying on the road
 *             when the player walks back out of the overview
 *
 * The gun is not in any of them. `GUN_TRACK.fall` is five nulls, so it leaves
 * the hand the moment the fall starts, which is the one detail that says the
 * fight is over rather than paused.
 */
export const FALL_FRAME_MS = [110, 130, 100, 100, 520];

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
 * THE TWO GUNS THE PLAYER EARNS
 * ---------------------------------------------------------------------------
 * The forge sells six improvements, and a gun that only changes COLOUR six
 * times is a gun that changes once — after the second finish the player stops
 * looking. So the silhouette is cut twice on the way up, and these are the
 * other two shapes it is cut into.
 *
 * Both are drawn to the same contract as the sixgun above: the bore runs two
 * rows above the hand pixel, so a longer gun still points where the arm points
 * and the muzzle anchors line up on the same track. That is the whole reason
 * the extra length is added AT THE MUZZLE END and the grip stays put — the
 * fighter's poses know where a fist is, and nothing here is allowed to move it.
 */

/**
 * Longer barrel, a front sight blade, and an ejector rod under the bore.
 *
 * Eight rows, exactly like the sixgun, and the grip pixel is in the same place
 * — all the extra gun is added at the muzzle end. That is not tidiness: the
 * poses know where a fist is, and a gun that grew a row at the top would hang
 * a pixel lower in every frame of the draw.
 */
const LONGBARREL = {
  level: {
    hand: { x: 2, y: 5 },
    muzzle: { x: 12, y: 3 },
    rows: [
      '..kk......k.',
      '.kggk....kgk',
      'kkggkkkkkkgk',
      'kgogggggggGk',
      'kgGGGGGGGGGk',
      '..TtkkkkkkGk',
      '.kTTk.......',
      '..kTk.......',
    ],
  },
  raised: {
    hand: { x: 2, y: 8 },
    muzzle: { x: 9, y: -1 },
    rows: [
      '........kk.',
      '.......kggk',
      '......kggk.',
      '.....kggk..',
      '....kggk...',
      '...kggk....',
      '..kggk.....',
      '.kgok......',
      '.kTtk......',
      '..kTk......',
    ],
  },
};

/**
 * The Nova frame: a ported rib with the gas holes cut through it, a flared
 * grip, and a round in the cylinder that is not a round.
 */
const NOVA = {
  level: {
    hand: { x: 2, y: 5 },
    muzzle: { x: 13, y: 3 },
    rows: [
      '..kk.....kkk.',
      '.kggk...kkggk',
      'kkggkkkkkkggk',
      'kgoggkgkgkggk',
      'kgGGGGGGGGGGk',
      '..TtkkkkkkkGk',
      '.kTTk...kGGk.',
      '..kTTk.......',
      '...kk........',
    ],
  },
  raised: {
    hand: { x: 2, y: 9 },
    muzzle: { x: 10, y: -1 },
    rows: [
      '.........kk.',
      '........kggk',
      '.......kggk.',
      '......kggk..',
      '.....kggk...',
      '....kggk....',
      '...kggk.....',
      '..kggk......',
      '.kgok.......',
      '.kTtk.......',
      '..kTTk......',
    ],
  },
};

/** Every silhouette a revolver in this game can have, by name. */
const GUN_SHAPES = {
  sixgun: REVOLVERS,
  longbarrel: LONGBARREL,
  nova: NOVA,
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
 * Baked revolver art for one finish, in one of the three silhouettes.
 *
 * The shape is a parameter because an enemy's gun says what its bullet costs
 * you now (see ENEMY_GUNS in src/game/gun-tiers.js): the same four metals, cut
 * from a short sixgun, a longbarrel or a Nova frame depending on how hard the
 * man holding it hits.
 *
 * @returns {Record<'level'|'raised', {sprite: HTMLCanvasElement, hand: {x,y}, muzzle: {x,y}}>}
 */
export function getRevolverSprites(finish = 'steel', shape = 'sixgun') {
  const cacheKey = `${finish}|${shape}`;
  if (gunCache.has(cacheKey)) return gunCache.get(cacheKey);
  const key = { ...GUN_KEY, ...(GUN_FINISHES[finish] || {}) };
  const out = {};
  for (const [name, def] of Object.entries(GUN_SHAPES[shape] || REVOLVERS)) {
    out[name] = { sprite: bake({ key, rows: def.rows }), hand: def.hand, muzzle: def.muzzle };
  }
  gunCache.set(cacheKey, out);
  return out;
}

const tierCache = new Map();

/**
 * The player's gun at one rung of the forge ladder.
 *
 * The ladder itself — which shape, which metal, what it throws off when it
 * fires — is data, and it lives in `src/game/gun-tiers.js`. This function is
 * only the press: it takes a shape name and a set of palette overrides and
 * hands back the same `{sprite, hand, muzzle}` pair the enemies' guns come in,
 * so the duel renderer never learns that the player's revolver is special.
 *
 * @param {{id: string, shape?: string, key?: Record<string, string>}} tier
 */
export function getTieredRevolver(tier) {
  const id = tier?.id || 'iron';
  if (tierCache.has(id)) return tierCache.get(id);
  const shape = GUN_SHAPES[tier?.shape] || REVOLVERS;
  const key = { ...GUN_KEY, ...(tier?.key || {}) };
  const out = {};
  for (const [name, def] of Object.entries(shape)) {
    out[name] = { sprite: bake({ key, rows: def.rows }), hand: def.hand, muzzle: def.muzzle };
  }
  tierCache.set(id, out);
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
  /** Nothing. A falling man is not holding his revolver any more. */
  fall: [null, null, null, null, null],
};

// ---------------------------------------------------------------------------
// THE VEST
//
// A bought Bulletproof Vest is a thing a man is WEARING, so it is drawn on
// him: a steel plate on two leather shoulder straps, laid over the torso rows
// of whatever fighter is carrying it. It is not part of any pose, because it
// has to survive every pose — the rig would need five more frame lists for one
// piece of kit, and an enemy in a vest would need five more again.
//
// The torso does move between frames, though. `settle()` drops the upper body
// a pixel on the loose half of the idle and walk cycles, and the first hit
// frame is knocked back one pixel, so the plate is drawn at the body's own
// offset for the frame that is up — VEST_TRACK below. Without that the vest
// floats over a breathing man like a sticker.
// ---------------------------------------------------------------------------

/**
 * The plate as it is worn: rows 11..16 of the 16 x 24 fighter, which is the
 * chest between the neckerchief and the gun belt. The buckle row is left
 * uncovered so the belt still reads.
 */
const VEST_WORN = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....kkkkkkkk....',
  '...kTggggggTk...',
  '...kTgGGGGgTk...',
  '...kTgGllGgTk...',
  '....kgGGGGgk....',
  '.....kGGGGk.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

/**
 * The same plate off the body and falling, with the round through the middle
 * of it. Cropped to its own 10 x 6 so it can tumble without dragging an empty
 * fighter-sized canvas around with it.
 */
const VEST_BROKEN = [
  '.kkkkkkkk.',
  'kTggggggTk',
  'kTgGkkGgTk',
  'kTgkKKkgTk',
  '.kgGkkGgk.',
  '..kGkkGk..',
];

let vestCache = null;

/**
 * The vest, worn and broken.
 * @returns {{worn: HTMLCanvasElement, broken: HTMLCanvasElement}}
 */
export function getVestSprites() {
  if (!vestCache) {
    vestCache = {
      worn: bake({ key: KEY, rows: VEST_WORN }),
      broken: bake({ key: KEY, rows: VEST_BROKEN }),
    };
  }
  return vestCache;
}

/**
 * How far the torso has moved from its standing position, per pose frame, in
 * source pixels. `null` means the vest is not drawn for that frame at all.
 *
 * These are read straight off `composeFighter`: the loose frames are the ones
 * built from `settle()` (one pixel down) and the first hit frame is the one
 * put through `shiftX(-1)`.
 */
export const VEST_TRACK = {
  idle: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
  walk: [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0 }],
  aim: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
  fire: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
  hit: [{ x: -1, y: 0 }, { x: 0, y: 1 }],
};

// ---------------------------------------------------------------------------
// RIDER — 16 x 21, the seated upper body drawn over the horse.
// ---------------------------------------------------------------------------

/**
 * Hips, thigh and the leg in the stirrup — four rows where the standing leg
 * has six, with the boot one row higher. The wardrobe dresses this block the
 * same way it dresses a walk pose (see the band maps in
 * src/art/sprites-wardrobe.js) and hands the result back as `parts.riderLegs`.
 */
export const RIDER_LEGS = [
  '...kbbbbbbbbk...',
  '....kbbbbbbbk...',
  '......kbbbbk....',
  '.......kBBBk....',
];

/**
 * The seated animation, built from the same head and torso the fighter is
 * standing in.
 *
 * A rider is a gunslinger with one row taken out of his middle: the torso loses
 * the row under the chest, which is the whole of "sitting down" at this size.
 * Because the parts come in rather than being typed here, whatever the player
 * is wearing rides with them — a rider in last season's serape while the man on
 * foot wears a duster is the kind of seam a wardrobe cannot have.
 */
function riderFrames(head, torso, legs) {
  const seated = stamp([...torso.slice(0, 3), ...torso.slice(4)], ['G'], 13, 5);
  const body = [...head, ...seated, ...(legs || RIDER_LEGS)];
  return {
    ride: [
      body,
      // Half a beat later the rider has posted out of the saddle by a pixel;
      // the leg in the stirrup stays put, which is what makes it read as
      // posting rather than as the whole sprite jittering.
      [...settle(body.slice(0, 18)), ...body.slice(18)],
    ],
  };
}

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
 * PUTTING TACK ON IT
 * ---------------------------------------------------------------------------
 * A harness is one piece of art — a bridle, the reins, a breast collar, a
 * girth, whatever else the rig carries — stamped over the horse's own frames
 * before they are baked. It is one stamp rather than a per-frame drawing for a
 * reason the animal makes for us: everything above the hocks is the SAME rows
 * in every frame (only the legs and the tail are re-stamped), so a strap typed
 * once lands on the same pixel of the same barrel in the walk, the gallop and
 * the idle — and it rises off the road with the horse in the airborne frames,
 * because the lift is applied at draw time to the whole sprite.
 *
 * The catalogue lives in src/art/sprites-wardrobe.js. This file only knows how
 * to put a stamp on a horse, which is the same deal it has with hats.
 *
 * @param {{rows?: string[], key?: object}|null} harness
 */
export function composeHorse(harness = null) {
  const key = harness?.key ? { ...KEY, ...harness.key } : KEY;
  const frames = {};
  for (const [name, list] of Object.entries(HORSE_FRAMES)) {
    frames[name] = harness?.rows
      ? list.map((rows) => stamp(rows, harness.rows, 0, 0))
      : list;
  }
  return bakeSet(frames, key);
}

/** One standing horse in a given harness — what a wardrobe card is a picture of. */
export function horseStill(harness = null) {
  const key = harness?.key ? { ...KEY, ...harness.key } : KEY;
  const rows = harness?.rows
    ? stamp(HORSE_FRAMES.idle[0], harness.rows, 0, 0)
    : HORSE_FRAMES.idle[0];
  return bake({ key, rows });
}

/** The bare animal's rows, for anything that needs its silhouette. */
export const HORSE_STILL_ROWS = HORSE_FRAMES.idle[0];

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
    /**
     * Going down. See the note over FALL_FRAME_MS.
     *
     * `buckle` drops the body onto the last three rows of its own legs and
     * pads the top back out, so the figure stays 24 rows tall and loses three
     * rows of shin — which is a fighter whose knees have gone, in whatever
     * that fighter has instead of knees.
     */
    fall: (() => {
      const buckled = ['................', '................', '................',
        ...upper, ...legs.stand.slice(0, 3)];
      /**
       * DOWN, AND IT IS STACKED RATHER THAN TURNED
       * ---------------------------------------------------------------------
       * The obvious way to lay a fighter out is to rotate the whole frame a
       * quarter turn, and the obvious way is wrong. It was tried: a hat brim is
       * thirteen pixels WIDE, so a rotated hat is a thirteen-pixel vertical
       * bar, the boots become two blocks, and the result reads as a cart. Turn
       * a sprite that was drawn from one angle and you get a sprite drawn from
       * no angle at all.
       *
       * So the body is COLLAPSED instead of turned, in the same three-quarter
       * view it has been in all fight: the legs fold out along the road, the
       * torso comes down on top of them, and the head lolls back over the
       * shoulder — three stamps of the fighter's own parts, at three offsets,
       * on the ground. Everything stays the way round it was drawn, so a hat is
       * still a hat, a ribcage is still a ribcage, and every archetype in the
       * game collapses in its own clothes without a line of art for any of them.
       */
      let heap = Array.from({ length: 24 }, () => '.'.repeat(16));
      heap = stamp(heap, legs.contactB.slice(1), 2, 19);
      heap = stamp(heap, flare, 0, 15);
      heap = stamp(heap, head, -3, 9);
      return [
        shiftX(recolor(holstered(standing(upper)), { P: 'p', p: 'q', q: 'w' }), -1),
        buckled,
        lean(buckled, 0.22),
        lean(buckled, 0.5),
        heap,
      ];
    })(),
  };

  const baked = bakeSet(frames, key);
  baked.finish = parts.gun || 'steel';
  baked.portrait = makePortrait(baked, baked.finish);
  return baked;
}

/**
 * One standing frame, holstered, baked on its own — and optionally cropped to a
 * band of rows.
 *
 * The wardrobe is the caller: a card showing one hat wants the head and the
 * brow under it, not a whole animation set, and baking five animations to throw
 * away 16 of the 17 frames is what it would otherwise cost. Same parts, same
 * stamping, same key as `composeFighter` — this is that function's first frame.
 *
 * @param {object} [parts] see `composeFighter`
 * @param {[number, number]|null} [crop] row range, from the top of the head
 */
export function fighterStill(parts = {}, crop = null) {
  const head = parts.head || HEAD;
  const torso = parts.torso || TORSO;
  const legs = parts.legs || LEGS;
  const holsterArt = parts.holster === undefined ? HOLSTER : parts.holster;
  const key = parts.key ? { ...KEY, ...parts.key } : KEY;
  let rows = [...head, ...torso, ...legs.stand];
  if (holsterArt) rows = stamp(rows, holsterArt, 13, 17);
  if (crop) rows = rows.slice(crop[0], crop[1]);
  return bake({ key, rows });
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

// ---------------------------------------------------------------------------
// WHAT THE PLAYER IS WEARING
//
// The rig has no opinion about it. `setPlayerParts` is handed a composed set of
// parts — a head with a hat on it, a torso, a leg set, a palette — by
// src/game/wardrobe.js, which is the only file that knows what a "hat" is. Pass
// nothing and you get the gunslinger the game shipped with.
//
// Everything that draws the player calls `getCharacterSprites()` and gets
// whatever is current, so a change of clothes reaches the menu backdrop, the
// road, the saddle and the duel without any of them subscribing to anything.
// The horse is cached per HARNESS: a new hat is no reason to re-bake a horse,
// and a new bridle is.
// ---------------------------------------------------------------------------

let playerParts = null;
let cache = null;
/**
 * Baked horses, one per harness. Keyed rather than single, because the horse is
 * still the most expensive thing the rig bakes and a change of hat is still no
 * reason to bake one again — but a change of TACK is, and there are only ever a
 * handful of harnesses in a session.
 */
const horseCache = new Map();

/**
 * Dress the player. Invalidates the baked set; the next draw re-bakes it.
 * @param {object|null} parts see `composeFighter`
 */
export function setPlayerParts(parts) {
  playerParts = parts || null;
  cache = null;
}

/** The seated half of an outfit, baked on its own. See `composeFighter`. */
export function composeRider(parts = {}) {
  return bakeSet(
    riderFrames(parts.head || HEAD, parts.torso || TORSO, parts.riderLegs),
    parts.key ? { ...KEY, ...parts.key } : KEY,
  );
}

/** The horse in a given harness, baked once per rig. */
export function horseSprites(harness = null) {
  const tackKey = harness?.id || 'bare';
  if (!horseCache.has(tackKey)) horseCache.set(tackKey, composeHorse(harness));
  return horseCache.get(tackKey);
}

/** Bake (once, per outfit) and return every character-side sprite set. */
export function getCharacterSprites() {
  if (cache) return cache;
  const parts = playerParts || {};
  cache = {
    player: composeFighter(parts),
    rider: composeRider(parts),
    horse: horseSprites(parts.harness || null),
  };
  return cache;
}
