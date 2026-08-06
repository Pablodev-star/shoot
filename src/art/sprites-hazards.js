/**
 * SHOOT! — Hazard landmarks.
 *
 * The thing a world special puts on the horizon: the volcano, the twister, the
 * hornet tree, the hanging cornice, the drowned cypress and the rift.
 *
 * WHY THESE ARE BUILT AND NOT TYPED
 * ---------------------------------------------------------------------------
 * Every other sprite in the game is a character map, and it should be: a
 * revolver is sixteen pixels wide and somebody has to decide what each one of
 * them is. These are sixty-four wide and forty tall, and a mountain drawn that
 * way is two thousand five hundred characters nobody can read, edit or check —
 * which is exactly why the parallax ridges, the cloud decks and the ground
 * strips have always been built by the generators in src/art/env-kit.js
 * instead. A landmark is terrain. It is built like terrain.
 *
 * What is hand-decided is the SHAPE: the profile of the cone, where the crater
 * dips, how far down the flank the lava runs. Those are the few lines of
 * arithmetic at the top of each builder, and they are the part worth reading.
 *
 * TWO LAYERS, FOR THE SAME REASON THE FIGHT HAS TWO
 * ---------------------------------------------------------------------------
 * Each landmark comes back as a `body` and a set of `glow` frames.
 *
 *   body   rock, snow, wood, water. It is TERRAIN, so the duel scene draws it
 *          before the backdrop and lets the hour of the day fall on it — a
 *          volcano lit like noon at midnight is a cardboard cut-out.
 *   glow   lava, wisp-light, the inside of a rift. It is EMITTING, so it is
 *          drawn after the light, exactly like the muzzle flash (see the note
 *          in src/art/sprites-fx.js). Three frames, held on a slow clock, so
 *          the fire in the crater moves without anything having to animate it.
 *
 * Everything the landmark throws — rock, hornets, snow, gas — belongs to the
 * duel scene, not here: it is in flight, so it has physics rather than art.
 */

import { PALETTE } from './palette.js';
import { makeCanvas } from './pixel.js';
import { makeRng } from '../core/rng.js';

/** Every landmark is authored on this canvas, in source pixels. */
export const HAZARD_W = 64;
export const HAZARD_H = 44;

/** Fill one source pixel. Everything below draws through this. */
function px(ctx, x, y, color, w = 1, h = 1) {
  if (!color) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** A blank landmark-sized canvas. */
function sheet() {
  return makeCanvas(HAZARD_W, HAZARD_H);
}

// ---------------------------------------------------------------------------
// 5 · The volcano — the one everything else here was generalised out of
// ---------------------------------------------------------------------------

/**
 * The cone.
 *
 * `profile(dx)` is the whole shape: inside the crater the rock DROPS as you go
 * towards the middle (that is the dip you can see fire in), and outside it the
 * flank falls away on a slight curve rather than a straight line, because a
 * straight-sided triangle reads as a pyramid and a volcano is a pile of what
 * it threw.
 */
const CRATER = 7;
const HALF = 30;
const RIM_Y = 9;
/** Where the flank meets the ground it is standing on. */
const FOOT_Y = HAZARD_H - 1;

function volcanoProfile(dx) {
  if (dx <= CRATER) return RIM_Y + (CRATER - dx) * 0.55;
  const k = (dx - CRATER) / (HALF - CRATER);
  return RIM_Y + k ** 1.35 * (FOOT_Y - RIM_Y);
}

function buildVolcano() {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x10ff);
  const cx = HAZARD_W / 2;

  for (let x = 0; x < HAZARD_W; x++) {
    const dx = Math.abs(x - cx);
    if (dx > HALF) continue;
    const top = Math.round(volcanoProfile(dx));
    px(ctx, x, top, PALETTE.char, 1, HAZARD_H - top);
    // The sun is over the player's shoulder, so the left flank keeps a lit
    // rim and the right one falls into its own shadow.
    px(ctx, x, top, x < cx ? PALETTE.charLight : PALETTE.charDark, 1, 2);
    if (dx > HALF - 3) px(ctx, x, top, PALETTE.charDark, 1, HAZARD_H - top);
  }
  // Old flows, cold: the grain that stops the cone reading as a flat triangle.
  for (let i = 0; i < 150; i++) {
    const x = rng.int(4, HAZARD_W - 5);
    const dx = Math.abs(x - cx);
    if (dx > HALF - 1) continue;
    const top = Math.round(volcanoProfile(dx));
    const y = rng.int(top + 2, HAZARD_H - 1);
    px(ctx, x, y, rng.chance(0.55) ? PALETTE.charDark : PALETTE.charLight);
  }
  return canvas;
}

/**
 * What is burning in it. Three frames: the crater's own fire, and two lava
 * runs down the flanks that lengthen and shorten as the cone breathes.
 */
function buildVolcanoGlow() {
  const cx = HAZARD_W / 2;
  return [0, 1, 2].map((frame) => {
    const { canvas, ctx } = sheet();
    const rng = makeRng(0x20ff + frame * 977);

    // The crater. Deepest colour at the rim, brightest in the middle, which is
    // how a hole full of fire reads — the light is coming from under it.
    for (let x = cx - CRATER; x <= cx + CRATER; x++) {
      const dx = Math.abs(x - cx);
      const top = Math.round(volcanoProfile(dx));
      const depth = 2 + Math.round((CRATER - dx) * 0.5) + (frame === 1 ? 1 : 0);
      px(ctx, x, top, PALETTE.magmaDeep, 1, depth);
      if (dx < CRATER - 1) px(ctx, x, top + 1, PALETTE.magma, 1, Math.max(1, depth - 1));
      if (dx < CRATER - 3) px(ctx, x, top + 2, PALETTE.emberGlow, 1, Math.max(1, depth - 2));
    }

    // Two runs down the outside, one either side, wandering a pixel at a time.
    for (const side of [-1, 1]) {
      let x = cx + side * (CRATER - 1);
      const reach = HAZARD_H - (frame === 2 ? 4 : 10);
      for (let y = RIM_Y + 2; y < reach; y++) {
        const dx = Math.abs(x - cx);
        if (dx > HALF - 2) break;
        if (y < volcanoProfile(dx)) {
          x += side;
          continue;
        }
        px(ctx, x, y, PALETTE.magmaDeep, 2, 1);
        px(ctx, x, y, PALETTE.magma);
        if (rng.chance(0.3)) px(ctx, x, y, PALETTE.emberGlow);
        x += side * (rng.chance(0.55) ? 1 : 0);
      }
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// 1 · The dust devil
// ---------------------------------------------------------------------------

/**
 * A twister is a stack of bands that are wide at the top and closed at the
 * bottom, and the only thing that makes it look like it is turning is the
 * bands sliding across each other. So the three frames are the same column
 * with the band phase moved on — no other animation, and none needed.
 */
function buildTwister(frame) {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x30dd + frame * 131);
  const cx = HAZARD_W / 2;
  for (let y = 2; y < HAZARD_H; y++) {
    const k = (y - 2) / (HAZARD_H - 3);
    // Wide at the head, pinched at the foot, with a lean into the road.
    const half = Math.max(1.5, 14 * (1 - k) ** 0.75 + 1);
    const lean = Math.sin(k * 3.1 + frame) * 3;
    const band = Math.sin(y * 0.7 + frame * 2.1) * 0.5 + 0.5;
    const left = Math.round(cx + lean - half);
    const width = Math.max(2, Math.round(half * 2));
    px(ctx, left, y, band > 0.5 ? PALETTE.sand : PALETTE.sandDark, width, 1);
    px(ctx, left, y, PALETTE.sandLight, 1, 1);
    px(ctx, left + width - 1, y, PALETTE.sandDeep, 1, 1);
    // Grit thrown clear of the column.
    if (rng.chance(0.25)) px(ctx, left - rng.int(1, 4), y, PALETTE.sandMid);
    if (rng.chance(0.25)) px(ctx, left + width + rng.int(0, 3), y, PALETTE.sandMid);
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// 2 · The hornet tree
// ---------------------------------------------------------------------------

function buildHornetTree() {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x40bb);
  const cx = HAZARD_W / 2;

  // Trunk, thickening towards the root.
  for (let y = 8; y < HAZARD_H; y++) {
    const w = 3 + Math.round(((y - 8) / (HAZARD_H - 8)) * 5);
    px(ctx, cx - Math.floor(w / 2), y, PALETTE.woodDark, w, 1);
    px(ctx, cx - Math.floor(w / 2), y, PALETTE.wood, 1, 1);
  }
  // Four dead limbs, each one a walk out and up from the trunk.
  for (const [startY, dir, len] of [[10, -1, 16], [14, 1, 18], [20, -1, 13], [24, 1, 11]]) {
    let x = cx;
    let y = startY;
    for (let i = 0; i < len; i++) {
      x += dir;
      if (rng.chance(0.5)) y -= 1;
      px(ctx, x, y, PALETTE.woodDark, 2, 1);
      if (rng.chance(0.3)) px(ctx, x, y - 1, PALETTE.woodDeep);
    }
  }
  // The nest: a grey paper lantern hanging in the crook of it.
  const nx = cx + 4;
  const ny = 17;
  for (let y = 0; y < 13; y++) {
    const w = Math.round(9 * Math.sin((y / 13) * Math.PI) + 2);
    px(ctx, nx - Math.floor(w / 2), ny + y, PALETTE.boneDark, w, 1);
    px(ctx, nx - Math.floor(w / 2), ny + y, PALETTE.bone, 1, 1);
    if (y % 3 === 1) px(ctx, nx - Math.floor(w / 2) + 1, ny + y, PALETTE.grey, Math.max(1, w - 2), 1);
  }
  // The mouth of it, which is the only black on the whole thing.
  px(ctx, nx - 1, ny + 11, PALETTE.ink, 3, 2);
  return canvas;
}

// ---------------------------------------------------------------------------
// 3 · The hanging cornice
// ---------------------------------------------------------------------------

/**
 * A crag with a lip of snow curled over the far side of it. The `glow` frames
 * are not light here — they are the CRACK, which opens across the lip as the
 * thing gets ready to go. A hazard that is about to fire has to show it in the
 * art and not only in the sky.
 */
function buildCornice() {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x50cc);
  for (let x = 0; x < HAZARD_W; x++) {
    // A single asymmetric peak: long shallow left shoulder, short right drop.
    const k = x / HAZARD_W;
    const top = Math.round(6 + (k < 0.62 ? (0.62 - k) * 30 : (k - 0.62) * 62));
    if (top >= HAZARD_H) continue;
    px(ctx, x, top, PALETTE.snowDeep, 1, HAZARD_H - top);
    px(ctx, x, top, PALETTE.snowShade, 1, 4);
    px(ctx, x, top, PALETTE.snowLight, 1, 2);
    if (rng.chance(0.2)) px(ctx, x, top + rng.int(4, 10), PALETTE.snowMid);
  }
  // The lip itself: snow that has been blown out past the rock under it.
  for (let i = 0; i < 16; i++) {
    const x = 38 + i;
    const y = 6 + Math.round(i * 0.55);
    px(ctx, x, y - 3, PALETTE.snowLight, 1, 4);
    px(ctx, x, y + 1, PALETTE.snow, 1, 2);
  }
  return canvas;
}

function buildCorniceGlow() {
  return [0, 1, 2].map((frame) => {
    const { canvas, ctx } = sheet();
    // The crack, opening a little further on each frame.
    for (let i = 0; i < 14 + frame * 2; i++) {
      const x = 36 + i;
      const y = 4 + Math.round(i * 0.5) + (i % 2);
      px(ctx, x, y, PALETTE.iceDark, 1, 1 + frame);
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// 4 · Blackdamp — the drowned cypress and the vent under it
// ---------------------------------------------------------------------------

function buildCypress() {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x60aa);
  const cx = HAZARD_W / 2;

  /**
   * A trunk that leans, because nothing in the bayou stands straight — and a
   * PALE one. The first pass drew it in the bog ramp, which is the correct
   * colour for wood that has been standing in black water for a century and
   * the wrong one for a landmark: against a biome painted in those same
   * greens it disappeared, and a hazard nobody can find is a hazard nobody can
   * fight around. Dead wood bleached by the sun is both true and legible.
   */
  for (let y = 4; y < HAZARD_H - 6; y++) {
    const x = cx + Math.round((y - 4) * -0.12);
    const w = 4 + Math.round((y / HAZARD_H) * 4);
    px(ctx, x - Math.floor(w / 2), y, PALETTE.rot, w, 1);
    px(ctx, x - Math.floor(w / 2), y, PALETTE.boneDark, 1, 1);
    px(ctx, x + Math.floor(w / 2) - 1, y, PALETTE.bogDeep, 1, 1);
    if (rng.chance(0.18)) px(ctx, x + rng.int(-3, 3), y, PALETTE.lichen);
  }
  // Bare limbs, and the moss hanging off them — the one shape that says bayou.
  for (const [startY, dir, len] of [[6, -1, 14], [9, 1, 15], [15, -1, 10]]) {
    let x = cx;
    let y = startY;
    for (let i = 0; i < len; i++) {
      x += dir;
      if (rng.chance(0.4)) y -= 1;
      px(ctx, x, y, PALETTE.rot, 2, 1);
      px(ctx, x, y, PALETTE.boneDark, 1, 1);
      if (rng.chance(0.35)) px(ctx, x, y + 1, PALETTE.lichen, 1, rng.int(2, 6));
    }
  }
  // The water it is standing in, and the roots under that.
  for (let x = 0; x < HAZARD_W; x++) {
    px(ctx, x, HAZARD_H - 6, PALETTE.bogLight, 1, 1);
    px(ctx, x, HAZARD_H - 5, PALETTE.bog, 1, 3);
    px(ctx, x, HAZARD_H - 2, PALETTE.bogDeep, 1, 2);
    if (rng.chance(0.12)) px(ctx, x, HAZARD_H - 6, PALETTE.algae);
  }
  return canvas;
}

function buildCypressGlow() {
  return [0, 1, 2].map((frame) => {
    const { canvas, ctx } = sheet();
    const rng = makeRng(0x70aa + frame * 313);
    // The vent: gas already coming up through the water, before it lets go.
    for (let i = 0; i < 14; i++) {
      const x = 20 + rng.int(0, 24);
      const y = HAZARD_H - 6 - rng.int(0, 4 + frame * 3);
      px(ctx, x, y, PALETTE.algae);
      if (rng.chance(0.4)) px(ctx, x, y - 1, PALETTE.lichen);
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// 6 · The rift
// ---------------------------------------------------------------------------

/**
 * A tear, not a hole: a tall lens shape with nothing inside it and a hot edge
 * where the two sides have been pulled apart. It hangs in the air rather than
 * standing on the ground, which is why its body is almost empty — what the
 * scene draws is the light.
 */
function buildRift() {
  const { canvas, ctx } = sheet();
  const cx = HAZARD_W / 2;
  for (let y = 2; y < HAZARD_H - 6; y++) {
    const k = (y - 2) / (HAZARD_H - 8);
    const half = Math.max(0, Math.round(Math.sin(k * Math.PI) * 7));
    if (!half) continue;
    px(ctx, cx - half, y, PALETTE.cosmicHigh, half * 2, 1);
  }
  return canvas;
}

function buildRiftGlow() {
  const cx = HAZARD_W / 2;
  return [0, 1, 2].map((frame) => {
    const { canvas, ctx } = sheet();
    const rng = makeRng(0x80ee + frame * 719);
    for (let y = 2; y < HAZARD_H - 6; y++) {
      const k = (y - 2) / (HAZARD_H - 8);
      const half = Math.max(0, Math.round(Math.sin(k * Math.PI) * (7 + frame)));
      if (!half) continue;
      px(ctx, cx - half, y, PALETTE.purpleDark, 1, 1);
      px(ctx, cx + half - 1, y, PALETTE.purpleDark, 1, 1);
      px(ctx, cx - half, y, PALETTE.astral, 1, 1);
      px(ctx, cx + half - 1, y, PALETTE.astralLight, 1, 1);
      // The seam down the middle, which is the only thing actually torn.
      if (rng.chance(0.5)) px(ctx, cx + rng.int(-1, 0), y, PALETTE.astralLight);
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

const BUILDERS = {
  volcano: () => ({ body: buildVolcano(), glow: buildVolcanoGlow(), plume: 'smoke' }),
  duststorm: () => ({
    // The twister has no still frame: the body IS the animation, so all three
    // frames are bodies and it has no glow at all.
    body: buildTwister(0),
    frames: [buildTwister(0), buildTwister(1), buildTwister(2)],
    glow: [],
    plume: null,
  }),
  hornetTree: () => ({ body: buildHornetTree(), glow: [], plume: null }),
  cornice: () => ({ body: buildCornice(), glow: buildCorniceGlow(), plume: null }),
  blackdamp: () => ({ body: buildCypress(), glow: buildCypressGlow(), plume: null }),
  rift: () => ({ body: buildRift(), glow: buildRiftGlow(), plume: null }),
};

const cache = new Map();

/**
 * The art for one hazard, built once.
 * @returns {{body: HTMLCanvasElement, glow: HTMLCanvasElement[],
 *            frames?: HTMLCanvasElement[], plume: string|null}}
 */
export function getHazardArt(id) {
  if (cache.has(id)) return cache.get(id);
  const build = BUILDERS[id] || BUILDERS.volcano;
  const art = build();
  cache.set(id, art);
  return art;
}
