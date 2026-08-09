/**
 * SHOOT! — The Dusk Totem, at the size it is actually looked at.
 *
 * Every other item in the game is a sixteen-pixel icon and never needs to be
 * anything else: it sits on a shop counter, in a saddlebag grid, on a badge
 * under a fighter. This one has a scene of its own — the black screen you get
 * instead of a game over (see src/ui/totem.js) — where it floats alone in the
 * frame at ten times that size and then comes apart in your hands. Sixteen
 * pixels upscaled that far is a smudge, so the carving is drawn again here at
 * 18 x 32 with the detail that survives being the only thing on screen: horns,
 * a brow, a beak, teeth, the gold band and the chevrons cut into the shaft.
 *
 * WHY THE CRACKS ARE THEIR OWN SPRITES
 * ---------------------------------------------------------------------------
 * The totem does not have three versions. It has one, and two overlays drawn on
 * top of it in the same pixel grid at the same scale, so a fissure lands on the
 * same stone every time however far the thing has grown. Each tap of the scene
 * turns one on: `crack` first, `crackWide` after it — the same split, opened up,
 * branching across the face and through the band, with ember light coming out
 * of it. The third tap does not draw a third overlay; it breaks the whole
 * composed picture into shards (`shatterPieces`).
 *
 * It is drawn in dusk colours on purpose: void-stone violet for the carving,
 * gold for the band, and ember for everything alive inside it. The 16px icon in
 * src/art/sprites-items.js uses the same five, so the thing in the shop and the
 * thing in the dark are recognisably one object.
 */

import { PALETTE } from './palette.js';
import { bake, makeCanvas } from './pixel.js';

/** Source size of the carving, in art pixels. */
export const TOTEM_W = 18;
export const TOTEM_H = 32;

const KEY = {
  '.': null,
  k: PALETTE.ink,
  '!': PALETTE.voidRockLight,
  '?': PALETTE.voidRock,
  '&': PALETTE.voidRockDark,
  '~': PALETTE.emberGlow,
  '<': PALETTE.magma,
  O: PALETTE.goldLight,
  o: PALETTE.gold,
  y: PALETTE.goldDark,
  W: PALETTE.white,
};

/**
 * The carving.
 *
 * Read top to bottom: two horned prongs, the crown slab, a brow, two ember
 * eyes, the beak, a mouth full of teeth, the gold band with its runes, the
 * chevroned shaft and the plinth it stands on.
 */
const BODY = [
  '....kok....kok....',
  '....kOk....kOk....',
  '....kyk....kyk....',
  '.kkkkkkkkkkkkkkkk.',
  '.k!!!!!!!!!!!!!!k.',
  '.k!!??????????!!k.',
  '.k??????????????k.',
  '.k?!!!!!!!!!!!!?k.',
  '.k??~~~????~~~??k.',
  '.k??~<~????~<~??k.',
  '.k??~~~????~~~??k.',
  '.k??????????????k.',
  '.k?????!!!!?????k.',
  '.k?????!!!!?????k.',
  '.k??????!!??????k.',
  '.k??????????????k.',
  '.k??&WWWWWWWW&??k.',
  '.k??&&&&&&&&&&??k.',
  '.k??????????????k.',
  '.kkkkkkkkkkkkkkkk.',
  '.kOOOOOOOOOOOOOOk.',
  '.kyOyyOyyOyyOyyOk.',
  '.kkkkkkkkkkkkkkkk.',
  '.k??????????????k.',
  '.k??!!!!!!!!!!??k.',
  '.k???!!!!!!!!???k.',
  '.k????!!!!!!????k.',
  '.k??????????????k.',
  '.kkkkkkkkkkkkkkkk.',
  'k&&&&&&&&&&&&&&&&k',
  'k&&&&&&&&&&&&&&&&k',
  '.kkkkkkkkkkkkkkkk.',
];

/** First tap: a hairline down the right of the face, with light behind it. */
const CRACK = [
  '..................',
  '..................',
  '..................',
  '..................',
  '..........k.......',
  '..........k.......',
  '.........kO.......',
  '.........k~.......',
  '..........k.......',
  '..........kO......',
  '..........k~......',
  '.........k........',
  '.........kO.......',
  '.........k~.......',
  '..........k.......',
  '..........kO......',
  '..........k.......',
  '.........k........',
  '.........k~.......',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
];

/** Second tap: the same split, opened — one branch across the face, one
 *  through the gold band — and the ember inside it is no longer a hairline. */
const CRACK_WIDE = [
  '..................',
  '..................',
  '..........k.......',
  '.........kO.......',
  '.........kO~......',
  '........kO~O......',
  '........k~OO......',
  '.........kO~......',
  '.........kOO~.....',
  '........kO~O......',
  '...kkkkkkOO~......',
  '..kO~~OO~kO~......',
  '...kkkkk.kOO~.....',
  '........kO~O......',
  '........k~OO......',
  '.........kO~......',
  '.........kOO~.....',
  '........kO~O......',
  '........k~OO~.....',
  '.........kO~......',
  '.........kO~kkkk..',
  '........kO~~O~~Ok.',
  '.........kO~kkkk..',
  '.........kO~......',
  '........kO~.......',
  '........k~O.......',
  '.........kO.......',
  '.........k........',
  '..................',
  '..................',
  '..................',
  '..................',
];

let cache = null;

/**
 * The three baked layers, at 1x. The scene draws them at whatever size the
 * moment calls for — `imageSmoothingEnabled` is off everywhere, so upscaling
 * keeps the pixels square.
 *
 * @returns {{body: HTMLCanvasElement, crack: HTMLCanvasElement, crackWide: HTMLCanvasElement}}
 */
export function getTotemArt() {
  if (cache) return cache;
  cache = {
    body: bake({ key: KEY, rows: BODY }),
    crack: bake({ key: KEY, rows: CRACK }),
    crackWide: bake({ key: KEY, rows: CRACK_WIDE }),
  };
  return cache;
}

/**
 * The totem with `level` cracks on it, flattened into one canvas.
 *
 * Flattened rather than drawn as three layers every frame because the shatter
 * needs a single picture to cut up: a shard is a rectangle of *this*, thrown
 * across the screen, and it has to carry its share of the crack with it.
 *
 * @param {0|1|2} level how many taps have landed
 */
export function composeTotem(level = 0) {
  const art = getTotemArt();
  const { canvas, ctx } = makeCanvas(TOTEM_W, TOTEM_H);
  ctx.drawImage(art.body, 0, 0);
  if (level >= 1) ctx.drawImage(art.crack, 0, 0);
  if (level >= 2) ctx.drawImage(art.crackWide, 0, 0);
  return canvas;
}

/**
 * Cut a composed totem into shards for the break.
 *
 * A jittered grid rather than a regular one: stone does not fail along straight
 * lines, and four by seven equal rectangles read as a chocolate bar being
 * snapped. Each piece carries where it came from (so it flies outward from the
 * middle rather than in a random direction), how fast it spins, and its own
 * slice of the source canvas.
 *
 * @param {number} cols @param {number} rows
 * @param {() => number} rng
 * @returns {Array<{sx,sy,sw,sh,vx,vy,vr,rot}>} in source pixels
 */
export function shatterPieces(cols = 4, rows = 7, rng = Math.random) {
  const pieces = [];
  // Column and row edges, nudged off the regular grid so no two shards match.
  const xs = [0];
  for (let i = 1; i < cols; i++) xs.push(Math.round((TOTEM_W / cols) * i + (rng() * 2 - 1)));
  xs.push(TOTEM_W);
  const ys = [0];
  for (let i = 1; i < rows; i++) ys.push(Math.round((TOTEM_H / rows) * i + (rng() * 2 - 1)));
  ys.push(TOTEM_H);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = xs[c];
      const sy = ys[r];
      const sw = Math.max(1, xs[c + 1] - sx);
      const sh = Math.max(1, ys[r + 1] - sy);
      // Outward from the centre of the carving, with a lift on it: the totem
      // does not fall down, it goes off like something that was holding
      // pressure in.
      const dx = sx + sw / 2 - TOTEM_W / 2;
      const dy = sy + sh / 2 - TOTEM_H / 2;
      /**
       * Source pixels per millisecond, and they are small numbers on purpose:
       * a shard has to still be a recognisable piece of carved stone halfway
       * across the frame. The first pass of this threw everything off screen
       * inside a tenth of a second, which is not a totem breaking — it is a
       * totem disappearing.
       */
      const spread = 0.0035 + rng() * 0.0025;
      pieces.push({
        sx,
        sy,
        sw,
        sh,
        vx: dx * spread + (rng() * 0.008 - 0.004),
        vy: dy * spread * 0.6 - 0.022 - rng() * 0.012,
        vr: (rng() * 2 - 1) * 0.0022,
        rot: 0,
      });
    }
  }
  return pieces;
}
