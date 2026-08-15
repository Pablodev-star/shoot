/**
 * SHOOT! — The wardrobe (Block 2f).
 *
 * Every garment the player can put on, drawn to the same contract as the rest
 * of the character art: 16 source pixels wide, a 1px ink outline, one light
 * source at the top left.
 *
 * WHY A GARMENT IS NOT A PALETTE SWAP
 * ---------------------------------------------------------------------------
 * The cheap version of a wardrobe is one hat in nine colours. It is cheap for
 * a reason: at 16 pixels the SILHOUETTE is nearly all the information a sprite
 * carries, so nine colours of the same shape is one hat that the player stops
 * looking at after the second one. Everything here changes shape. A sombrero is
 * wider than the man and shades his brow; a stovepipe is tall and narrow; an
 * ushanka has flaps down beside the face; the Basin helm has horns off the top
 * corners of the sprite. You can tell what somebody is wearing from across the
 * road, which is the whole point of earning it.
 *
 * HOW A GARMENT IS PUT ON
 * ---------------------------------------------------------------------------
 * The rig in src/art/sprites-character.js already builds a fighter out of a
 * head, a torso and a leg set (`composeFighter`) — it is how every enemy in the
 * game is drawn. A player outfit is exactly that, assembled from four pieces:
 *
 *   HAT    11 rows, STAMPED over the bare face. Rows 0..6 are headwear, but a
 *          hat is handed the whole head so it may shade the brow (sombrero),
 *          hang flaps beside the jaw (ushanka) or pull a kerchief up over the
 *          mouth (road agent). Anything it leaves as '.' shows the face.
 *   SHIRT  a collar row (row 10) + a 7-row torso + the hem it kicks out to
 *          mid-stride. The belt row at the bottom belongs to the shirt, so a
 *          coat can carry its own buckle.
 *   PANTS  a hip row + a palette + an optional transform over the leg poses.
 *   BOOTS  a palette + an optional transform. Boots are applied AFTER the
 *          trousers, so a tall boot is free to swallow the shin the trousers
 *          just painted.
 *
 * The transforms are why the trousers are not colour swaps either. A leg pose
 * is six rows and the legs move between poses, so a garment cannot simply type
 * pixels at fixed coordinates — the helpers below FIND the legs in whatever
 * pose they are in (`legRuns`) and hang fringe, seams, studs, cuffs and spurs
 * off them. One description, five poses, and the fringe lands on the leg in
 * every one of them.
 *
 * ONE CHARACTER, ONE SLOT
 * ---------------------------------------------------------------------------
 * Each slot owns two palette characters of its own — `a A` for hats, `f F` for
 * shirts, `c C` for trousers, `v V` for boots, `j J i` for tack (see KEY in
 * sprites-character.js) — plus the ones the rig already gives that part of the
 * body. No garment may write another slot's characters, which is what lets any
 * hat be worn with any shirt without the two of them arguing over what colour
 * brass is.
 *
 * THE FIFTH SLOT IS NOT ON THE MAN
 * ---------------------------------------------------------------------------
 * A HARNESS is the tack the horse wears, and it is the one garment in here that
 * is worn by something else. It works the same way everything above does — a
 * description stamped onto a rig at composition time — but it goes onto the
 * horse's frames rather than the fighter's (`composeHorse` in
 * sprites-character.js), which means it animates with the animal: it walks, it
 * gallops, and it leaves the road in the airborne frames without a line of code
 * knowing what a bridle is.
 *
 * Two things about harnesses that the other four slots do not have:
 *
 *   - they come WHOLE. A hat is a hat and a shirt is a shirt, but a rig is a
 *     bridle and reins and a breast collar and a girth, and nobody has ever
 *     wanted to wear one make of bridle with another make of girth. So a
 *     harness is one piece of art, bought and worn as one thing.
 *   - one of them is nothing at all. `none` is a real choice with a real name:
 *     the horse the game shipped with, in its own saddle and no tack over it.
 */

import { PALETTE } from './palette.js';
import { bake } from './pixel.js';
import {
  FACE,
  LEGS,
  RIDER_LEGS,
  TORSO,
  HORSE_STILL_ROWS,
  stamp,
  fighterStill,
  horseStill,
} from './sprites-character.js';

/** What an outfit is, and what you are wearing before you have earned a thing. */
export const DEFAULT_OUTFIT = {
  hat: 'trail',
  shirt: 'serape',
  pants: 'trail',
  boots: 'trail',
  horse: 'trail',
};

export const OUTFIT_SLOTS = ['hat', 'shirt', 'pants', 'boots', 'horse'];

// ---------------------------------------------------------------------------
// Leg helpers
//
// A leg pose is 6 rows: the hip band, three rows of shin, the boot and the
// sole. The legs move sideways between poses, so everything below works by
// FINDING them rather than by typing coordinates.
// ---------------------------------------------------------------------------

/** The column spans the legs occupy in one row, ignoring their ink outline. */
function legRuns(row, chars = 'bB') {
  const runs = [];
  let start = -1;
  for (let x = 0; x <= row.length; x++) {
    const solid = x < row.length && chars.includes(row[x]);
    if (solid && start < 0) start = x;
    else if (!solid && start >= 0) {
      runs.push([start, x - 1]);
      start = -1;
    }
  }
  return runs;
}

function setAt(row, x, char) {
  if (x < 0 || x >= row.length) return row;
  if (row[x] !== '.') return row;
  return row.slice(0, x) + char + row.slice(x + 1);
}

function paint(row, x, char) {
  if (x < 0 || x >= row.length) return row;
  return row.slice(0, x) + char + row.slice(x + 1);
}

/**
 * Hang something off the OUTSIDE of the legs — fringe on a pair of chaps, the
 * spur behind a heel. The leftmost leg gets it on its left, the rightmost on
 * its right, so a walk cycle never grows a fringe up the inside of a thigh.
 */
function outside(rows, indexes, char) {
  return rows.map((row, y) => {
    if (!indexes.includes(y)) return row;
    const runs = legRuns(row);
    if (!runs.length) return row;
    let out = setAt(row, runs[0][0] - 2, char);
    out = setAt(out, runs[runs.length - 1][1] + 2, char);
    return out;
  });
}

/** A seam up the outer edge of each leg: the stripe on a gambler's trousers. */
function seam(rows, indexes, char) {
  return rows.map((row, y) => {
    if (!indexes.includes(y)) return row;
    const runs = legRuns(row);
    if (runs.length < 1) return row;
    let out = paint(row, runs[0][0], char);
    out = paint(out, runs[runs.length - 1][1], char);
    return out;
  });
}

/** A mark on the INNER face of each leg — rivets, cinders, a scatter of stars. */
function studs(rows, indexes, char) {
  return rows.map((row, y) => {
    if (!indexes.includes(y)) return row;
    const runs = legRuns(row);
    if (runs.length < 2) return row;
    let out = paint(row, runs[0][1], char);
    out = paint(out, runs[runs.length - 1][0], char);
    return out;
  });
}

/** Swap one character for another on the given rows. */
function tint(rows, indexes, from, to) {
  return rows.map((row, y) => (indexes.includes(y) ? row.split(from).join(to) : row));
}

/**
 * Raise the boot line: a riding boot swallows the shin the trousers just
 * painted, and a wader takes the calf above it as well.
 */
const bootTops = (rows, band, height = 1) =>
  tint(rows, height >= 2 ? [...band.calf, ...band.shin] : band.shin, 'b', 'B');

/**
 * WHICH ROW IS A KNEE
 * ---------------------------------------------------------------------------
 * A garment says where its fringe hangs by naming a part of the leg, never a
 * row number, because THE PLAYER HAS TWO SETS OF LEGS. On foot they are the six
 * rows of a walk pose; in the saddle they are four, seated and foreshortened,
 * with the boot one row higher. A transform written against row 3 would put a
 * spur through a horse's ribs.
 *
 * So every transform takes a band map, and there is one of these per leg block.
 * Chaps are fringed down the thigh in both of them, and neither of them had to
 * be told what a thigh is.
 */
const STAND_BANDS = {
  top: [1], upper: [1, 2], lower: [2, 3], thigh: [1, 2, 3], calf: [2], shin: [3], boot: [4],
};
const RIDE_BANDS = {
  top: [1], upper: [1], lower: [1, 2], thigh: [1, 2], calf: [1], shin: [2], boot: [3],
};

// ---------------------------------------------------------------------------
// HATS — 11 rows, stamped over the bare face.
// ---------------------------------------------------------------------------

export const HATS = {
  /** The one everybody starts in. Sun-bleached felt, a working brim. */
  trail: {
    key: { h: PALETTE.leatherDark, H: PALETTE.leather },
    rows: [
      '................',
      '.....kkkkk......',
      '....kHHHHHk.....',
      '....khhhhhk.....',
      '..kkkhhhhhkkkk..',
      '.kHHHHHHHHHHHk..',
      '.kkkkkkkkkkkkk..',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  /**
   * A lawman's hat: pale felt, a taller crown with the pinch showing down the
   * middle of it, and a brass band. The height is the tell — it stands a row
   * further off the head than anything else on the road.
   */
  sheriff: {
    key: { h: PALETTE.boneDark, H: PALETTE.bone, a: PALETTE.gold, A: PALETTE.goldDark },
    rows: [
      '.....kkkkk......',
      '....kHHHHHk.....',
      '....kHhhhHk.....',
      '....kaaaaak.....',
      '..kkkAaaaAkkkk..',
      '.kHHHHHHHHHHHk..',
      '.kkkkkkkkkkkkk..',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  /**
   * Wider than the man. The brim runs the full 16 columns and comes down over
   * the brow, so the eyes sit in its shadow — the only hat in the set that
   * changes the FACE as well as the head.
   */
  sombrero: {
    key: { h: PALETTE.sandDark, H: PALETTE.sand, a: PALETTE.red, A: PALETTE.redDark },
    rows: [
      '................',
      '.....kkkkk......',
      '....khhhhhk.....',
      '....khhhhhk.....',
      '.kkkkhhhhhkkkkk.',
      'kHHHHHHHHHHHHHHk',
      'kaHHHHHHHHHHHHak',
      '.kkkkkkkkkkkkkk.',
      '................',
      '................',
      '................',
    ],
  },

  /** Silk stovepipe and a narrow brim. A man who is not planning to be in the sun. */
  tophat: {
    key: { h: PALETTE.charDark, H: PALETTE.char, a: PALETTE.redDark, A: PALETTE.red },
    rows: [
      '....kkkkkkk.....',
      '....khhhhhk.....',
      '....khhhhhk.....',
      '....kaaaaak.....',
      '..kkkhhhhhkkk...',
      '..kHHHHHHHHHk...',
      '..kkkkkkkkkkk...',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  /** Whitecrown fur, with the flaps down. They hang either side of the jaw. */
  fur: {
    key: { h: PALETTE.greyDark, H: PALETTE.boneDark },
    rows: [
      '................',
      '....kkkkkkk.....',
      '...kHHHHHHHk....',
      '..kHhhhhhhhHk...',
      '.kHhhhhhhhhhHk..',
      '.kHHHHHHHHHHHk..',
      '.kkkHHHHHHHkkk..',
      '..kHk.....kHk...',
      '..kHk.....kHk...',
      '..kkk.....kkk...',
      '................',
    ],
  },

  /** Basin iron, and the two horns that come off the top corners of the sprite. */
  horns: {
    key: { h: PALETTE.char, H: PALETTE.charLight, a: PALETTE.boneDark, A: PALETTE.bone },
    rows: [
      'kk............kk',
      'kak..........kak',
      '.kak........kak.',
      '.kaakkkkkkkkaak.',
      '.kkhhhhhhhhhhkk.',
      '..kHHHHHHHHHHk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  /** A circlet of void iron, and a ring of starlight that does not touch it. */
  starcrown: {
    key: { h: PALETTE.voidRock, H: PALETTE.voidRockLight, a: PALETTE.star, A: PALETTE.astral },
    rows: [
      '....kaaaaak.....',
      '....kA...Ak.....',
      '.....kaaak......',
      '................',
      '..kkkkkkkkkkk...',
      '..khhhaAahhhk...',
      '..kkkkkkkkkkk...',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  /** The working hat with a kerchief pulled up over the mouth. */
  bandana: {
    key: { h: PALETTE.woodDeep, H: PALETTE.woodDark, a: PALETTE.red, A: PALETTE.redDark },
    rows: [
      '................',
      '.....kkkkk......',
      '....kHHHHHk.....',
      '....khhhhhk.....',
      '..kkkhhhhhkkkk..',
      '.kHHHHHHHHHHHk..',
      '.kkkkkkkkkkkkk..',
      '................',
      '................',
      '...kaaaaaaak....',
      '....kaaaaak.....',
    ],
  },

  // --- Bought, never earned ------------------------------------------------
  //
  // Everything from here down is sold over a counter and hangs on no
  // achievement at all — see the note over the tailor's stock in
  // src/game/wardrobe.js. They are LAST in the drawer on purpose: the road's
  // own rewards keep the order the road hands them out in, and the shop's
  // stock is a shelf at the end of it rather than a run of new gaps in the
  // middle of a list the player has been filling in for weeks.

  /** A town derby. Low, round, and completely out of place on a horse. */
  bowler: {
    key: { h: PALETTE.charDark, H: PALETTE.char, a: PALETTE.leatherDark },
    rows: [
      '................',
      '................',
      '.....kkkkk......',
      '....kHHHHHk.....',
      '...khhhhhhhk....',
      '..kkhhhhhhhkk...',
      '..kaaaaaaaaak...',
      '.kHHHHHHHHHHHk..',
      '.kkkkkkkkkkkkk..',
      '................',
      '................',
    ],
  },

  /**
   * A cavalry campaign hat: crossed sabres in brass on the front of a crown
   * pinched into four, and the brim turned up on the near side.
   */
  cavalry: {
    key: { h: PALETTE.blueDark, H: PALETTE.blue, a: PALETTE.goldLight, A: PALETTE.goldDark },
    rows: [
      '................',
      '.....kkkkk......',
      '....kHhhhHk.....',
      '....kHhhhHk.....',
      '....kaAaAak.....',
      '..kkkhhhhhkkkk..',
      '.kHHHHHHHHHHHk..',
      '.kkkkkkkkkkkkk..',
      '....k.......k...',
      '................',
      '................',
    ],
  },

  /**
   * A trader's headwrap out of the deep desert: cloth over the crown with the
   * tail of it left hanging down the near side of the jaw.
   */
  nomad: {
    key: { h: PALETTE.sandDeep, H: PALETTE.sand, a: PALETTE.bogLight },
    rows: [
      '................',
      '....kkkkkkk.....',
      '...kHHHHHHHk....',
      '...khhhhhhhk....',
      '..kkHHHHHHHkk...',
      '.kaaaaaaaaaaak..',
      '.kkkkkkkkkkkkk..',
      '..........kHk...',
      '..........kHk...',
      '..........khk...',
      '..........kkk...',
    ],
  },

  /** Undertaker's Sunday: crepe over a tall crown, and a mourning band. */
  mourning: {
    key: { h: PALETTE.ink, H: PALETTE.charDark, a: PALETTE.greyDark, A: PALETTE.grey },
    rows: [
      '....kkkkkkk.....',
      '....khhhhhk.....',
      '....khhhhhk.....',
      '....khhhhhk.....',
      '....kaAAAak.....',
      '..kkkhhhhhkkk...',
      '..kHHHHHHHHHk...',
      '..kkkkkkkkkkk...',
      '................',
      '................',
      '................',
    ],
  },

  /** Rail Baron: a peaked company cap with the road's badge on the band. */
  rail: {
    key: { h: PALETTE.steelDark, H: PALETTE.steel, a: PALETTE.gold, A: PALETTE.goldDark },
    rows: [
      '................',
      '................',
      '....kkkkkkk.....',
      '...kHHHHHHHk....',
      '...khhhhhhhk....',
      '...kAaAaAaAk....',
      '..kkkkkkkkkkkk..',
      '..kHHHHHHHHHHk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
    ],
  },
};

// ---------------------------------------------------------------------------
// SHIRTS — a collar row, a 7-row torso, and the hem it kicks out to mid-stride.
//
// Row 6 of every torso is the gun belt. It belongs to the shirt so a coat can
// carry its own buckle, and every one of them keeps the belt in the same place:
// the holster is stamped onto the hip by the rig and does not move for fashion.
// ---------------------------------------------------------------------------

/** '...k' + 8 + 'k...' — the collar and the top and bottom rows of a torso. */
const narrow = (interior) => `...k${interior}k...`;
/** '..k' + 10 + 'k..' — the chest rows. */
const wide = (interior) => `..k${interior}k..`;

const BELT = narrow('TttllttT');

/**
 * @param {object} def
 * @param {string} def.collar 8 interior characters
 * @param {string[]} def.chest rows 0..5 of the torso, interior only
 * @param {string} def.hem    the 10-wide hem the torso kicks out to on the loose
 *                            half of a stride
 */
function shirt(def) {
  const torso = [
    narrow(def.chest[0]),
    wide(def.chest[1]),
    wide(def.chest[2]),
    wide(def.chest[3]),
    wide(def.chest[4]),
    narrow(def.chest[5]),
    BELT,
  ];
  return {
    key: def.key,
    collar: narrow(def.collar),
    torso,
    flare: stamp(torso, [wide(def.hem)], 0, 5),
  };
}

export const SHIRTS = {
  /** The red serape, with the cream stripe that stops it reading as one block. */
  serape: shirt({
    key: {
      p: PALETTE.red, P: PALETTE.redDark, q: PALETTE.redLight,
      w: PALETTE.bone, W: PALETTE.boneDark,
      t: PALETTE.leather, T: PALETTE.leatherDark, l: PALETTE.gold,
    },
    collar: 'pqqqqqqp',
    chest: ['qqqqqqqq', 'qppppppppq', 'pwwwwwwwwp', 'pPPPPPPPPp', 'spPPPPPPps', 'PPPPPPPP'],
    hem: 'PPPPPPPPPP',
  }),

  /** A long oilskin coat worn open over a shirt. The tails swing on the stride. */
  duster: shirt({
    key: {
      p: PALETTE.leather, P: PALETTE.leatherDark, q: PALETTE.woodLight,
      w: PALETTE.boneDark, W: PALETTE.bone,
      t: PALETTE.woodDark, T: PALETTE.woodDeep, l: PALETTE.steel,
    },
    collar: 'pwwwwwwp',
    chest: ['pppppppp', 'pPwwwwwwPp', 'pPPwwwwPPp', 'pPPwwwwPPp', 'spPwwwwPps', 'PPPPPPPP'],
    hem: 'PPPPPPPPPP',
  }),

  /** Town waistcoat, clean shirt, and a star over the heart. */
  sheriffVest: shirt({
    key: {
      p: PALETTE.woodDark, P: PALETTE.woodDeep, q: PALETTE.wood,
      w: PALETTE.bone, W: PALETTE.boneDark,
      f: PALETTE.goldLight, F: PALETTE.goldDark,
      t: PALETTE.leatherDark, T: PALETTE.woodDeep, l: PALETTE.gold,
    },
    collar: 'wwwwwwww',
    chest: ['pppppppp', 'pPwwwwwwPp', 'pPffwwwwPp', 'pPFfwwwwPp', 'spPwwwwPps', 'PPPPPPPP'],
    hem: 'PPPPPPPPPP',
  }),

  /** Black waistcoat, boiled shirt, and a watch chain swagged across it. */
  gambler: shirt({
    key: {
      p: PALETTE.charLight, P: PALETTE.charDark, q: PALETTE.grey,
      w: PALETTE.white, W: PALETTE.boneDark,
      f: PALETTE.gold, F: PALETTE.goldDark,
      t: PALETTE.charDark, T: PALETTE.ink, l: PALETTE.goldLight,
    },
    collar: 'wwwwwwww',
    chest: ['pppppppp', 'pPPwwwwPPp', 'pPfwwwwfPp', 'pPPfwwfPPp', 'spPPffPPps', 'PPPPPPPP'],
    hem: 'PPPPPPPPPP',
  }),

  /** Whitecrown quilting under a fur ruff, and fur again at the hem. */
  parka: shirt({
    key: {
      p: PALETTE.snowShade, P: PALETTE.snowDeep, q: PALETTE.snowMid,
      w: PALETTE.snow, W: PALETTE.snowMid,
      f: PALETTE.bone, F: PALETTE.boneDark,
      t: PALETTE.greyDark, T: PALETTE.ink, l: PALETTE.steel,
    },
    collar: 'ffffffff',
    chest: ['pppppppp', 'pffffffffp', 'pPPPPPPPPp', 'pPPffffPPp', 'spPPffPPps', 'PffffffP'],
    hem: 'PffffffffP',
  }),

  /** Basin char, with the fire still in the seams of it. */
  ember: shirt({
    key: {
      p: PALETTE.char, P: PALETTE.charDark, q: PALETTE.charLight,
      w: PALETTE.sulfur, W: PALETTE.sulfurLight,
      f: PALETTE.magma, F: PALETTE.magmaDeep,
      t: PALETTE.charDark, T: PALETTE.ink, l: PALETTE.emberGlow,
    },
    collar: 'pPPPPPPp',
    chest: ['qqqqqqqq', 'qppppppppq', 'pPffffffPp', 'pPPfPPfPPp', 'spPfPPfPps', 'PPffffPP'],
    hem: 'PPffffffPP',
  }),

  /** Cloth off the far side of the last horizon, with the sky still in it. */
  voidrobe: shirt({
    key: {
      p: PALETTE.voidRock, P: PALETTE.voidRockDark, q: PALETTE.voidRockLight,
      w: PALETTE.astral, W: PALETTE.astralDark,
      f: PALETTE.star, F: PALETTE.astralLight,
      t: PALETTE.cosmic, T: PALETTE.cosmicHigh, l: PALETTE.astralLight,
    },
    collar: 'pqqqqqqp',
    chest: ['qqqqqqqq', 'qppfpppppq', 'pppppfpppp', 'pPPPfPPPPp', 'spPPPPfPps', 'PPPfPPPP'],
    hem: 'PPfPPPPfPP',
  }),

  /** Six of them are in the ground. This is what the seventh wears. */
  bones: shirt({
    key: {
      p: PALETTE.inkSoft, P: PALETTE.inkSoft, q: PALETTE.greyDark,
      w: PALETTE.bone, W: PALETTE.boneDark,
      f: PALETTE.bone, F: PALETTE.boneDark,
      t: PALETTE.greyDark, T: PALETTE.ink, l: PALETTE.bone,
    },
    collar: 'PffffffP',
    chest: ['PPPPPPPP', 'PffffffffP', 'PPffffffPP', 'PffffffffP', 'sPPffffPPs', 'PPffffPP'],
    hem: 'PffffffffP',
  }),

  // --- Bought, never earned ------------------------------------------------

  /** Mule-train wool: broad bands, worn over the head and never buttoned. */
  poncho: shirt({
    key: {
      p: PALETTE.bogDark, P: PALETTE.bogDeep, q: PALETTE.bog,
      w: PALETTE.sandLight, W: PALETTE.sandDark,
      f: PALETTE.sand, F: PALETTE.sandDark,
      t: PALETTE.leatherDark, T: PALETTE.woodDeep, l: PALETTE.sandDark,
    },
    collar: 'pqqqqqqp',
    chest: ['qqqqqqqq', 'qwwwwwwwwq', 'pPPPPPPPPp', 'pwwwwwwwwp', 'spPPPPPPps', 'PwwwwwwP'],
    hem: 'PwwwwwwwwP',
  }),

  /** A cardsharp's brocade waistcoat, over sleeves nobody paid for. */
  brocade: shirt({
    key: {
      p: PALETTE.purpleDark, P: PALETTE.purpleDark, q: PALETTE.purple,
      w: PALETTE.boneDark, W: PALETTE.bone,
      f: PALETTE.goldLight, F: PALETTE.goldDark,
      t: PALETTE.charDark, T: PALETTE.ink, l: PALETTE.gold,
    },
    collar: 'wwwwwwww',
    chest: ['qqqqqqqq', 'qwPfPfPfwq', 'pwPfPfPfwp', 'pwfPfPfPwp', 'spwPfPfwps', 'PfPfPfPf'],
    hem: 'PfPfPfPfPP',
  }),

  /** Undertaker's Sunday: a buttoned frock coat, black on black. */
  mourning: shirt({
    key: {
      p: PALETTE.charDark, P: PALETTE.ink, q: PALETTE.char,
      w: PALETTE.boneDark, W: PALETTE.bone,
      f: PALETTE.greyDark, F: PALETTE.grey,
      t: PALETTE.ink, T: PALETTE.ink, l: PALETTE.greyDark,
    },
    collar: 'pwwwwwwp',
    chest: ['pppppppp', 'pPPwwwPPPp', 'pPPwwfwPPp', 'pPPwwwPPPp', 'spPPffPPps', 'PPPPPPPP'],
    hem: 'PPPPPPPPPP',
  }),

  /** Rail Baron: company blue, and two rows of brass down the front of it. */
  rail: shirt({
    key: {
      p: PALETTE.blueDark, P: PALETTE.blueDark, q: PALETTE.blue,
      w: PALETTE.steel, W: PALETTE.steelDark,
      f: PALETTE.gold, F: PALETTE.goldDark,
      t: PALETTE.leatherDark, T: PALETTE.charDark, l: PALETTE.goldLight,
    },
    collar: 'qwwwwwwq',
    chest: ['qqqqqqqq', 'qpfPPfpppq', 'ppfPPfpppp', 'ppfPPfPPPp', 'sppfPfPPps', 'PPfPPfPP'],
    hem: 'PPfPPPPfPP',
  }),
};

// ---------------------------------------------------------------------------
// TROUSERS — a hip row, a palette, and a transform over the leg poses.
// ---------------------------------------------------------------------------

const hip = (interior) => `...k${interior}k...`;

export const PANTS = {
  /** Working canvas. Nothing to say about them, which is the idea. */
  trail: {
    key: { b: PALETTE.woodDark },
  },

  /** Leather chaps over the jeans, with the fringe hanging off the outside. */
  chaps: {
    key: { b: PALETTE.leatherDark, c: PALETTE.sandDark, C: PALETTE.leather },
    hip: hip('CbbbbbbC'),
    transform: (rows, band) => outside(rows, band.thigh, 'c'),
  },

  /** Town trousers with a gold seam up the outside of each leg. */
  stripe: {
    key: { b: PALETTE.charDark, c: PALETTE.gold, C: PALETTE.goldDark },
    hip: hip('bbCccCbb'),
    transform: (rows, band) => seam(rows, band.upper, 'c'),
  },

  /** Riveted plate over the thighs. Heavy, and it looks it. */
  iron: {
    key: { b: PALETTE.greyDark, c: PALETTE.steelDark, C: PALETTE.steel },
    hip: hip('cbbbbbbc'),
    transform: (rows, band) => studs(tint(rows, band.upper, 'b', 'c'), band.calf, 'C'),
  },

  /** Scorched Basin leggings with the cracks still glowing through them. */
  ash: {
    key: { b: PALETTE.char, c: PALETTE.magma, C: PALETTE.emberGlow },
    hip: hip('bccccccb'),
    transform: (rows, band) => studs(seam(rows, band.calf, 'c'), band.top, 'C'),
  },

  /** Cloth with a sky in it. The stars sit on the inside of the stride. */
  star: {
    key: { b: PALETTE.cosmic, c: PALETTE.star, C: PALETTE.astral },
    hip: hip('bCcccCbb'),
    transform: (rows, band) => studs(studs(rows, band.top, 'c'), band.shin, 'C'),
  },

  /** Fur-lined for the pass, with the pelt turned out down the sides. */
  quilted: {
    key: { b: PALETTE.snowDeep, c: PALETTE.snow, C: PALETTE.snowMid },
    hip: hip('cbbbbbbc'),
    transform: (rows, band) => outside(rows, band.lower, 'c'),
  },

  // --- Bought, never earned ------------------------------------------------

  /** Riveted denim, indigo, with copper at every seam that ever tore. */
  denim: {
    key: { b: PALETTE.blueDark, c: PALETTE.goldDark, C: PALETTE.blue },
    hip: hip('bcbbbbcb'),
    transform: (rows, band) => studs(seam(rows, band.thigh, 'C'), band.top, 'c'),
  },

  /** Buffalo hide, hair left on, cut heavy enough to turn a thorn. */
  hide: {
    key: { b: PALETTE.woodDeep, c: PALETTE.leatherDark, C: PALETTE.leather },
    hip: hip('cCbbbbCc'),
    transform: (rows, band) => outside(tint(rows, band.calf, 'b', 'c'), band.upper, 'C'),
  },

  /** Undertaker's Sunday: pressed black, one satin line down the seam. */
  mourning: {
    key: { b: PALETTE.ink, c: PALETTE.greyDark, C: PALETTE.grey },
    hip: hip('bbcccbbb'),
    transform: (rows, band) => seam(rows, [...band.thigh, ...band.shin], 'c'),
  },

  /** Rail Baron: heavy canvas, striped like the company's own paintwork. */
  rail: {
    key: { b: PALETTE.steelDark, c: PALETTE.gold, C: PALETTE.steel },
    hip: hip('bCccccCb'),
    transform: (rows, band) => studs(seam(rows, band.lower, 'C'), band.upper, 'c'),
  },
};

// ---------------------------------------------------------------------------
// BOOTS — a palette, and how far up the leg they go.
// ---------------------------------------------------------------------------

export const BOOTS = {
  /** The pair you walked in on. */
  trail: {
    key: { B: PALETTE.wood },
  },

  /** Riding boots, and a rowel spur behind each heel. */
  spurs: {
    key: { B: PALETTE.leatherDark, v: PALETTE.goldLight },
    transform: (rows, band) => outside(bootTops(rows, band), band.boot, 'v'),
  },

  /** Pass boots: tall, with the fleece turned down over the top. */
  snow: {
    key: { B: PALETTE.snowShade, v: PALETTE.bone },
    transform: (rows, band) => tint(bootTops(rows, band), band.shin, 'B', 'v'),
  },

  /** Bayou waders. Up past the knee, because down there everything is. */
  waders: {
    key: { B: PALETTE.bogLight, v: PALETTE.rot },
    transform: (rows, band) => tint(bootTops(rows, band, 2), band.calf, 'B', 'v'),
  },

  /** Basin boots with the melt still running out of the welt. */
  ember: {
    key: { B: PALETTE.charDark, v: PALETTE.magma },
    transform: (rows, band) => studs(bootTops(rows, band), band.boot, 'v'),
  },

  /** They leave light where they land. */
  star: {
    key: { B: PALETTE.voidRock, v: PALETTE.astralLight },
    transform: (rows, band) => outside(bootTops(rows, band), band.boot, 'v'),
  },

  /** Gilt from the toe to the top. Loud, and meant to be. */
  gilded: {
    key: { B: PALETTE.goldDark, v: PALETTE.goldLight },
    transform: (rows, band) => seam(bootTops(rows, band), [...band.shin, ...band.boot], 'v'),
  },

  // --- Bought, never earned ------------------------------------------------

  /** Muleskinner's boots: laced to the knee, and re-soled twice already. */
  mule: {
    key: { B: PALETTE.leatherDark, v: PALETTE.sandDark },
    transform: (rows, band) => studs(bootTops(rows, band, 2), [...band.calf, ...band.shin], 'v'),
  },

  /** Hobnails. You can hear the man coming before the horse. */
  hobnail: {
    key: { B: PALETTE.woodDeep, v: PALETTE.steel },
    transform: (rows, band) => outside(tint(rows, band.boot, 'B', 'v'), band.boot, 'v'),
  },

  /** Undertaker's Sunday: patent leather, polished to a black mirror. */
  mourning: {
    key: { B: PALETTE.ink, v: PALETTE.grey },
    transform: (rows, band) => seam(bootTops(rows, band), band.boot, 'v'),
  },

  /** Rail Baron: steel toecaps, and a strap over the instep. */
  rail: {
    key: { B: PALETTE.steelDark, v: PALETTE.gold },
    transform: (rows, band) => seam(tint(bootTops(rows, band), band.shin, 'b', 'B'), band.shin, 'v'),
  },
};

// ---------------------------------------------------------------------------
// HARNESSES — tack, stamped over the horse's own frames.
//
// WHY THESE ARE WRITTEN AS RUNS AND NOT AS PIXEL ROWS
// ---------------------------------------------------------------------------
// Everything else in this file is typed as rows of characters, because a hat is
// a shape and a shape wants to be drawn. A harness is not a shape — it is four
// or five STRAPS lying on an animal that is already drawn, and typed as full
// rows it would be seventeen lines of thirty-two dots with six letters hidden
// somewhere in them, which is unreadable and unmaintainable in equal measure.
//
// So a strap is `[row, x, characters]` — "this many pixels, starting here" —
// and a rig is a list of the straps it is made of. The parts below are shared:
// a bridle is a bridle whatever it is made of, and a harness that wants one
// names it rather than re-typing it. What changes between rigs is which parts
// they carry and what colour their leather and their fittings are.
//
// The coordinates are the horse's own 32 x 24 grid, and only rows 0..16 are
// ever touched: below that are the legs, which are re-stamped every frame.
// ---------------------------------------------------------------------------

/** Paint runs of characters onto a copy of `rows`. See the note above. */
function paintRuns(rows, runs) {
  const out = rows.map((r) => r.split(''));
  for (const [y, x, chars] of runs) {
    if (y < 0 || y >= out.length) continue;
    for (let i = 0; i < chars.length; i++) {
      const tx = x + i;
      if (chars[i] === '.' || tx < 0 || tx >= out[y].length) continue;
      out[y][tx] = chars[i];
    }
  }
  return out.map((r) => r.join(''));
}

/** A blank sheet the size of the horse's static half. */
const TACK_SHEET = Array(17).fill('.'.repeat(32));

/** The pieces a rig is assembled from. */
const TACK = {
  /** Browband, cheekpiece, noseband and the bit at the corner of the mouth. */
  bridle: [[3, 23, 'jjjj'], [4, 27, 'j'], [5, 27, 'j'], [6, 27, 'jjjj'], [7, 27, 'i']],
  /** From the bit, back over the neck, to the hands of whoever is sitting up there. */
  reins: [[7, 24, 'jj'], [8, 21, 'jjj'], [9, 18, 'jjj'], [10, 16, 'jj']],
  /** A breast collar, laid down the shoulder to the chest. */
  collar: [[11, 22, 'jjjj'], [12, 24, 'jjj'], [13, 25, 'jj'], [14, 25, 'j']],
  /** The girth, hanging out from under the saddle skirt. */
  girth: [[15, 11, 'JJ'], [16, 11, 'JJ']],
  /** Saddlebags, slung behind the cantle. */
  bags: [[12, 6, 'jjj'], [13, 6, 'jij'], [14, 6, 'jjj'], [15, 7, 'jj']],
  /** A blanket roll across the back, behind the withers. */
  bedroll: [[10, 7, 'JjjJ']],
  /** Brass on the cheek and on the collar. */
  conchos: [[4, 27, 'i'], [11, 23, 'i'], [12, 25, 'i']],
  /** A feather standing up between the ears. */
  plume: [[0, 25, 'i'], [1, 25, 'i'], [2, 25, 'i']],
  /** A shoulder plate, with two spikes off the top of it. */
  plate: [[10, 22, 'i'], [10, 24, 'i'], [11, 21, 'jjjjj'], [12, 22, 'jjjj'], [13, 23, 'jjj']],
};

/**
 * One rig.
 * @param {string[]} parts names from TACK, in the order they are laid on
 * @param {object} key the three characters a harness owns: j, J, i
 */
function harness(parts, key) {
  return { rows: paintRuns(TACK_SHEET, parts.flatMap((name) => TACK[name])), key };
}

export const HARNESS = {
  /**
   * Nothing at all — the horse in its own saddle, exactly as the game has
   * always drawn it. It is a real entry rather than an absence because "no
   * tack" is a look somebody chooses, and a wardrobe that expresses it as an
   * empty slot is a wardrobe you cannot tell is working.
   */
  none: { rows: null, key: {} },

  /**
   * The rig the stable throws in with the animal: a plain bridle, reins and a
   * girth, in the near-black leather every working bridle in the world is made
   * of. It is dark for a reason that is nothing to do with taste — a strap the
   * colour of the coat it lies on is a strap nobody can see, and this is the
   * one rig every player owns from the first minute.
   */
  trail: harness(['bridle', 'reins', 'girth'], {
    j: PALETTE.woodDeep, J: PALETTE.ink, i: PALETTE.gold,
  }),

  /** A drover's working rig: bags for the long stretches and a roll behind. */
  drover: harness(['bridle', 'reins', 'collar', 'girth', 'bags', 'bedroll'], {
    j: PALETTE.woodDark, J: PALETTE.woodDeep, i: PALETTE.sandDark,
  }),

  /** Show tack: oiled black leather under more brass than it needs. */
  brass: harness(['bridle', 'reins', 'collar', 'girth', 'conchos'], {
    j: PALETTE.charDark, J: PALETTE.ink, i: PALETTE.goldLight,
  }),

  /** Basin barding: a plate over the shoulder with the horns still on it. */
  iron: harness(['bridle', 'reins', 'plate', 'girth'], {
    j: PALETTE.steelDark, J: PALETTE.char, i: PALETTE.magma,
  }),

  /** Cut past the last horizon. The fittings are not reflecting anything. */
  star: harness(['bridle', 'reins', 'collar', 'girth', 'conchos', 'plume'], {
    j: PALETTE.voidRock, J: PALETTE.voidRockDark, i: PALETTE.star,
  }),

  // --- Bought, never earned ------------------------------------------------

  /** Silverwork off a border saddler: conchos from the browband to the girth. */
  silver: harness(['bridle', 'reins', 'collar', 'girth', 'conchos'], {
    j: PALETTE.leatherDark, J: PALETTE.woodDeep, i: PALETTE.snow,
  }),

  /** Parade rig: scarlet webbing and a feather standing straight up. */
  parade: harness(['bridle', 'reins', 'collar', 'girth', 'plume'], {
    j: PALETTE.red, J: PALETTE.redDark, i: PALETTE.goldLight,
  }),

  /** A packer's rig. Everything you own, and the horse carries it. */
  packer: harness(['bridle', 'reins', 'girth', 'bags', 'bedroll', 'collar'], {
    j: PALETTE.bogDark, J: PALETTE.bogDeep, i: PALETTE.sandLight,
  }),
};

// Every rig knows its own name, so the horse cache can be keyed by it without
// the rig having to be told twice. See `getCharacterSprites`.
for (const [id, rig] of Object.entries(HARNESS)) rig.id = id;

const CATALOGUE = { hat: HATS, shirt: SHIRTS, pants: PANTS, boots: BOOTS, horse: HARNESS };

export function hasPiece(slot, id) {
  return !!(CATALOGUE[slot] && CATALOGUE[slot][id]);
}

/** Fill in the default for anything missing or unknown. */
export function normalizeOutfit(outfit = {}) {
  const out = {};
  for (const slot of OUTFIT_SLOTS) {
    out[slot] = hasPiece(slot, outfit[slot]) ? outfit[slot] : DEFAULT_OUTFIT[slot];
  }
  return out;
}

/** Dress one leg block: trousers first, then boots over the top of them. */
function dressLegs(rows, pants, boots, band) {
  let art = pants.hip ? [pants.hip, ...rows.slice(1)] : [...rows];
  if (pants.transform) art = pants.transform(art, band);
  if (boots.transform) art = boots.transform(art, band);
  return art;
}

function buildLegs(pants, boots) {
  const out = {};
  for (const [pose, rows] of Object.entries(LEGS)) {
    out[pose] = dressLegs(rows, pants, boots, STAND_BANDS);
  }
  return out;
}

/**
 * Turn an outfit into the parts the rig builds a fighter out of.
 *
 * The collar goes on before the hat, so a kerchief pulled up over the mouth
 * covers the neckerchief under it rather than the other way round.
 *
 * @param {{hat: string, shirt: string, pants: string, boots: string}} outfit
 */
export function outfitParts(outfit) {
  const worn = normalizeOutfit(outfit);
  const hat = HATS[worn.hat];
  const shirt = SHIRTS[worn.shirt];
  const pants = PANTS[worn.pants];
  const boots = BOOTS[worn.boots];

  return {
    head: stamp(stamp(FACE, [shirt.collar], 0, 10), hat.rows, 0, 0),
    torso: shirt.torso,
    flare: shirt.flare,
    legs: buildLegs(pants, boots),
    /**
     * The tack, handed straight through. The rig stamps it onto the horse
     * rather than onto the man (`composeHorse`), and `none` is a real harness
     * with no art in it, which is why this is never null.
     */
    harness: HARNESS[worn.horse] || HARNESS[DEFAULT_OUTFIT.horse],
    /**
     * The same trousers and the same boots, on the seated leg. Without this the
     * rig falls back to its own bare RIDER_LEGS: the colours would still be
     * right (the key is the outfit's) but the fringe, the tall boot and the
     * spur would all get off the horse — which is exactly the seam the whole
     * one-rig approach exists to avoid.
     */
    riderLegs: dressLegs(RIDER_LEGS, pants, boots, RIDE_BANDS),
    key: { ...hat.key, ...shirt.key, ...pants.key, ...boots.key },
  };
}

// ---------------------------------------------------------------------------
// Pictures of clothes
// ---------------------------------------------------------------------------

const thumbCache = new Map();

/** One string that says what somebody is wearing. Caches are keyed by it. */
export const outfitKey = (outfit) => OUTFIT_SLOTS.map((s) => outfit[s]).join('|');

/**
 * The rows of the figure one garment lives on: the hat and the face under it,
 * the shirt from chin to hip, the trousers, the boots.
 *
 * A reward badge the size of a whole man is a man; cropped to the part that was
 * actually earned, it is a picture of the thing. The crops deliberately keep a
 * row or two of what is NEXT to the garment — a hat with no face under it is a
 * shape, and a boot with no shin above it is a smudge.
 */
const SLOT_CROP = { hat: [0, 11], shirt: [8, 19], pants: [16, 24], boots: [18, 24] };

/**
 * A garment on its own, worn over the default of every other slot.
 *
 * The horse is the exception and has to be: a harness is not a band of rows off
 * a man, it is tack on an animal, so its card is a picture of the whole horse
 * standing in it. That is also the honest picture — a bridle cropped to a
 * bridle is four brown pixels.
 *
 * @param {'hat'|'shirt'|'pants'|'boots'|'horse'} slot
 */
export function pieceThumb(slot, id) {
  const cacheKey = `${slot}:${id}`;
  if (thumbCache.has(cacheKey)) return thumbCache.get(cacheKey);
  const thumb = slot === 'horse'
    ? horseStill(HARNESS[id] || HARNESS.none)
    : fighterStill(outfitParts(normalizeOutfit({ ...DEFAULT_OUTFIT, [slot]: id })), SLOT_CROP[slot]);
  thumbCache.set(cacheKey, thumb);
  return thumbCache.get(cacheKey);
}

/**
 * The mannequin a wardrobe card is drawn on when the garment has not been
 * earned: the same crop, in one flat grey. Locked is drawn, not hidden — you
 * are supposed to want it.
 */
export function lockedThumb(slot) {
  const cacheKey = `locked:${slot}`;
  if (thumbCache.has(cacheKey)) return thumbCache.get(cacheKey);
  const rows = slot === 'horse'
    ? HORSE_STILL_ROWS
    : [...FACE, ...TORSO, ...LEGS.stand].slice(SLOT_CROP[slot][0], SLOT_CROP[slot][1]);
  const flat = rows.map((row) => row.replace(/[^.]/g, 'x'));
  thumbCache.set(cacheKey, bake({ key: { '.': null, x: PALETTE.greyDark }, rows: flat }));
  return thumbCache.get(cacheKey);
}
