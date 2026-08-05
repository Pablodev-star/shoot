/**
 * SHOOT! — Trail-map art.
 *
 * The Map item no longer prints a line of text: it opens a drawn map of the
 * stretch of road you are on. This file paints that map. The panel that lets
 * you drag and zoom around it is `src/ui/map-panel.js`; everything here is
 * pigment.
 *
 * IT IS THE WORLD SEEN FROM ABOVE, NOT A PIECE OF PARCHMENT
 * ---------------------------------------------------------------------------
 * The obvious way to draw a treasure map is a sheet of brown paper with a
 * squiggle on it. That is a picture of a *prop*, and it would have told the
 * player nothing about where they actually are. So the sheet is the ground
 * itself: the desert is sand, ripples and saguaro; the prairie is grass,
 * ponds and trees. Walk from world 1 into world 2 and the map changes biome
 * with the road, which is the whole point of it.
 *
 * The map furniture — the dashed road, the red X over the boss, the compass
 * rose — is the only thing on it borrowed from cartography, and it is drawn in
 * the same palette as everything else.
 *
 * WHERE THE SCENERY COMES FROM
 * ---------------------------------------------------------------------------
 * Nothing here draws a cactus or a tree. The props scattered over the map are
 * the biome's own roadside props, pulled straight out of the bundle the
 * parallax renderer uses (`getEnvironmentSprites`), placed in profile the way a
 * pictorial map has always drawn its forests and its hills. That means a new
 * biome gets a new map for free: write `src/art/biomes/<id>.js`, and its map is
 * its own props on its own ground.
 *
 * Every world has its own landscape now, so every world has its own map: sand,
 * grass, snow, black water, basalt and the shelf out past the last horizon.
 * What differs between them is only the TERRAIN entry below and the props the
 * bundle hands over — no map code is aware of any particular place.
 */

import { PALETTE } from './palette.js';
import { bake, makeCanvas } from './pixel.js';
import { drawTextCentered } from './font.js';
import { KEY } from './env-kit.js';
import { makeRng } from '../core/rng.js';
import { getEnvironmentSprites } from './sprites-environment.js';

/**
 * The markers are drawn with the shared environment key and nothing else.
 *
 * There used to be a MAP_KEY here: the shared key plus six letters of its own
 * for white, shadow and three blues. Half of them were never used by any
 * marker, and when the last four biomes arrived every one of those letters had
 * been claimed by a landscape — so the map was quietly baking `L` as shadow
 * while the bayou was baking it as bog water, which is precisely the thing the
 * shared key exists to prevent. The two colours the markers actually needed are
 * both already in the key (`1` is white, `k` is the game's hole colour), so the
 * override is gone rather than renamed.
 */

/** Source size of every marker. They are square so they can be centred blind. */
export const MARKER_SIZE = 16;

/**
 * The markers.
 *
 * Each one is a *picture of the thing*, not a symbol standing in for it: a
 * store with an awning, a house with a lit lantern, crossed revolvers, a skull
 * in a hat. A map legend you have to learn is a map you read twice.
 */
const MARKERS = {
  /** Trailhead: the signpost the road starts at. */
  start: [
    '................',
    '................',
    '...WWWWWWWWW....',
    '...WxxxxxxxW....',
    '...WxWWWWWxW....',
    '...WxxxxxxxW....',
    '...WWWWWWWWW....',
    '.......Ww.......',
    '.......Ww.......',
    '.......Ww.......',
    '.......Ww.......',
    '.......Ww.......',
    '.....zrRRrz.....',
    '................',
    '................',
    '................',
  ],

  /**
   * A duel: two revolvers crossed, grips down and out.
   *
   * Every barrel carries an ink edge down its right side. It is the one marker
   * without a silhouette of its own — a shop is a box and a skull is a skull,
   * but two thin bars of steel laid on pale sand simply disappear, and the ink
   * is what gives them an outline to be read against.
   */
  duel: [
    '................',
    '..1k........1k..',
    '..Yk........Yk..',
    '...Yk......Yk...',
    '....Yk....Yk....',
    '.....Yk..Yk.....',
    '......YkYk......',
    '.......Yk.......',
    '......YkYk......',
    '.....Yk..Yk.....',
    '....Yk....Yk....',
    '...tk......tk...',
    '..ttk......ttk..',
    '..tTk......tTk..',
    '...kk......kk...',
    '................',
  ],

  /** A shop: false front, striped awning, two windows. */
  shop: [
    '................',
    '....wwwwwwww....',
    '...WWWWWWWWWW...',
    '...WXXXXXXXXW...',
    '...WXOOOOOOXW...',
    '...WXXXXXXXXW...',
    '..wWWWWWWWWWWw..',
    '..we1e1e1e1e1w..',
    '..wWWWWWWWWWWw..',
    '..wWcCcWWcCcWw..',
    '..wWcCcWWcCcWw..',
    '..wWWWWWWWWWWw..',
    '..wWWWXXXWWWWw..',
    '..wWWWXXXWWWWw..',
    '..MMMMMMMMMMMM..',
    '..NNNNNNNNNNNN..',
  ],

  /** An inn: pitched roof, chimney, and a lantern left burning by the door. */
  inn: [
    '................',
    '.......XX.......',
    '.......XX.......',
    '....qqqqqqqq....',
    '...qqqqqqqqqq...',
    '..qqqqqqqqqqqq..',
    '.qqqqqqqqqqqqqq.',
    '..wWWWWWWWWWWw..',
    '..wWcCcWWOoOWw..',
    '..wWcCcWWOoOWw..',
    '..wWWWWWWWWWWw..',
    '..wWWWXXXWWWWw..',
    '..wWWWXXXWWWWw..',
    '..MMMMMMMMMMMM..',
    '..NNNNNNNNNNNN..',
    '................',
  ],

  /** The boss: a skull wearing the hat. */
  boss: [
    '................',
    '.....kkkkkk.....',
    '....kkkkkkkk....',
    '....kkkkkkkk....',
    '..kkkkkkkkkkkk..',
    '..kkkkkkkkkkkk..',
    '....bbbbbbbb....',
    '...bbbbbbbbbb...',
    '...bbkkbbkkbb...',
    '...bbkkbbkkbb...',
    '....bbbkkbbb....',
    '....bbbbbbbb....',
    '....bBbBbBbB....',
    '.....bbbbbb.....',
    '................',
    '................',
  ],
};

/** Baked markers, cached per scale — the panel only ever asks for one. */
const markerCache = new Map();

/**
 * @param {number} scale multiple of the 16px source
 * @returns {Record<string, HTMLCanvasElement>}
 */
export function getMapMarkers(scale = 2) {
  const cached = markerCache.get(scale);
  if (cached) return cached;
  const baked = {};
  for (const [name, rows] of Object.entries(MARKERS)) {
    baked[name] = bake({ key: KEY, rows }, scale);
  }
  markerCache.set(scale, baked);
  return baked;
}

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------

/**
 * How each biome's ground looks from above.
 *
 * The ramps are the same ones the side-on art uses, so a map of the prairie and
 * a walk through the prairie are the same five greens. `ripples` and `blades`
 * pick which texture pass runs — sand lies in wind-blown arcs, grass stands up
 * in short strokes, and swapping the two is the fastest way to make a biome
 * look like the other one wearing a filter.
 *
 * `ponds` is how many pools of standing water to try to place, and `water`
 * says what they are made of. A prairie pond is blue because it is holding the
 * sky; a bayou pool is black because it is holding nothing, and the basin's
 * "ponds" are lava. Same routine, three completely different readings — which
 * is exactly the split that made it worth passing the colours in rather than
 * writing a second painter.
 */
const POND_WATER = {
  rim: PALETTE.grassDark,
  body: PALETTE.blueDark,
  top: PALETTE.blue,
  glint: PALETTE.blueLight,
  reed: PALETTE.grassDark,
};
const TERRAIN = {
  desert: {
    ground: PALETTE.sand,
    patches: [PALETTE.sandLight, PALETTE.sandMid],
    grit: [PALETTE.sandMid, PALETTE.sandDark],
    road: { worn: PALETTE.sandMid, dash: PALETTE.sandDeep, lit: PALETTE.sandLight },
    clearing: PALETTE.sandMid,
    range: { body: PALETTE.sandDark, light: PALETTE.sandMid, dark: PALETTE.sandDeep },
    edge: PALETTE.sandDeep,
    ripples: true,
    ponds: 0,
  },
  meadow: {
    ground: PALETTE.grass,
    patches: [PALETTE.grassLight, PALETTE.grassMid],
    grit: [PALETTE.grassMid, PALETTE.grassDark],
    road: { worn: PALETTE.soilLight, dash: PALETTE.soilDeep, lit: PALETTE.soil },
    clearing: PALETTE.soil,
    range: { body: PALETTE.hillHaze, light: PALETTE.hillHazeLight, dark: PALETTE.hillHazeDark },
    edge: PALETTE.grassDeep,
    blades: true,
    ponds: 2,
    water: POND_WATER,
    blooms: [PALETTE.bloomPink, PALETTE.bloomBlue, PALETTE.bloomCream],
  },

  /**
   * The pass. Ripples rather than blades — wind does the same thing to snow
   * that it does to sand, and sastrugi from above are the desert's arcs in a
   * colder ramp. The range along the top is the only place on any map where
   * the peaks are lighter than the ground they stand on.
   */
  snow: {
    ground: PALETTE.snow,
    patches: [PALETTE.snowLight, PALETTE.snowMid],
    grit: [PALETTE.snowMid, PALETTE.snowShade],
    road: { worn: PALETTE.snowMid, dash: PALETTE.snowDeep, lit: PALETTE.snowLight },
    clearing: PALETTE.snowMid,
    range: { body: PALETTE.snowShade, light: PALETTE.snowLight, dark: PALETTE.snowDeep },
    edge: PALETTE.snowDeep,
    ripples: true,
    ponds: 2,
    water: {
      rim: PALETTE.snowShade,
      body: PALETTE.iceDark,
      top: PALETTE.ice,
      glint: PALETTE.iceLight,
      reed: PALETTE.snowDeep,
    },
  },

  /**
   * The bayou. The most water of any map by a distance, and the darkest sheet
   * the panel ever shows — which is the point: it is the one map where the
   * road is easier to find than the ground is.
   */
  swamp: {
    ground: PALETTE.bog,
    patches: [PALETTE.bogLight, PALETTE.bogDark],
    grit: [PALETTE.bogDark, PALETTE.grassDeep],
    road: { worn: PALETTE.soil, dash: PALETTE.soilDeep, lit: PALETTE.soilLight },
    clearing: PALETTE.soilDark,
    range: { body: PALETTE.bogHaze, light: PALETTE.lichen, dark: PALETTE.bogDark },
    edge: PALETTE.bogDeep,
    blades: true,
    blooms: [PALETTE.algae, PALETTE.lichen, PALETTE.bogLight],
    ponds: 6,
    water: {
      rim: PALETTE.grassDeep,
      body: PALETTE.bogDeep,
      top: PALETTE.bogDark,
      glint: PALETTE.bogLight,
      reed: PALETTE.algae,
    },
  },

  /** The basin, where the standing water is not water. */
  inferno: {
    ground: PALETTE.char,
    patches: [PALETTE.charLight, PALETTE.charDark],
    grit: [PALETTE.charLight, PALETTE.charDark],
    road: { worn: PALETTE.charLight, dash: PALETTE.charDark, lit: PALETTE.grey },
    clearing: PALETTE.charLight,
    range: { body: PALETTE.charLight, light: PALETTE.grey, dark: PALETTE.charDark },
    edge: PALETTE.shadow,
    ripples: true,
    ponds: 4,
    water: {
      rim: PALETTE.charDark,
      body: PALETTE.magmaDeep,
      top: PALETTE.magma,
      glint: PALETTE.emberGlow,
      reed: PALETTE.charDark,
    },
  },

  /**
   * The void. No ponds at all — there is nothing out there to hold a liquid —
   * and the "range" along the top edge is the far shelf, drawn in the same
   * violet it is drawn in on the road.
   */
  void: {
    ground: PALETTE.voidRock,
    patches: [PALETTE.voidRockLight, PALETTE.voidRockDark],
    grit: [PALETTE.voidRockLight, PALETTE.voidRockDark],
    road: { worn: PALETTE.voidRockLight, dash: PALETTE.cosmicHigh, lit: PALETTE.astralDark },
    clearing: PALETTE.voidRockDark,
    range: { body: PALETTE.voidRockDark, light: PALETTE.voidRock, dark: PALETTE.cosmicHigh },
    edge: PALETTE.cosmicHigh,
    ripples: true,
    ponds: 0,
  },
};

function getMapTerrain(biomeId) {
  return TERRAIN[biomeId] || TERRAIN.desert;
}

/** Flat ground, then broad patches, so the base is never one dead colour. */
function paintGround(ctx, w, h, rng, terrain) {
  ctx.fillStyle = terrain.ground;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 70; i++) {
    const cx = rng.int(0, w);
    const cy = rng.int(0, h);
    const rx = rng.int(14, 46);
    const ry = Math.round(rx * rng.range(0.4, 0.8));
    ctx.fillStyle = rng.pick(terrain.patches);
    ctx.globalAlpha = rng.range(0.16, 0.34);
    fillEllipse(ctx, cx, cy, rx, ry);
  }
  ctx.globalAlpha = 1;
}

/** Wind ripples: shallow arcs, lit on top and shadowed underneath. */
function paintRipples(ctx, w, h, rng, terrain) {
  for (let i = 0; i < 180; i++) {
    const x0 = rng.int(-10, w);
    const y0 = rng.int(0, h);
    const len = rng.int(10, 34);
    const amp = rng.range(1.5, 4);
    for (let t = 0; t < len; t++) {
      const x = x0 + t;
      const y = Math.round(y0 - Math.sin((t / len) * Math.PI) * amp);
      ctx.fillStyle = terrain.grit[1];
      ctx.fillRect(x, y + 1, 1, 1);
      // The lit crest of the ripple is the biome's own brightest patch tone,
      // never sand: wind carves snow and cinder into the same arcs, and only
      // the colour of them changes from one world to the next.
      ctx.fillStyle = terrain.patches[0];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** Blades: short upright strokes, never single dots — a dot field reads as static. */
function paintBlades(ctx, w, h, rng, terrain) {
  for (let i = 0; i < 2600; i++) {
    const x = rng.int(0, w - 1);
    const y = rng.int(0, h - 1);
    ctx.fillStyle = rng.pick(terrain.grit);
    ctx.fillRect(x, y, 1, rng.int(1, 3));
  }
  if (!terrain.blooms) return;
  for (let i = 0; i < 260; i++) {
    const x = rng.int(0, w - 1);
    const y = rng.int(0, h - 1);
    ctx.fillStyle = rng.pick(terrain.blooms);
    ctx.fillRect(x, y, 1, 1);
  }
}

/** Grit for the sand: single pixels of the darker ramp steps. */
function paintGrit(ctx, w, h, rng, terrain) {
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = rng.pick(terrain.grit);
    ctx.fillRect(rng.int(0, w - 1), rng.int(0, h - 1), rng.chance(0.18) ? 2 : 1, 1);
  }
}

/**
 * Standing water, for the biomes that have any. A rim one step darker, glints
 * one step lighter, and reeds around the edge so it sits *in* the field rather
 * than on top of it.
 */
function paintPond(ctx, cx, cy, rx, ry, rng, water) {
  ctx.fillStyle = water.rim;
  fillEllipse(ctx, cx, cy, rx + 2, ry + 2);
  ctx.fillStyle = water.body;
  fillEllipse(ctx, cx, cy, rx, ry);
  ctx.fillStyle = water.top;
  fillEllipse(ctx, cx, cy - 1, rx - 2, ry - 2);
  for (let i = 0; i < 6; i++) {
    const gx = cx + rng.int(-rx + 3, rx - 6);
    const gy = cy + rng.int(-ry + 2, ry - 3);
    ctx.fillStyle = water.glint;
    ctx.fillRect(gx, gy, rng.int(2, 5), 1);
  }
  for (let i = 0; i < 14; i++) {
    const a = rng.range(0, Math.PI * 2);
    const gx = Math.round(cx + Math.cos(a) * rx);
    const gy = Math.round(cy + Math.sin(a) * ry);
    ctx.fillStyle = water.reed;
    ctx.fillRect(gx, gy - 3, 1, 4);
  }
}

/**
 * The range along the top edge: what the road is walking away from.
 *
 * Drawn in profile with the peaks pointing north, which is the one place a
 * pictorial map has always been allowed to cheat its viewpoint.
 */
function paintRange(ctx, w, band, rng, colors) {
  // Two rows. A single row of same-sized cones reads as a saw blade; a short
  // dark row behind a taller lit one reads as distance.
  const rows = [
    { count: Math.ceil(w / 46), low: 0.34, high: 0.62, body: colors.dark, light: colors.body },
    { count: Math.ceil(w / 54), low: 0.55, high: 0.98, body: colors.body, light: colors.light },
  ];
  for (const row of rows) {
    for (let i = 0; i < row.count; i++) {
      const cx = rng.int(-14, w + 14);
      const peak = rng.int(Math.round(band * row.low), Math.round(band * row.high));
      const half = Math.round(peak * rng.range(1.1, 2.1));
      // Every hill ends on its own line, and a third of them are mesas rather
      // than cones. Cones of one size all ending at one height is a saw blade.
      const foot = rng.int(0, 13);
      const flat = rng.chance(0.34) ? rng.range(0.2, 0.4) : 0;
      const grain = rng.range(0.5, 1.4);
      for (let dx = -half; dx <= half; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= w) continue;
        const k = Math.abs(dx) / half;
        // A flat crown for the mesas, then the slope, then a little erosion so
        // the profile is rock rather than geometry.
        const slope = flat && k < flat ? 1 : (1 - k) / (1 - flat || 1);
        const hgt = Math.round(
          peak * Math.max(0, slope) + Math.sin(dx * grain) * 1.2 + Math.sin(dx * 0.31) * 1.6,
        );
        if (hgt <= 0) continue;
        const top = band + foot - hgt;
        ctx.fillStyle = row.body;
        ctx.fillRect(x, top, 1, hgt);
        // Lit on the left face, shadowed on the right: one sun over the whole map.
        ctx.fillStyle = dx < 0 ? row.light : colors.dark;
        ctx.fillRect(x, top, 1, 2);
      }
    }
  }
  // The range dissolves into the ground rather than ending on a cut line.
  for (let y = 0; y < 10; y++) {
    ctx.globalAlpha = 0.1 * (1 - y / 10);
    ctx.fillStyle = colors.dark;
    ctx.fillRect(0, band + y, w, 1);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Map furniture
// ---------------------------------------------------------------------------

/**
 * The road: a worn band under a line of dashes.
 *
 * Dashes, because a solid line across a map reads as a border. The worn band
 * beneath them is what makes it a road somebody has actually used.
 */
function paintRoad(ctx, samples, terrain) {
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = terrain.road.worn;
  for (const p of samples) fillDisc(ctx, p.x, p.y, 5);
  ctx.globalAlpha = 1;

  samples.forEach((p, i) => {
    if (Math.floor(i / 3) % 2 !== 0) return;
    ctx.fillStyle = terrain.road.dash;
    ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
    ctx.fillStyle = terrain.road.lit;
    ctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 1);
  });
}

/** Trodden ground under a marker, so nothing stands on untouched grass. */
function paintClearing(ctx, x, y, terrain) {
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = terrain.clearing;
  fillEllipse(ctx, x, y + 2, 13, 8);
  ctx.globalAlpha = 0.3;
  fillEllipse(ctx, x, y + 2, 18, 11);
  ctx.globalAlpha = 1;
}

/**
 * X marks the spot — over the boss, because that is where the road ends.
 *
 * Drawn wider than the marker that lands on top of it, so the arms come out
 * past the skull's shoulders. An X the marker covers is an X nobody sees.
 */
function paintCross(ctx, x, y) {
  const arm = 21;
  for (let t = -arm; t <= arm; t++) {
    for (let k = -2; k <= 2; k++) {
      ctx.fillStyle = Math.abs(k) === 2 ? PALETTE.redDeep : PALETTE.red;
      ctx.fillRect(Math.round(x + t + k), Math.round(y + t), 1, 1);
      ctx.fillRect(Math.round(x + t + k), Math.round(y - t), 1, 1);
    }
  }
}

/** A four-point rose with a bone north arm, and the letter over it. */
function paintCompass(ctx, cx, cy) {
  const r = 15;
  for (let i = 0; i < 4; i++) {
    const dx = i === 1 ? 1 : i === 3 ? -1 : 0;
    const dy = i === 0 ? -1 : i === 2 ? 1 : 0;
    for (let t = 0; t <= r; t++) {
      const wdt = Math.max(0, Math.round((1 - t / r) * 4));
      for (let k = -wdt; k <= wdt; k++) {
        const x = Math.round(cx + dx * t + (dx === 0 ? k : 0));
        const y = Math.round(cy + dy * t + (dy === 0 ? k : 0));
        ctx.fillStyle = i === 0 ? PALETTE.bone : PALETTE.goldDark;
        if (k === 0) ctx.fillStyle = i === 0 ? PALETTE.white : PALETTE.gold;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  ctx.fillStyle = PALETTE.goldLight;
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
  drawTextCentered(ctx, 'N', cx + 1, cy - r - 11, {
    scale: 1,
    color: PALETTE.bone,
    shadow: PALETTE.shadow,
  });
}

// ---------------------------------------------------------------------------
// The bake
// ---------------------------------------------------------------------------

/**
 * Paint one whole map.
 *
 * Everything that never changes while the panel is open is baked into a single
 * canvas here — ground, scenery, road, the X and the compass — so dragging and
 * zooming is one `drawImage` per frame no matter how much is on the map. Only
 * the markers and the player's position are drawn live, on top, at a fixed size.
 *
 * @param {object} o
 * @param {string} o.biomeId
 * @param {number} o.width @param {number} o.height  in map units
 * @param {number} o.seed
 * @param {Array<{x:number,y:number}>} o.samples  the road, densely sampled
 * @param {Array<{x:number,y:number,type:string}>} o.nodes  where the markers go
 * @param {{color:string, alpha:number}|null} [o.tint]  the world's colour wash
 * @param {number} [o.topBand] height of the range along the top edge
 * @returns {HTMLCanvasElement}
 */
export function bakeMapBackground({
  biomeId,
  width,
  height,
  seed,
  samples,
  nodes,
  tint = null,
  topBand = 46,
}) {
  const terrain = getMapTerrain(biomeId);
  const env = getEnvironmentSprites(biomeId);
  const rng = makeRng(seed >>> 0);
  const { canvas, ctx } = makeCanvas(width, height);

  paintGround(ctx, width, height, rng, terrain);
  if (terrain.ripples) paintRipples(ctx, width, height, rng, terrain);
  if (terrain.blades) paintBlades(ctx, width, height, rng, terrain);
  else paintGrit(ctx, width, height, rng, terrain);

  for (let i = 0; i < (terrain.ponds || 0); i++) {
    const rx = rng.int(16, 30);
    const ry = Math.round(rx * rng.range(0.45, 0.7));
    const cx = rng.int(rx + 6, width - rx - 6);
    const cy = rng.int(topBand + ry + 10, height - ry - 10);
    if (nearRoad(samples, cx, cy, rx + 16)) continue;
    paintPond(ctx, cx, cy, rx, ry, rng, terrain.water || POND_WATER);
  }

  paintRange(ctx, width, topBand, rng, terrain.range);

  scatterProps(ctx, { width, height, topBand, rng, env, samples, nodes });

  paintRoad(ctx, samples, terrain);
  for (const node of nodes) paintClearing(ctx, node.x, node.y, terrain);

  const boss = nodes.find((n) => n.type === 'boss');
  if (boss) paintCross(ctx, boss.x, boss.y);

  if (tint) {
    ctx.globalAlpha = tint.alpha;
    ctx.fillStyle = tint.color;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  paintCompass(ctx, width - 34, height - 34);
  paintEdges(ctx, width, height, terrain);

  return canvas;
}

/**
 * The scenery.
 *
 * One prop per cell at most, exactly the rule the roadside uses (see the note
 * on scatter in `parallax.js`) — it is what stops the map clumping. Props keep
 * clear of the road and of every marker, and are drawn back to front so a tree
 * in front of another tree overlaps it the right way round.
 */
function scatterProps(ctx, { width, height, topBand, rng, env, samples, nodes }) {
  const cell = env.scatterCell ? Math.round(env.scatterCell * 0.7) : 46;
  const table = env.scatter || [];
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  if (!total) return;

  const placed = [];
  for (let cy = topBand - 6; cy < height; cy += cell) {
    for (let cx = 0; cx < width; cx += cell) {
      if (!rng.chance(0.72)) continue;
      const x = cx + rng.int(Math.round(cell * 0.25), Math.round(cell * 0.75));
      const y = cy + rng.int(Math.round(cell * 0.25), Math.round(cell * 0.75));
      if (x < 6 || x > width - 6 || y < topBand - 8 || y > height - 6) continue;
      if (nearRoad(samples, x, y, 22)) continue;
      if (nodes.some((n) => Math.abs(n.x - x) < 34 && Math.abs(n.y - y) < 30)) continue;

      let roll = rng() * total;
      let name = table[0].name;
      for (const entry of table) {
        roll -= entry.weight;
        if (roll <= 0) {
          name = entry.name;
          break;
        }
      }
      const sprite = env.props[name];
      if (sprite) placed.push({ sprite, x, y });
    }
  }

  placed.sort((a, b) => a.y - b.y);
  for (const p of placed) {
    // A contact shadow first: a prop dropped straight onto the ground floats.
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = PALETTE.shadow;
    fillEllipse(ctx, p.x, p.y, Math.max(4, Math.round(p.sprite.width * 0.4)), 3);
    ctx.globalAlpha = 1;
    ctx.drawImage(
      p.sprite,
      Math.round(p.x - p.sprite.width / 2),
      Math.round(p.y - p.sprite.height + 2),
    );
  }
}

/** The map darkens towards its edges, so it reads as a piece of country. */
function paintEdges(ctx, w, h, terrain) {
  const depth = 26;
  for (let i = 0; i < depth; i++) {
    ctx.globalAlpha = 0.5 * (1 - i / depth) ** 1.6;
    ctx.fillStyle = terrain.edge;
    ctx.fillRect(i, i, w - i * 2, 1);
    ctx.fillRect(i, h - i - 1, w - i * 2, 1);
    ctx.fillRect(i, i, 1, h - i * 2);
    ctx.fillRect(w - i - 1, i, 1, h - i * 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(0, 0, w, 2);
  ctx.fillRect(0, h - 2, w, 2);
  ctx.fillRect(0, 0, 2, h);
  ctx.fillRect(w - 2, 0, 2, h);
}

// ---------------------------------------------------------------------------
// Small geometry helpers
// ---------------------------------------------------------------------------

/** True when (x, y) is within `r` of any sampled point of the road. */
function nearRoad(samples, x, y, r) {
  const r2 = r * r;
  for (const p of samples) {
    const dx = p.x - x;
    if (dx > r || dx < -r) continue;
    const dy = p.y - y;
    if (dy > r || dy < -r) continue;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

/** Axis-aligned filled ellipse, drawn one scanline at a time to stay pixelly. */
function fillEllipse(ctx, cx, cy, rx, ry) {
  for (let y = -ry; y <= ry; y++) {
    const k = 1 - (y * y) / (ry * ry);
    if (k <= 0) continue;
    const half = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

function fillDisc(ctx, cx, cy, r) {
  fillEllipse(ctx, cx, cy, r, r);
}
