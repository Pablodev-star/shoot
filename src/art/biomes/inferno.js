/**
 * SHOOT! — Inferno biome art (Brimstone Basin).
 *
 * The fifth world: a floor of cooled basalt with the heat still coming up
 * through the cracks in it, cinder cones on the horizon and one of them lit.
 *
 * THE LAND IS DARK SO THAT THE LIGHT IS SOMETHING
 * ---------------------------------------------------------------------------
 * The obvious way to draw a place like this is to make it orange, and the
 * obvious way is wrong. An orange landscape with orange lava in it has nothing
 * to look at: the lava is the same value as the rock, the embers vanish into
 * the sky, and the traveller — who is drawn in warm skin and leather — is
 * camouflaged against the whole frame.
 *
 * So the rock here is nearly black, and violet rather than neutral (see the
 * `char` ramp in the palette: basalt beside orange light genuinely does go
 * blue, and a neutral grey next to magma reads as dirty snow). Every warm pixel
 * on screen is therefore *emitting* — a crack, a vent, an ember, a pool — and
 * because there are so few of them, each one carries. It is the same trick the
 * night sky uses in every other biome, run in the daytime.
 *
 * GLOW IS DRAWN, NEVER BLURRED
 * ---------------------------------------------------------------------------
 * There is no shadow-blur or radial gradient anywhere in this file. A glow is
 * three concentric steps — `magmaDeep` around `magma` around `emberGlow` — laid
 * on the pixel grid, which is what a glow was before anyone could afford to
 * blur one, and it survives being drawn at 1x and scaled up by four. See
 * `glowPatch`.
 *
 * Shading is otherwise the rule every biome follows: no ink outline, light from
 * the top left, a darker tone of the same ramp down the right and lower edges,
 * and a contact shadow where a prop meets the ground — except that here the
 * contact shadow is often a contact *light*, because what is under the prop is
 * frequently brighter than the prop is.
 *
 * SCALE
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels. A cinder mound comes to his knee, a
 * vent to his chest, and the basalt columns are the one thing here taller than
 * he is — nothing grows in the basin, so its skyline has to be made of rock.
 */

import { PALETTE } from '../palette.js';
import { makeCanvas } from '../pixel.js';
import { makeRng } from '../../core/rng.js';
import { LAYER_TILE_W, makeCloudLayer, makeRidgeLayer, speckle } from '../env-kit.js';

export const INFERNO_PROPS = {
  /**
   * A column of basalt, cracked across its width the way cooling rock always
   * cracks, and still hot in the seams. The glow is on the left face only —
   * the light is coming from the ground it stands in, not from the sky.
   */
  basaltColumn: [
    '..^%%$..',
    '.^%%%%$.',
    '.^%<%%$.',
    '.^%%%%$.',
    '.^%%%%$.',
    '.^<%%%$.',
    '.^%%%%$.',
    '.^%%<%$.',
    '.^%%%%$.',
    '.^%%%%$.',
    '.^<%%%$.',
    '.^%%%%$.',
    '.^%%%%$.',
    '.^%%<%$.',
    '.^%%%%$.',
    '^%%%%%%$',
    '^%%%%%%$',
    '><%%%%<>',
    '~><<<<>~',
  ],

  /** Its shorter neighbour. Nothing here stands alone; the basin broke evenly. */
  basaltStub: [
    '.^%%$.',
    '.^%%$.',
    '.^<%$.',
    '.^%%$.',
    '.^%%$.',
    '.^%<$.',
    '.^%%$.',
    '^%%%%$',
    '><%%<>',
    '~>><<~',
  ],

  /**
   * A fissure with the fire still in it. Widest in the middle and closed at
   * both ends, because a crack that runs off the edge of its own sprite reads
   * as a join between two tiles.
   */
  fissure: [
    '...$$$$$$$$$$....',
    '..$$>>>>>>$$$$...',
    '.$$><<<<<<<>>$$..',
    '$$><<~~~~<<<<>$$.',
    '$><<~~@@~~<<<<>$$',
    '$$><<~~~~<<<<>>$$',
    '.$$>><<<<<<>>$$..',
    '..$$$>>>>>>$$$...',
    '....$$$$$$$$.....',
  ],

  /**
   * A vent. The cone is built out of what it has thrown up, so it is coarse
   * all the way down, and the mouth of it is the brightest thing in the biome.
   */
  brimstoneVent: [
    '.....%%%.....',
    '....%$$$%....',
    '...%$>>>$%...',
    '..^%$><<>$%..',
    '..^%><@@<>%..',
    '.^%%$><<>$%%.',
    '.^%%%$>>$%%%.',
    '^%%#%%$$%%#%$',
    '^%#@#%%%%#@#$',
    '^%%#%%%%%%#%$',
    '^%%%%%%%%%%%$',
    '$><%%%%%%%<>$',
    '~>>><<<<>>>~.',
  ],

  /**
   * What is left of a tree that was here before the basin was. Charcoal all
   * the way through, with the last of the fire still working up the inside of
   * the trunk — which is why the glow is *inside* the silhouette and not
   * around it.
   */
  charredTree: [
    '..$...........',
    '..$$....$.....',
    '...$$..$$.....',
    '$...$$$$...$..',
    '.$$..$$$..$$..',
    '..$$.$<$.$$...',
    '...$$$<$$$....',
    '.....$<$......',
    '.....$<$......',
    '.$...$<$...$..',
    '..$$.$<$..$$..',
    '...$$$<$$$$...',
    '.....$<$......',
    '.....$<$......',
    '....$$<$$.....',
    '....$$<$$.....',
    '...^%$<$%$....',
    '..^%%%<%%%$...',
    '.$><<<<<<<>$..',
    '..~>>>>>>>~...',
  ],

  /** A pool of it, crusting over. The crust is the interesting part. */
  lavaPool: [
    '...$$$$$$$$$....',
    '..$>><<<<>>$$...',
    '.$><<~~~~<<<>$..',
    '$><~~@@@@~~<<>$.',
    '$<~~@@@@@@~~<<>$',
    '$><~~@@@@~~%<>$.',
    '.$><<~~~~<%%<>$.',
    '..$>><<<<>>$$$..',
    '...$$$$$$$$$....',
  ],

  /**
   * Brimstone: sulphur crystals grown around a warm crack. The only yellow in
   * the biome that is not fire, and the only thing in it that could be called
   * a plant without stretching the word too far.
   */
  sulfurCrystals: [
    '....@........',
    '...@#....@...',
    '...@#...@#...',
    '.@.@#..@#....',
    '.@#@#.@#.@...',
    '@#@#@#@#@#...',
    '@#%#%#%#%#@..',
    '^%%%%%%%%%%$.',
    '$><%%%%%<>$..',
    '.~>>><<>>~...',
  ],

  /** A cinder mound: loose scoria, too hot to sit on, glowing from underneath. */
  cinderMound: [
    '.....%%%%......',
    '...%%$$$$%%....',
    '..%$$%%%%$$%%..',
    '.%$$%%<%%%$$%%.',
    '%$%%%%%%<%%%$$%',
    '$%%<%%%%%%%<%%$',
    '$><%%<%%%<%%<>$',
    '~>>><<<<<<>>>~.',
  ],

  /**
   * A skull that has been through the fire. The sockets glow, because
   * something in the basin is still burning inside it — this is the only prop
   * in the game that is unambiguously supernatural, and it is placed rarely
   * enough that finding one is an event.
   */
  skullEmber: [
    '.b.......b.',
    '.bB.....Bb.',
    'bbB.....Bbb',
    'bbbBBBBBbbb',
    '.BbbbbbbbB.',
    '.Bb<bbb<bB.',
    '..bb~b~bb..',
    '..bB<<<Bb..',
    '...$><>$...',
    '...~>>~....',
  ],

  /**
   * An iron stake driven into the rock, glowing at the base where it goes in.
   * Somebody was marking a claim out here, and the basin took the rest of him.
   */
  ironStake: [
    '...Yy...',
    '...Yy...',
    '..vYyv..',
    '...Yy...',
    '...Yy...',
    '...Yy...',
    '..vYyv..',
    '...Yy...',
    '..~Yy~..',
    '.$><<>$.',
    '..~>>~..',
  ],

  /** Slag: what ran out of a vent, cooled, and never went anywhere. */
  slagFlow: [
    '.......$$$$$$....',
    '...$$$$>>>><<$$..',
    '.$$><<<<<<<<<<>$.',
    '$><<~~~<<~~<<<<>$',
    '$$>><<<<<<<<<>>$$',
    '..$$$>>>>>>>$$$..',
    '....$$$$$$$$$....',
  ],

  /** A rock the basin threw, still where it landed, with the strike under it. */
  emberRock: [
    '..^%%%$..',
    '.^%%%%%$.',
    '^%%%%%%%$',
    '^%%<%%%%$',
    '.^%%%%%$.',
    '..$%%%$..',
    '.$><<<>$.',
    '..~>>~...',
  ],

  /**
   * A bush that is on fire and has been for years. Burning scrub is the one
   * living silhouette in the basin, and it exists so that the eye has
   * something with a soft edge to land on between all the broken rock.
   */
  emberBush: [
    '...~..@..~...',
    '..~<~.@~.<~..',
    '.~<<~@@~<<~..',
    '~<<<<@@<<<<~.',
    '.<<<<<<<<<<~.',
    '..><<<<<<>>..',
    '..$>><<>>$$..',
    '.^%%$$$$%%%$.',
    '.$><<%%<<>$..',
    '..~>>>><~....',
  ],
};

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/**
 * A glow, drawn as three concentric steps on the pixel grid. Every hot thing
 * in the layers goes through here so they all cool off at the same rate.
 */
function glowPatch(ctx, x, y, r) {
  const rings = [
    { pad: r + 2, color: PALETTE.magmaDeep, alpha: 0.22 },
    { pad: r + 1, color: PALETTE.magma, alpha: 0.42 },
    { pad: r, color: PALETTE.emberGlow, alpha: 0.9 },
  ];
  for (const ring of rings) {
    ctx.globalAlpha = ring.alpha;
    ctx.fillStyle = ring.color;
    ctx.fillRect(x - ring.pad, y - Math.ceil(ring.pad / 2), ring.pad * 2 + 1, ring.pad + 1);
  }
  ctx.globalAlpha = 1;
}

const wrapX = (x) => ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;

/**
 * The cones, and the one of them that is awake.
 *
 * Same argument as the peaks in `biomes/snow.js`: the ridge generator sums
 * sines, a sine has no corner in it, and a volcano is nothing *but* corners —
 * two straight slopes meeting a flat, notched summit. Left to the generator
 * this horizon came out as two smooth brown hills with a fire on one of them,
 * which is a moor with a bonfire.
 *
 * A cinder cone is drawn instead: a trapezoid, wider at the foot than any
 * mountain, with a crater bitten out of the top. Four of them, and exactly one
 * lit — two eruptions on one skyline is a cartoon, and none at all is a
 * quarry.
 */
function cinderCones(ctx, heights, rng, height) {
  const cones = [];
  for (let i = 0; i < 4; i++) {
    cones.push({
      cx: rng.int(0, LAYER_TILE_W - 1),
      h: rng.int(14, 34),
      // Cinder cones are squat: a cone as steep as a mountain is a mountain.
      spread: rng.range(1.5, 2.4),
      crater: rng.int(3, 7),
    });
  }
  cones.sort((a, b) => a.h - b.h);
  const live = cones[cones.length - 1];

  for (const cone of cones) {
    const half = Math.round(cone.h * cone.spread);
    const foot = height - heights[cone.cx];
    const summit = foot - cone.h;
    for (let dx = -half; dx <= half; dx++) {
      const x = wrapX(cone.cx + dx);
      const k = Math.abs(dx) / half;
      const local = Math.round(cone.h * (1 - k) + Math.sin(dx * 1.1) * 0.8);
      if (local <= 1) continue;
      let top = foot - local;
      // The crater: the summit is not a point, it is a hole with two lips.
      const inCrater = Math.abs(dx) <= cone.crater;
      if (inCrater) top = summit + cone.crater - Math.abs(dx) + 2;
      // Down to this column's own plain height and no further, or the cone
      // gets vertical sides where the plain happens to sit lower than it does
      // under the summit — see the same note in `biomes/snow.js`.
      const bottom = Math.min(height, height - heights[x] + 2);
      if (top >= bottom) continue;
      for (let y = Math.max(0, top); y < bottom; y++) {
        const lit = dx < 0;
        ctx.fillStyle = y === top && !inCrater
          ? (lit ? PALETTE.grey : PALETTE.char)
          : (lit ? PALETTE.charLight : PALETTE.char);
        ctx.fillRect(x, y, 1, 1);
      }
      // The scree that has run down the outside of it, in streaks.
      if (!inCrater && k > 0.25 && rng.chance(0.22)) {
        ctx.fillStyle = PALETTE.charDark;
        ctx.fillRect(x, Math.min(top + rng.int(1, 4), bottom - 1), 1, rng.int(2, 6));
      }
    }

    if (cone !== live) continue;

    // --- the live one ---
    glowPatch(ctx, cone.cx, summit + 2, cone.crater - 1);

    /**
     * The plume. It widens and leans as it climbs, and it is drawn as a
     * column of overlapping runs rather than as scattered pixels: smoke has a
     * body, and a hundred single pixels drifting upwards is a swarm of flies.
     */
    for (let i = 0; i < 34; i++) {
      const t = i / 34;
      const y = summit - 1 - Math.round(t * 34);
      if (y < 0) break;
      const lean = Math.round(t * t * 14);
      const spread = 1 + Math.round(t * 6);
      const cx = cone.cx + lean + rng.int(-1, 1);
      ctx.globalAlpha = (1 - t) ** 1.4 * 0.55;
      ctx.fillStyle = t < 0.2 ? PALETTE.magmaDeep : t < 0.5 ? PALETTE.charLight : PALETTE.grey;
      for (let dx = -spread; dx <= spread; dx++) {
        if (rng.chance(0.25)) continue; // ragged edges, solid middle
        ctx.fillRect(wrapX(cx + dx), y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * Seams of lava running down the middle ridge. They follow the slope, they
 * branch once, and they die out before they reach the bottom of the layer —
 * a seam that runs the full height of a layer looks like a crack in the
 * canvas rather than in the rock.
 */
function lavaSeams(ctx, heights, rng, height) {
  for (let i = 0; i < 9; i++) {
    let x = rng.int(0, LAYER_TILE_W - 1);
    let y = height - heights[x] + rng.int(1, 4);
    const len = rng.int(4, 13);
    for (let t = 0; t < len; t++) {
      const px = ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;
      ctx.fillStyle = t < len * 0.4 ? PALETTE.magma : PALETTE.magmaDeep;
      ctx.fillRect(px, y, 1, 1);
      if (rng.chance(0.3)) {
        ctx.fillStyle = PALETTE.emberGlow;
        ctx.fillRect(px, y, 1, 1);
      }
      y += 1;
      x += rng.int(-1, 1);
      if (y >= height) break;
    }
  }
}

/**
 * The near crags: a black ridge with heat leaking out from behind its crest,
 * so the rise closest to the player is rimmed in orange instead of being a
 * silhouette with nothing behind it.
 */
function cragRim(ctx, heights, rng, height) {
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const top = height - heights[x];
    const prev = heights[(x - 1 + LAYER_TILE_W) % LAYER_TILE_W];
    if (heights[x] > prev) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = PALETTE.magmaDeep;
      ctx.fillRect(x, top - 1, 1, 1);
      ctx.globalAlpha = 1;
    }
    if (rng.chance(0.05)) {
      ctx.fillStyle = PALETTE.magma;
      ctx.fillRect(x, top + rng.int(1, 4), 1, rng.int(1, 3));
    }
  }
}

/**
 * The ground: a cracked basalt floor with fire underneath it.
 *
 * The cracks are generated as a network rather than as scattered lines —
 * they start at the top edge, run down towards the camera and fork on the way,
 * which is how a cooling crust actually fractures. Each one is drawn dark
 * first and then lit along its middle, so the crack is a *gap* with heat
 * showing through it rather than an orange line painted onto the rock.
 */
function makeInfernoGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  ctx.fillStyle = PALETTE.char;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);
  // The road itself is trodden flatter and paler than the crust around it.
  ctx.fillStyle = PALETTE.charLight;
  ctx.fillRect(0, 0, LAYER_TILE_W, 3);
  ctx.fillStyle = PALETTE.char;
  ctx.fillRect(0, 3, LAYER_TILE_W, 1);

  // Plates: broad polygons of slightly different value, so the floor is a
  // pavement rather than one sheet.
  for (let i = 0; i < 44; i++) {
    const cx = rng.int(0, LAYER_TILE_W);
    const cy = rng.int(0, height);
    const rx = rng.int(10, 34);
    const ry = rng.int(4, 12);
    ctx.globalAlpha = rng.range(0.18, 0.4);
    ctx.fillStyle = rng.chance(0.5) ? PALETTE.charLight : PALETTE.charDark;
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  /**
   * --- the crack network ---
   *
   * A crack walks in a direction rather than straight down the screen. The
   * first version stepped one pixel towards the camera every iteration and
   * wandered less than a pixel sideways, so twenty of them came out as twenty
   * near-vertical orange lines standing on the road — the floor read as a
   * ploughed field, and the one thing a lava field is not is furrowed.
   *
   * They now travel mostly *across* the plate, the way a fracture in a cooling
   * crust does, they are shorter, and only about half their length is lit: a
   * crack that glows end to end is a strip light.
   */
  const drawCrack = (x0, y0, len, dx0, dy0, depth) => {
    let x = x0;
    let y = y0;
    let dx = dx0;
    let dy = dy0;
    for (let t = 0; t < len; t++) {
      const px = ((Math.round(x) % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;
      const py = Math.round(y);
      if (py < 1 || py >= height) return;
      // The crack: a dark lip either side of it, and the heat in the middle.
      // Wider nearer the camera, because it is nearer.
      const w = py > height * 0.6 ? 2 : 1;
      ctx.fillStyle = PALETTE.charDark;
      ctx.fillRect(px - 1, py - 1, w + 2, 3);
      const lit = t < len * 0.55;
      ctx.fillStyle = lit ? PALETTE.magmaDeep : PALETTE.charDark;
      ctx.fillRect(px, py, w, 1);
      if (lit && rng.chance(0.3)) {
        ctx.fillStyle = rng.chance(0.25) ? PALETTE.emberGlow : PALETTE.magma;
        ctx.fillRect(px, py, w, 1);
      }
      x += dx;
      y += dy;
      // It wanders, slowly, rather than jittering: a crack has a direction.
      dx += rng.range(-0.16, 0.16);
      dy += rng.range(-0.1, 0.1);
      dy = Math.max(-0.5, Math.min(0.5, dy));
      // Forks, once, and never from the last third — a crack that splits as it
      // dies reads as a mistake.
      if (depth < 1 && t > 2 && t < len * 0.6 && rng.chance(0.07)) {
        drawCrack(x, y, rng.int(4, 10), dy * 2.4, -dx * 0.35, depth + 1);
      }
    }
  };
  for (let i = 0; i < 16; i++) {
    drawCrack(
      rng.int(0, LAYER_TILE_W - 1),
      rng.int(2, height - 4),
      rng.int(8, 26),
      rng.chance(0.5) ? rng.range(0.7, 1.3) : rng.range(-1.3, -0.7),
      rng.range(-0.3, 0.3),
      0,
    );
  }

  // Vents: bright mouths sitting in the crust, mostly down near the camera
  // where there is room for the glow to spread.
  for (let i = 0; i < 9; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(Math.round(height * 0.35), height - 6);
    glowPatch(ctx, x, y, rng.int(1, 3));
  }

  // Ash drifted into the low corners of the crust, and cinder grit over
  // everything: the crust of a lava field is loose, not polished.
  for (let i = 0; i < 30; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(4, height - 2);
    ctx.globalAlpha = rng.range(0.1, 0.28);
    ctx.fillStyle = PALETTE.grey;
    ctx.fillRect(x, y, rng.int(4, 16), 1);
  }
  ctx.globalAlpha = 1;
  speckle(ctx, rng, {
    from: 4,
    to: height - 1,
    count: 360,
    colors: [PALETTE.charLight, PALETTE.charDark],
  });

  // And the shadow the crust falls into towards the camera. It is deep here:
  // there is no sky light down among the rocks, only what the cracks give.
  const near = Math.round(height * 0.58);
  for (let y = near; y < height; y++) {
    const k = (y - near) / (height - near);
    ctx.globalAlpha = k * 0.7;
    ctx.fillStyle = PALETTE.charDark;
    ctx.fillRect(0, y, LAYER_TILE_W, 1);
  }
  ctx.globalAlpha = 1;

  return canvas;
}

// ---------------------------------------------------------------------------
// Ambient
// ---------------------------------------------------------------------------

/**
 * The air of the basin, which is the busiest air in the game because it is the
 * only one carrying two populations that move in opposite directions:
 *
 *   embers  rise, wander sideways, pulse, and go out. Brightest at night, but
 *           never absent — this is not weather, it is the ground breathing
 *   ash     falls, slowly, and is nearly invisible against the dark rock until
 *           it crosses something lit
 *
 * The two of them crossing is the whole effect. Either alone reads as dust.
 */
function createInfernoAmbient(seed) {
  const rng = makeRng(seed >>> 0);
  let clock = 0;

  const spawnEmber = (fresh) => ({
    x: rng(),
    y: fresh ? rng.range(0.6, 1.05) : rng.range(0.96, 1.06),
    vy: rng.range(-0.09, -0.03),
    sway: rng.range(0.004, 0.016),
    rate: rng.range(700, 2000),
    phase: rng.range(0, Math.PI * 2),
    life: rng.range(0.5, 1),
    big: rng.chance(0.2),
  });

  const embers = Array.from({ length: 40 }, () => spawnEmber(true));

  const ash = Array.from({ length: 26 }, () => ({
    x: rng(),
    y: rng(),
    vy: rng.range(0.012, 0.045),
    vx: rng.range(-0.02, -0.004),
    phase: rng.range(0, Math.PI * 2),
    a: rng.range(0.12, 0.34),
  }));

  return {
    update(dt) {
      clock += dt;
      const step = dt / 1000;
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y += e.vy * step;
        e.x += Math.sin(clock / e.rate + e.phase) * e.sway * step;
        // An ember does not leave the top of the screen; it burns out.
        if (e.y < 1 - e.life) embers[i] = spawnEmber(false);
      }
      for (const a of ash) {
        a.y += a.vy * step;
        a.x += a.vx * step;
        if (a.y > 1.05) {
          a.y = -0.05;
          a.x = rng();
        }
        if (a.x < -0.05) a.x = 1.05;
      }
    },

    render(ctx, view, sky) {
      const s = view.scale;
      // Embers read hardest against a dark sky, so they gain at night — but
      // they never drop below half strength, because the basin is lit from
      // below and the sun has very little to do with it.
      const heat = 0.55 + sky.stars * 0.45;

      ctx.fillStyle = PALETTE.grey;
      for (const a of ash) {
        ctx.globalAlpha = a.a * (0.5 + sky.light * 0.5);
        ctx.fillRect(
          Math.round((a.x * view.w) / s) * s,
          Math.round((a.y * view.h) / s) * s,
          s,
          s,
        );
      }
      ctx.globalAlpha = 1;

      for (const e of embers) {
        const flicker = 0.6 + 0.4 * Math.sin(clock / (e.rate * 0.3) + e.phase);
        // Fading as it climbs: an ember that reaches the top of the screen at
        // full brightness is a spark from something off-frame, not from here.
        const fade = Math.min(1, (e.y - (1 - e.life)) / (e.life * 0.6));
        const a = heat * flicker * fade;
        if (a < 0.04) continue;
        const x = Math.round((e.x * view.w) / s) * s;
        const y = Math.round((e.y * view.h) / s) * s;
        if (e.big) {
          ctx.globalAlpha = a * 0.2;
          ctx.fillStyle = PALETTE.magmaDeep;
          ctx.fillRect(x - s, y - s, s * 3, s * 3);
        }
        ctx.globalAlpha = Math.min(1, a * 0.7);
        ctx.fillStyle = PALETTE.magma;
        ctx.fillRect(x, y, s, s);
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = PALETTE.emberGlow;
        ctx.fillRect(x, y, s, Math.max(1, Math.round(s / 2)));
      }
      ctx.globalAlpha = 1;
    },
  };
}

// ---------------------------------------------------------------------------

export const INFERNO_ART = {
  id: 'inferno',

  props: INFERNO_PROPS,

  /**
   * Four layers of black rock would be one black rock. What separates them is
   * the light *between* them: the far cones carry the erupting plume, the
   * middle ridge carries seams running down its face, and the near crags carry
   * a rim of heat leaking over their crest. Each layer is therefore read
   * against the glow of the one behind it, which is the only depth cue that
   * works when everything in the frame is the same value.
   */
  buildLayers: () => ({
    /**
     * Not weather cloud — this is the smoke the basin makes for itself.
     *
     * The first pass gave it a `magmaDeep` belly, and against a blue daytime
     * sky the result was a row of red-and-grey boulders apparently floating
     * over the horizon: a lit underside only reads as lit when the thing above
     * it is dark, and at noon it is not. The belly is the darkest char instead,
     * and the only warm thing in the sky is the plume coming off the live cone
     * — which is where the light in this world is actually coming from.
     */
    clouds: makeCloudLayer({
      seed: 6161,
      height: 58,
      count: 7,
      size: [5, 11],
      sag: 3,
      tones: [PALETTE.grey, PALETTE.charLight, PALETTE.charDark],
    }),
    far: makeRidgeLayer({
      seed: 2727,
      height: 86,
      // The plain the cones stand on. `cinderCones` draws the cones.
      baseline: 26,
      amplitude: 9,
      roughness: 0.4,
      colors: { body: PALETTE.charLight, light: PALETTE.grey, dark: PALETTE.char },
      decorate: cinderCones,
    }),
    mid: makeRidgeLayer({
      seed: 8484,
      height: 68,
      baseline: 25,
      amplitude: 14,
      roughness: 0.65,
      colors: { body: PALETTE.char, light: PALETTE.charLight, dark: PALETTE.charDark },
      decorate: lavaSeams,
    }),
    crags: makeRidgeLayer({
      seed: 1919,
      height: 40,
      baseline: 18,
      amplitude: 9,
      roughness: 0.95,
      colors: { body: PALETTE.charDark, light: PALETTE.char, dark: PALETTE.shadow },
      crest: 2,
      decorate: cragRim,
    }),
    ground: makeInfernoGround({ seed: 7070, height: 72 }),
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -110 },
    { name: 'far', speed: 0.15, y: -86 },
    { name: 'mid', speed: 0.4, y: -60 },
    { name: 'crags', speed: 0.7, y: -40 },
    { name: 'ground', speed: 1.0, y: 0 },
  ],

  /**
   * Weighted so the common roll is broken rock and the rare roll is fire.
   * Every lit prop in this table is a landmark by construction — there are so
   * few warm pixels in the frame that one glowing thing owns the screen — so
   * they are spaced out by being made rare rather than by any placement rule.
   */
  scatter: [
    { name: 'emberRock', weight: 17 },
    { name: 'cinderMound', weight: 15 },
    { name: 'basaltStub', weight: 13 },
    { name: 'fissure', weight: 11 },
    { name: 'slagFlow', weight: 9 },
    { name: 'basaltColumn', weight: 8 },
    { name: 'sulfurCrystals', weight: 7 },
    { name: 'lavaPool', weight: 6 },
    { name: 'charredTree', weight: 5 },
    { name: 'brimstoneVent', weight: 4 },
    { name: 'emberBush', weight: 3 },
    { name: 'ironStake', weight: 3 },
    { name: 'skullEmber', weight: 2 },
  ],

  scatterCell: 62,

  groundFill: PALETTE.charDark,

  /** Cinder, kicked up and briefly lit from below. */
  dust: 'rgba(255, 127, 34, 0.32)',

  /** Buildings out here are braced on cooled slag. */
  structureGround: { r: PALETTE.charDark, s: PALETTE.char },

  ambient: createInfernoAmbient,
};
