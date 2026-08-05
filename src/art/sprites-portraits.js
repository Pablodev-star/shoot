/**
 * SHOOT! — Faces (Block 2e).
 *
 * A portrait is a character's face at 32 x 32 — four times the pixels their
 * head gets on the rig, and the only art in the game drawn for the purpose of
 * being looked at rather than played with.
 *
 * WHY NOT REUSE THE FIGHTER SPRITE
 * ---------------------------------------------------------------------------
 * The obvious thing to put in a speech box is the fighter's own portrait
 * (`composeFighter` already bakes one). It is the wrong picture for two
 * reasons. A fighter is 16 x 24 and their whole face is about 5 x 3 pixels of
 * it, so blown up to a talking head it is six flat squares — there is no
 * expression in it because there was never room for one. And a portrait is
 * seen at rest, close, for as long as somebody is speaking; a duel sprite is
 * seen mid-animation at arm's length. They want different drawings.
 *
 * So these are their own art, at their own resolution, sharing only the
 * palette. Every one is lit from the top left, carries an ink rim, and reads
 * at a glance as the fighter it belongs to.
 *
 * WHAT THEY ARE FOR
 * ---------------------------------------------------------------------------
 * Two things, and both of them want the same picture:
 *
 *   the speech box   src/ui/dialogue.js, at 3x, beside the line
 *   the cut-scene    src/duel/boss-intro.js, at 10x and higher, panned across
 *                    like a camera on a face
 *
 * The second is the demanding one. A face that will be shown ten times its own
 * size cannot rely on a lucky silhouette — the eyes have to hold up when they
 * are a foot across, which is why the Stranger's are drawn as lit sockets with
 * a hard core and a soft corona rather than as two bright dots.
 */

import { PALETTE } from './palette.js';
import { bake } from './pixel.js';

export const PORTRAIT_SIZE = 32;

/**
 * The portrait key. Local to this file, like the item icons' and the rig's —
 * a portrait is drawn in a different vocabulary from a landscape and sharing a
 * key with one would mean sharing its compromises.
 */
const KEY = {
  '.': null,
  k: PALETTE.ink,
  K: PALETTE.inkSoft,
  // The void: the cowl, and what is inside it
  c: PALETTE.cosmic,
  C: PALETTE.cosmicHigh,
  u: PALETTE.purpleDark,
  U: PALETTE.purple,
  // Cold light — eyes, cracks, and anything burning out here
  a: PALETTE.astral,
  A: PALETTE.astralLight,
  s: PALETTE.star,
  W: PALETTE.white,
  b: PALETTE.blueLight,
  // Bone
  n: PALETTE.bone,
  N: PALETTE.boneDark,
  g: PALETTE.grey,
  // Warm, for the faces that have blood in them
  d: PALETTE.skin,
  D: PALETTE.skinDark,
  h: PALETTE.leather,
  H: PALETTE.leatherDark,
  r: PALETTE.red,
  R: PALETTE.redDark,
  w: PALETTE.boneDark,
};

export const PORTRAITS = {
  /**
   * THE STRANGER, phase one — the cowl.
   *
   * There is no face in it. The hood is drawn in full, lit down its left
   * shoulder, and where a face should be there is a hole with a sky in it: the
   * interior is the darkest colour in the palette, with three or four stars in
   * it and two burning sockets that are not eyes so much as places where the
   * dark is thinner.
   *
   * The single decision that makes it work is that the eyes are NOT at the
   * centre of the opening. They sit high and slightly apart, so the space under
   * them reads as a jaw you cannot see — an empty hood with two dots in the
   * middle reads as a bag with holes in it.
   */
  strangerCowl: [
    '............kkkkkkkk............',
    '.........kkkUUUUUUUUkkk.........',
    '.......kkUUUUUUUUUUUUUUkk.......',
    '......kUUUUUUuuuuuuUUUUUUk......',
    '.....kUUUUuuuuuuuuuuuuuuUUUk....',
    '....kUUUuuuuuuuuuuuuuuuuuuUUk...',
    '...kUUuuuuuuCCCCCCCCuuuuuuuUUk..',
    '...kUuuuuuCCCCCCCCCCCCuuuuuuUk..',
    '..kUuuuuCCCCCCCCCCCCCCCCuuuuuUk.',
    '..kUuuuCCCCCCCCCCCCCCCCCCuuuuUk.',
    '.kUuuuCCCCCCCCsCCCCCCCCCCCuuuuUk',
    '.kUuuCCCCCCCCCCCCCCCCCCCCCCuuuUk',
    '.kUuuCCCCCCCCCCCCCCCCCCCCCCuuuUk',
    '.kUuCCCCCaaaaCCCCCCaaaaCCCCCuUk.',
    '.kUuCCCCaAWWAaCCCCaAWWAaCCCCuUk.',
    '.kUuCCCCCaaaaCCCCCCaaaaCCCCCuUk.',
    '.kUuuCCCCCCCsCCCCCCCCCCCCCCuuUk.',
    '.kUuuCCCCCCCCCCCCCCCCCCCCCCuuUk.',
    '..kUuuCCCCCCCCCCCCCCCCCCCCuuUk..',
    '..kUuuuCCCCCCCCCCCCCCCCCCuuuUk..',
    '...kUuuuCCCCCCCCsCCCCCCCCuuuUk..',
    '...kUuuuuCCCCCCCCCCCCCCuuuuuUk..',
    '....kUuuuuuCCCCCCCCCCuuuuuuUk...',
    '....kUuuuuuuuuCCCCuuuuuuuuuUk...',
    '...kUuuuuuuuuuuuuuuuuuuuuuuuUk..',
    '..kUuuuuuucccccccccccccuuuuuuUk.',
    '..kUuuucccccccccccccccccccuuuUk.',
    '.kUuucccccccccccccccccccccccuuUk',
    '.kUucccccccccccccccccccccccccuUk',
    '.kUcccccccccccccccccccccccccccUk',
    'kUcccccccccccccccccccccccccccccU',
    'kcccccccccccccccccccccccccccccck',
  ],

  /**
   * THE STRANGER, phase two — unmasked.
   *
   * The cowl is off and what is under it is a skull with a star inside it. The
   * bone is drawn cold — `star` cream on the lit side, `boneDark` on the shade
   * — and every crack in it has light coming out, which is the one idea the
   * whole design rests on: this is not a dead thing, it is a container that has
   * failed.
   *
   * It is deliberately NOT symmetrical. The left brow is broken away and the
   * light behind it is escaping through the gap, so the face has a side it is
   * losing. A perfectly symmetrical skull is a logo.
   */
  strangerSkull: [
    '.........kkkkkkkkkkkkk..........',
    '.......kknnnnnnnnnnnnnkk........',
    '.....kknnnnnnnnnnnnnnnnnkk......',
    '....knnnnnnnnnnnnnnnnnnnnNk.....',
    '...knnnnnnnnnnnnnnnnnnnnnNNk....',
    '...knnnnnnnnnnnnnnnnnnnnnNNNk...',
    '..knnnAknnnnnnnnnnnnnnnnnnNNNk..',
    '..knnnkAknnnnnnnnnnnnnnnnnNNNNk.',
    '..knnnnkAknnnnnnnnnnnnnnnnNNNNk.',
    '.knnnnnnkAknnnnnnnnnnnnnnnNNNNk.',
    '.knnnnnnnkAknnnnnnnnnnnnnnNNNNk.',
    '.kNnnnnnnnkkknnnnnnnnnnnnnNNNNk.',
    '.kkkkkkknnnnnnnnnnnnkkkkkkkNNNk.',
    'kCCCCCCkknnnnnnnnnnkkCCCCCCkNNNk',
    'kCaaaaACkknnnnnnnnkkCAaaaaaCkNNk',
    'kCaAWAaaCCknnnnnnkCCaaAWAaaCkNNk',
    'kCCaAWAaaCknnnnnnkCaaAWAaCCkkNNk',
    'kkCCaaaaCCkknnnnkkCCaaaaCCkknNNk',
    '.kkCCCCCCkknnnnnnkkCCCCCCkknNNk.',
    '..kkkkkkknnnnnnnnnnkkkkkkknNNNk.',
    '..knnnnnnnnnnkkknnnnnnnnnnNNNNk.',
    '..knnnnnnnnnkCakCknnnnnnnnNNNNk.',
    '...knnnnnnnnkCCaCCknnnnnnnNNNk..',
    '...knnnnnnnnnkCCCknnnnnnnNNNNk..',
    '....knnnnnnnnnkkknnnnnnnNNNNk...',
    '....kknnnnnnnnnnnnnnnnnNNNNkk...',
    '.....kknkkkkkkkkkkkkkkNNNNkk....',
    '......knknknknknknknkkNNNNk.....',
    '......kknkkkkkkkkkkkkNNNNk......',
    '.......kknknknknknkkNNNNk.......',
    '........kkNNNNNNNNNNNNkk........',
    '..........kkkkkkkkkkkk..........',
  ],

  /**
   * THE PLAYER.
   *
   * Here so that the speech system has both halves of a conversation the day
   * it is first used, rather than the day somebody needs it. Same hat, same
   * kerchief and same serape as the fighter sprite, drawn at a size where the
   * face under the brim is a face.
   */
  gunslinger: [
    '..........kkkkkkkkkkkk..........',
    '........kkHHHHHHHHHHHHkk........',
    '.......kHHHHHHHHHHHHHHHHk.......',
    '.......kHHhhhhhhhhhhhhHHk.......',
    '.......kHhhhhhhhhhhhhhhHk.......',
    '....kkkkHhhhhhhhhhhhhhhhkkkk....',
    '..kkHHHHHHHHHHHHHHHHHHHHHHHHkk..',
    '.kHHHHHHHHHHHHHHHHHHHHHHHHHHHHk.',
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
    '........kddddddddddddddk........',
    '.......kdddddddddddddddDk.......',
    '.......kddddddddddddddDDk.......',
    '.......kdkkkddddddkkkddDk.......',
    '.......kdkWkddddddkWkddDk.......',
    '.......kdkkkddddddkkkddDk.......',
    '.......kdddddddddddddDDDk.......',
    '.......kddddddkkddddddDDk.......',
    '.......kdddddddddddddDDDk.......',
    '.......kDddddddddddddDDDk.......',
    '.......kDDdddddddddddDDDk.......',
    '.......kkDDDddddddddDDDkk.......',
    '......kwwkkDDDDDDDDDDkkwwk......',
    '.....kwwwwwkkkkkkkkkkwwwwwk.....',
    '....kwwwwwwwwwwwwwwwwwwwwwwk....',
    '...krrrrrrrrrrrrrrrrrrrrrrrrk...',
    '..krrrrrrrrrrrrrrrrrrrrrrrrrrk..',
    '..krrrrwwwwwwwwwwwwwwwwwwrrrrk..',
    '.krrrrrwwwwwwwwwwwwwwwwwwrrrrrk.',
    '.krrrrrrrrrrrrrrrrrrrrrrrrrrrrk.',
    '.kRRRRRRRRRRRRRRRRRRRRRRRRRRRRk.',
    '.kRRRRRRRRRRRRRRRRRRRRRRRRRRRRk.',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  ],
};

const cache = new Map();

/**
 * Bake (once) and return a portrait canvas.
 * @param {keyof PORTRAITS} id
 * @returns {HTMLCanvasElement|null} null for an unknown id, so a missing
 *   portrait is a speech box without a face rather than a crash mid-scene.
 */
export function getPortrait(id) {
  if (!PORTRAITS[id]) return null;
  if (!cache.has(id)) cache.set(id, bake({ key: KEY, rows: PORTRAITS[id] }));
  return cache.get(id);
}

export const PORTRAIT_IDS = Object.keys(PORTRAITS);
