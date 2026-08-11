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
 * FOUR FRAMES OF MUZZLE FLASH, AND WHY THERE USED TO BE THREE
 * ---------------------------------------------------------------------------
 * The old flash was a small symmetrical bloom that lit, widened and went out —
 * three frames, eleven pixels long, the same shape forwards and backwards. It
 * read as a *bulb*: something that switched on at the end of the barrel and
 * switched off again.
 *
 * A gunshot does not do that. It has an order to it, and all four beats are
 * here now:
 *
 *   ignite  a tight star at the muzzle. The powder has caught and nothing has
 *           left the barrel yet
 *   bloom   the cone, running a full barrel's length down the bore, with the
 *           cross spikes where gas escapes the cylinder gap. Long rather than
 *           round: a symmetrical starburst is an explosion, and this is a
 *           thing coming OUT of a tube
 *   burn    the cone going red at its heart as the powder is spent, breaking
 *           into flecks that carry on outwards
 *   ember   the last of it, scattered and cooling, hanging in the air where
 *           the light used to be
 *
 * It is also half again as long as it was, so the flash reaches past the
 * fighter's own silhouette and the shot is visible even in the frames where the
 * gun is small on screen.
 */
const FLASH = [
  [
    '..............',
    '..............',
    '.....y........',
    '..y.oOo.y.....',
    '..yoOWOoy.....',
    'yoOWWWWOoy....',
    '..yoOWOoy.....',
    '..y.oOo.y.....',
    '.....y........',
    '..............',
    '..............',
  ],
  [
    '....y.........',
    '..y.o.y.......',
    '.y.oOo.y..y...',
    'y.oOWWOo.y....',
    'yoOWWWWWOoy...',
    'oOWWWWWWWOooyy',
    'yoOWWWWWOoy...',
    'y.oOWWOo.y....',
    '.y.oOo.y..y...',
    '..y.o.y.......',
    '....y.........',
  ],
  [
    '..............',
    '....y....y....',
    '..y.o.y.......',
    '.yorrOoy..y...',
    'yoOWWWOoy.....',
    'oOWWrWWOoy.y..',
    'yoOWWWOoy.....',
    '.yorrOoy..y...',
    '..y.o.y.......',
    '....y....y....',
    '..............',
  ],
  [
    '..............',
    '..............',
    '...y......y...',
    '..y.r.y.......',
    '.y.oro.y..y...',
    '.yorWroy.y....',
    '.y.oro.y..y...',
    '..y.r.y.......',
    '...y......y...',
    '..............',
    '..............',
  ],
];

/** The muzzle pixel, inside the flash sprite: left edge, on the bore line. */
export const FLASH_ANCHOR = { x: 0, y: 5 };

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
 *
 * Four beats, and the shape of them matters more than the drawing: a flat white
 * hit, a star with the hole punched through the middle of it, a ring that has
 * left the wound and is still travelling, and grit falling out of the air. An
 * impact that only ever gets fainter reads as a fade; one that gets BIGGER as
 * it fades reads as something arriving hard.
 */
const IMPACT = [
  [
    '.........',
    '....W....',
    '...WWW...',
    '..WWWWW..',
    '.WWWOWWW.',
    '..WWWWW..',
    '...WWW...',
    '....W....',
    '.........',
  ],
  [
    '....y....',
    '.y..O..y.',
    '..OWWWO..',
    '.yOWWWOy.',
    'yOWW.WWOy',
    '.yOWWWOy.',
    '..OWWWO..',
    '.y..O..y.',
    '....y....',
  ],
  [
    'd..y.y..d',
    '.y.....y.',
    'y.......y',
    '.........',
    'y...o...y',
    '.........',
    'y.......y',
    '.y.....y.',
    'd..y.y..d',
  ],
  [
    '.........',
    'd.......d',
    '.........',
    '..d...d..',
    '.........',
    '..d...d..',
    '.........',
    'd.......d',
    '.........',
  ],
];

export const IMPACT_ANCHOR = { x: 4, y: 4 };

/**
 * How long a spark lives, in three steps.
 *
 * There is no spark SPRITE, and that is deliberate: a spark is one block of one
 * colour, and the colour belongs to whichever gun threw it (see the tiers in
 * `src/game/gun-tiers.js`). Baking three frames of it would mean baking them
 * again per tier to say the same thing. The scene draws the block and reads its
 * size out of this timing, so a spark dies by getting SMALLER rather than by
 * fading — which is how a hot cinder actually goes out.
 */

let cache = null;

/**
 * Bake (once) and return every combat effect.
 * @returns {{flash: HTMLCanvasElement[], smoke: HTMLCanvasElement[],
 *            shell: HTMLCanvasElement, impact: HTMLCanvasElement[]}}
 */
export function getCombatFx() {
  if (cache) return cache;
  cache = bakeSet(KEY);
  return cache;
}

function bakeSet(key) {
  const rows = (list) => list.map((r) => bake({ key, rows: r }));
  return {
    flash: rows(FLASH),
    smoke: rows(SMOKE),
    shell: bake({ key, rows: SHELL }),
    impact: rows(IMPACT),
  };
}

const tintCache = new Map();

/**
 * The same effects in somebody else's colours.
 *
 * A gun that has been re-forged five times should not still be throwing the
 * gold-and-white powder flash it left the factory with — the Emberbore burns
 * orange, the Starfall burns aquamarine and the Nova burns the colour of the
 * sky it came out of. Rather than drawing four more flash animations, the
 * character map is baked again through a different key, which is the whole
 * reason the art is character maps in the first place.
 *
 * `null` overrides give the shared set back, untinted and uncopied.
 *
 * @param {string} id cache key — one bake per gun tier, not one per frame
 * @param {Record<string, string>|null} overrides palette letters to replace
 */
export function getTintedFx(id, overrides) {
  if (!overrides) return getCombatFx();
  if (tintCache.has(id)) return tintCache.get(id);
  const set = bakeSet({ ...KEY, ...overrides });
  tintCache.set(id, set);
  return set;
}

/** Milliseconds each frame of each effect is held. */
export const FX_TIMING = {
  flash: [40, 70, 60, 55],
  smoke: [90, 160, 240, 320],
  impact: [45, 65, 80, 90],
  spark: [70, 110, 150],
};
