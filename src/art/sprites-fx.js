/**
 * SHOOT! — Combat effects (muzzle flash, smoke, brass, impact).
 *
 * Everything a shot throws off, authored on the same grid and in the same
 * palette as the fighters doing the shooting.
 *
 * WHY THESE ARE SPRITES AND NOT RECTANGLES
 * ---------------------------------------------------------------------------
 * The duel used to say "a shot happened" with a filled rectangle at the end of
 * the barrel, held for two frames. That is not a muzzle flash — it is a flag,
 * and the eye reads it as one. A gunshot is a shape: a white core, a cone of
 * burning powder along the bore, spikes where the gas escapes the cylinder
 * gap, then smoke that hangs and drifts long after the light has gone.
 *
 * All of it is drawn ALONG THE BARREL: each flash frame is anchored at the
 * muzzle with its axis running to the right, and the renderer flips it for the
 * fighter facing left. Nothing here is centred on the fighter, because a flash
 * belongs to the gun.
 *
 * FLASHES ARE NOT LIT BY THE SKY
 * ---------------------------------------------------------------------------
 * See the note in src/duel/duel-scene.js: these are drawn after the hour of
 * the day has been laid over the scene, because a muzzle flash that dims at
 * dusk is a muzzle flash drawn as if it were paint.
 */

import { PALETTE } from './palette.js';
import { bake } from './pixel.js';

const KEY = {
  '.': null,
  W: PALETTE.white,
  O: PALETTE.goldLight,
  o: PALETTE.gold,
  y: PALETTE.goldDark,
  r: PALETTE.redLight,
  x: PALETTE.grey,
  X: PALETTE.greyDark,
  w: PALETTE.bone,
  d: PALETTE.boneDark,
  s: PALETTE.steel,
  S: PALETTE.steelDark,
  g: PALETTE.gold,
  G: PALETTE.goldDark,
};

/**
 * Three frames of muzzle flash, anchored at the muzzle with the bore running
 * right. Ignition, full bloom, and the last of the burning powder.
 *
 * The bloom frame is wider than it is tall on purpose: powder leaves a barrel
 * as a cone, and a symmetrical starburst reads as an explosion instead.
 */
const FLASH = [
  [
    '...........',
    '...........',
    '.....y.....',
    '..yoOOoy...',
    '.yoOWWOoy..',
    '..yoOOoy...',
    '.....y.....',
    '...........',
    '...........',
  ],
  [
    '....y......',
    '..y.oy.....',
    '.yoOOoy.y..',
    'yoOWWWOoy..',
    'oOWWWWWOooy',
    'yoOWWWOoy..',
    '.yoOOoy.y..',
    '..y.oy.....',
    '....y......',
  ],
  [
    '...........',
    '....y......',
    '..y.o.y....',
    '.yorroy....',
    'yoOWWOoy.y.',
    '.yorroy....',
    '..y.o.y....',
    '....y......',
    '...........',
  ],
];

/** The muzzle pixel, inside the flash sprite: left edge, on the bore line. */
export const FLASH_ANCHOR = { x: 0, y: 4 };

/**
 * Powder smoke: four frames of one puff, growing and thinning. Drawn from its
 * centre, so the renderer can drift it wherever the air is taking it.
 */
const SMOKE = [
  [
    '.......',
    '.......',
    '..www..',
    '..wwd..',
    '..ddd..',
    '.......',
    '.......',
  ],
  [
    '.......',
    '..ddd..',
    '.dwwwd.',
    '.dwwwd.',
    '.dxxxd.',
    '..ddd..',
    '.......',
  ],
  [
    '..ddd..',
    '.dxxxd.',
    'dx.w.xd',
    'dx...xd',
    'dx...xd',
    '.dXXXd.',
    '..dXd..',
  ],
  [
    '.dX.Xd.',
    'X.....X',
    '.......',
    'X.....X',
    '.......',
    'X.....X',
    '.dX.Xd.',
  ],
];

export const SMOKE_ANCHOR = { x: 3, y: 3 };

/**
 * The spent case, thrown clear of the cylinder. Two pixels wide: a shell you
 * can see the rim of is a shell the size of the man's forearm.
 */
const SHELL = ['gG', 'gG', 'GG'];

/**
 * Where a bullet lands. Not blood — a hit in this game is a life, not a wound,
 * and the game has never drawn one. This is the dust and the splinters coming
 * off whatever the round went through.
 */
const IMPACT = [
  [
    '.......',
    '...W...',
    '..WWW..',
    '.WWOWW.',
    '..WWW..',
    '...W...',
    '.......',
  ],
  [
    '...y...',
    '.y.O.y.',
    '..OWO..',
    'yOW.WOy',
    '..OWO..',
    '.y.O.y.',
    '...y...',
  ],
  [
    'd..y..d',
    '..y.y..',
    '.......',
    'y.....y',
    '.......',
    '..y.y..',
    'd..y..d',
  ],
];

export const IMPACT_ANCHOR = { x: 3, y: 3 };

let cache = null;

/**
 * Bake (once) and return every combat effect.
 * @returns {{flash: HTMLCanvasElement[], smoke: HTMLCanvasElement[],
 *            shell: HTMLCanvasElement, impact: HTMLCanvasElement[]}}
 */
export function getCombatFx() {
  if (cache) return cache;
  const rows = (list) => list.map((r) => bake({ key: KEY, rows: r }));
  cache = {
    flash: rows(FLASH),
    smoke: rows(SMOKE),
    shell: bake({ key: KEY, rows: SHELL }),
    impact: rows(IMPACT),
  };
  return cache;
}

/** Milliseconds each frame of each effect is held. */
export const FX_TIMING = {
  flash: [45, 60, 55],
  smoke: [90, 160, 240, 320],
  impact: [50, 70, 90],
};
