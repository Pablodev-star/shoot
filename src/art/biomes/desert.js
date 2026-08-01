/**
 * SHOOT! — Desert biome art.
 *
 * The world the game opens in and the one the menu backdrop shows: flat sand,
 * mesas on the horizon, saguaro and bone along the road. This is the art that
 * was in `sprites-environment.js` before the game had a second biome; it has
 * not been redrawn, only moved, so world 1 looks exactly as it always did.
 *
 * SCENERY CARRIES NO OUTLINE
 * ---------------------------------------------------------------------------
 * The character, the enemies and the items are outlined in ink so they read as
 * *things the player acts on*, and pop off whatever is behind them. The
 * scenery is not one of those things: it is the picture the actors stand in
 * front of. A black keyline around every cactus and every pebble put the
 * backdrop on the same visual footing as the gunslinger, and in a scene lit by
 * a moving sun it also nailed each prop to a colour the light never touches.
 *
 * So these props are shaded instead of outlined: light from the top left, a
 * mid tone for the body, a dark tone of the SAME hue down the right-hand and
 * lower edges, and — where a prop meets the sand — a `z` contact shadow. The
 * silhouette is carried by contrast with the ground, which is how the parallax
 * ridges behind them have always worked.
 *
 * Every prop still ends on its own footprint (a scuff of sand or a contact
 * shadow) so the renderer can plant the bottom row straight on the walk line.
 */

import { PALETTE } from '../palette.js';
import { makeCanvas } from '../pixel.js';
import { makeRng } from '../../core/rng.js';
import { LAYER_TILE_W, makeCloudLayer, makeRidgeLayer, speckle } from '../env-kit.js';

export const DESERT_PROPS = {
  /**
   * Saguaro. The arms leave the trunk low and turn upward — a cactus whose
   * arms hang down reads as a candelabra, which is the usual way this shape
   * goes wrong. Ribbed with a lit column (G), a body column (g) and a shaded
   * column (d) so the trunk keeps its round section without a keyline.
   */
  cactusTall: [
    '....gGgd....',
    '....gGgd....',
    '....gGgd....',
    '....gGgd....',
    'ggd.gGgd....',
    'gGd.gGgd....',
    'gGd.gGgd.ggd',
    'gGd.gGgd.gGd',
    'gGd.gGgd.gGd',
    'gGgggGgd.gGd',
    'gGgggGgd.gGd',
    '.ddggGgdggGd',
    '....gGgdggGd',
    '....gGgd.ddd',
    '....gGgd....',
    '....gGgd....',
    '....gGgd....',
    '....gGgd....',
    '....gddd....',
    '....gddd....',
    '..rRRRRRRr..',
    '.zrRRRRRRrz.',
  ],
  cactusShort: [
    '...gGgd.',
    '...gGgd.',
    '...gGgd.',
    'ggdgGgd.',
    'gGdgGgd.',
    'gGggGgd.',
    '.ddgGgd.',
    '...gGgd.',
    '...gGgd.',
    '...gddd.',
    '.rRRRRr.',
    'zrRRRRrz',
  ],
  /** Barrel cactus, ribbed and in flower. */
  cactusRound: [
    '...e.e...',
    '..EgGgE..',
    '.gGgGgGd.',
    'gGgGgGgGd',
    'gGgGgGgGd',
    'gGgGgGgGd',
    '.gGgGgGd.',
    '..gggdd..',
    '..ddddd..',
    '.zrRRRrz.',
  ],
  rockBig: [
    '....SSS....',
    '..SSRRRRr..',
    '.SRRRRRRrr.',
    'SRRRRRRRrrr',
    'SRRRRRRrrrr',
    '.rRRRRrrrr.',
    '..zzzzzzz..',
  ],
  rockSmall: [
    '..SSS..',
    '.SRRRr.',
    'SRRRRrr',
    '.rRRrr.',
    '..zzz..',
  ],
  /**
   * Longhorn skull. The horns are what make it read at a glance, not the eyes,
   * so the horns keep the lightest bone tone and the sockets are the only dark
   * pixels on it — a hole, not a keyline.
   */
  skull: [
    '.b.......b.',
    '.bB.....Bb.',
    'bbB.....Bbb',
    'bbbBBBBBbbb',
    '.BbbbbbbbB.',
    '.BbvbbbvbB.',
    '..bbbbbbb..',
    '..bBvvBb...',
    '...bbbb....',
  ],
  sign: [
    'wwwwwwwwwww',
    'wWWWWWWWWWw',
    'wWxxWxWxxWw',
    'wWWWWWWWWWw',
    'wWxWxxWxWWw',
    'wWWWWWWWWWw',
    'xxxxxxxxxxx',
    '....wXx....',
    '....wXx....',
    '....wXx....',
    '..zrRRRrz..',
  ],
  bones: [
    'bb.....bb',
    'bbbbbbbbb',
    'BBbBBBbBB',
    '.zz...zz.',
  ],
  carrotGround: [
    '..Gg..gG..',
    '.GGg..gGG.',
    '.gGGGGGGg.',
    '..OoooooO.',
    '..OoooooO.',
    '...Oooou..',
    '...oouu...',
    '....ou....',
    '....z.....',
  ],
  appleGround: [
    '....dg....',
    '...dgG....',
    '..EEeeee..',
    '.EEeeeeee.',
    '.Eeeeeeeq.',
    '.qeeeeeeq.',
    '..qeeeeq..',
    '...zqqz...',
  ],
};

/** Ground strip: packed sand with pebbles and a darker crust line. */
function makeSandGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);
  ctx.fillStyle = PALETTE.sandLight;
  ctx.fillRect(0, 0, LAYER_TILE_W, 2);
  ctx.fillStyle = PALETTE.sandMid;
  ctx.fillRect(0, 2, LAYER_TILE_W, 1);
  speckle(ctx, rng, {
    from: 3,
    to: height - 1,
    count: 420,
    colors: [PALETTE.sandMid, PALETTE.sandDark],
  });
  // The deeper the ground, the darker — reads as the road falling into shadow.
  for (let y = Math.floor(height * 0.6); y < height; y++) {
    const k = (y - height * 0.6) / (height * 0.4);
    ctx.globalAlpha = k * 0.55;
    ctx.fillStyle = PALETTE.sandDeep;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;
  return canvas;
}

export const DESERT_ART = {
  id: 'desert',

  props: DESERT_PROPS,

  buildLayers: () => ({
    clouds: makeCloudLayer({ seed: 7717, height: 48 }),
    far: makeRidgeLayer({
      seed: 4242,
      height: 72,
      baseline: 34,
      amplitude: 18,
      roughness: 0.3,
      colors: { body: PALETTE.sandDeep, light: PALETTE.sandDark, dark: PALETTE.woodDeep },
    }),
    mid: makeRidgeLayer({
      seed: 1337,
      height: 64,
      baseline: 26,
      amplitude: 14,
      roughness: 0.6,
      colors: { body: PALETTE.sandDark, light: PALETTE.sandMid, dark: PALETTE.sandDeep },
    }),
    dunes: makeRidgeLayer({
      seed: 909,
      height: 44,
      baseline: 18,
      amplitude: 8,
      roughness: 0.9,
      colors: { body: PALETTE.sandMid, light: PALETTE.sand, dark: PALETTE.sandDark },
    }),
    ground: makeSandGround({ seed: 55, height: 72 }),
  }),

  /**
   * The renderer walks this back to front; `y` is the layer's top edge measured
   * from the walk line.
   */
  manifest: [
    { name: 'clouds', speed: 0.05, y: -104 },
    { name: 'far', speed: 0.15, y: -72 },
    { name: 'mid', speed: 0.4, y: -58 },
    { name: 'dunes', speed: 0.7, y: -34 },
    { name: 'ground', speed: 1.0, y: 0 },
  ],

  /** Props that can be scattered along the road, with their placement weights. */
  scatter: [
    { name: 'cactusTall', weight: 18 },
    { name: 'cactusShort', weight: 20 },
    { name: 'cactusRound', weight: 12 },
    { name: 'rockBig', weight: 14 },
    { name: 'rockSmall', weight: 20 },
    { name: 'skull', weight: 7 },
    { name: 'bones', weight: 6 },
    { name: 'sign', weight: 3 },
  ],

  /** Fills below the ground strip on very tall windows. */
  groundFill: PALETTE.sandDeep,

  /** Colour of the dust the traveller kicks up. */
  dust: 'rgba(240, 214, 154, 0.5)',

  /** Buildings stand on their own sand apron — nothing to re-key. */
  structureGround: null,

  /** Nothing drifts through the desert but the weather. */
  ambient: null,
};
