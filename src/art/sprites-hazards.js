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
 * them is. These are sixty-four wide and forty-four tall, and a mountain drawn
 * that way is two thousand five hundred characters nobody can read, edit or
 * check — which is exactly why the parallax ridges, the cloud decks and the
 * ground strips have always been built by the generators in
 * src/art/env-kit.js instead. A landmark is terrain. It is built like terrain.
 *
 * What is hand-decided is the SHAPE: the profile of the cone, where the crater
 * dips, how far down the flank the lava runs. Those are the few lines of
 * arithmetic at the top of each builder, and they are the part worth reading.
 *
 * THREE LAYERS, BECAUSE A LANDMARK IS THREE DIFFERENT KINDS OF THING
 * ---------------------------------------------------------------------------
 *   body    rock, snow, wood, water. It is TERRAIN, so the duel scene draws it
 *           before the backdrop and lets the hour of the day fall on it — a
 *           volcano lit like noon at midnight is a cardboard cut-out.
 *   glow    lava, wisp-light, the inside of a rift. It is EMITTING, so it is
 *           drawn after the light, exactly like the muzzle flash (see the note
 *           in src/art/sprites-fx.js). Frames on a slow clock, so the fire in
 *           the crater moves without anything having to animate it.
 *   charge  only the rift has one, and it is the whole point of that special:
 *           six frames of a core winding up, indexed by how full the thing is
 *           rather than by the clock. See the `charge` pattern in
 *           src/duel/duel-hazard.js — the art has to say "it is nearly ready"
 *           or the shot at the end of it is a mugging.
 *
 * WHY THEY WERE ALL REDRAWN
 * ---------------------------------------------------------------------------
 * The first pass built each of these as its silhouette and stopped there, and
 * a silhouette at this size is a symbol: the twister was a stack of centred
 * bands that read as a cone of ice cream, the cornice was two white lines
 * meeting in a V, the rift was an empty lens. They were legible and they were
 * flat — nothing in them turned, dripped, hung or spun, so the biggest object
 * in the frame was the only thing in the frame not doing anything.
 *
 * So every one of them now has three things it did not: FORM (strata on the
 * cone, bark on the trunk, rock under the snow), MOTION built into the frames
 * rather than left to the particles (the twister's bands spiral, the rift's
 * arms turn, the gas breathes), and a WEIGHT that reads at a glance — scree at
 * the foot of the volcano, a root flare on the cypress, a debris skirt under
 * the funnel. Everything the landmark THROWS still belongs to the duel scene:
 * it is in flight, so it has physics rather than art.
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

/**
 * A filled ellipse, one row at a time.
 *
 * Three of the six are built out of these — a galaxy, a nest, a skirt of grit —
 * and a circle drawn with `arc()` on a canvas this small comes back
 * antialiased, which puts colours in the sprite that are not in the palette.
 */
function ellipse(ctx, cx, cy, rx, ry, color) {
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const k = (y - cy) / ry;
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - k * k)));
    if (half < 0) continue;
    px(ctx, cx - half, y, color, half * 2 + 1, 1);
  }
}

/** A straight run of pixels between two points, `thick` wide. */
function line(ctx, x0, y0, x1, y1, color, thick = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    px(ctx, Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), color, thick, thick);
  }
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

  /**
   * STRATA, WHICH IS WHERE THE HEIGHT COMES FROM
   * -------------------------------------------------------------------------
   * A cone of one flat colour with grain sprinkled on it is a triangle with
   * noise on it — there is nothing in it to read a slope off. What a stratovolcano
   * actually is, is layers: every eruption leaves a band, and those bands run
   * PARALLEL TO THE PROFILE. Drawing them that way is the single change that
   * makes this thing look like it has a far side.
   */
  for (let band = 0; band < 7; band++) {
    const drop = 4 + band * 5;
    for (let x = 0; x < HAZARD_W; x++) {
      const dx = Math.abs(x - cx);
      if (dx > HALF - 1) continue;
      const top = Math.round(volcanoProfile(dx)) + drop + (x % 3 === 0 ? 1 : 0);
      if (top >= HAZARD_H - 1) continue;
      px(ctx, x, top, band % 2 ? PALETTE.charDark : PALETTE.charLight);
    }
  }

  // Old flows, cold: the grain that stops the cone reading as a flat triangle.
  for (let i = 0; i < 170; i++) {
    const x = rng.int(4, HAZARD_W - 5);
    const dx = Math.abs(x - cx);
    if (dx > HALF - 1) continue;
    const top = Math.round(volcanoProfile(dx));
    const y = rng.int(top + 2, HAZARD_H - 1);
    px(ctx, x, y, rng.chance(0.55) ? PALETTE.charDark : PALETTE.charLight);
  }

  /**
   * Two gullies cut down the face — the tracks the last flows took, dry now.
   * They are the only near-vertical lines on a shape made entirely of
   * horizontals, which is what stops the strata reading as a stack of plates.
   */
  for (const side of [-1, 1]) {
    let x = cx + side * (CRATER + 2);
    for (let y = RIM_Y + 5; y < HAZARD_H - 2; y++) {
      if (Math.abs(x - cx) > HALF - 2) break;
      if (y < volcanoProfile(Math.abs(x - cx))) {
        x += side;
        continue;
      }
      px(ctx, x, y, PALETTE.charDark, 2, 1);
      px(ctx, x + side, y, PALETTE.char);
      x += side * (rng.chance(0.5) ? 1 : 0);
    }
  }

  // The scree it has thrown at its own feet, fanning out past the flank so the
  // mountain sits IN the ground rather than on it.
  for (let i = 0; i < 90; i++) {
    const x = rng.int(1, HAZARD_W - 2);
    const dx = Math.abs(x - cx);
    if (dx < HALF - 4) continue;
    const y = rng.int(HAZARD_H - 4, HAZARD_H - 1);
    px(ctx, x, y, rng.chance(0.5) ? PALETTE.charDark : PALETTE.char);
  }
  return canvas;
}

/**
 * What is burning in it. Three frames: the crater's own fire, the vents that
 * have opened along the flank, and two lava runs that lengthen and shorten as
 * the cone breathes.
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
    // The light the crater throws on its own rim: the two horns either side of
    // the notch are lit from INSIDE, which is the tell that the hole is deep.
    for (const side of [-1, 1]) {
      const x = cx + side * CRATER;
      const top = Math.round(volcanoProfile(CRATER));
      px(ctx, x, top, PALETTE.magma, 1, 2);
      px(ctx, x + side, top + 1, PALETTE.magmaDeep, 1, 2);
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

    /**
     * Vents. Half a dozen holes down the flanks with fire showing through, and
     * they MOVE between frames — a mountain with one fixed set of lit pixels
     * is a mountain with a light bulb in it.
     */
    for (let i = 0; i < 14; i++) {
      const x = rng.int(cx - HALF + 4, cx + HALF - 4);
      const dx = Math.abs(x - cx);
      const top = Math.round(volcanoProfile(dx));
      if (top >= HAZARD_H - 3) continue;
      const y = rng.int(top + 4, HAZARD_H - 2);
      px(ctx, x, y, PALETTE.magmaDeep);
      if (rng.chance(0.45)) px(ctx, x, y, PALETTE.magma);
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// 1 · The dust devil
// ---------------------------------------------------------------------------

/**
 * A TWISTER IS A STACK OF RINGS, NOT A FILLED SHAPE
 * ---------------------------------------------------------------------------
 * Two attempts at this went wrong the same way. Draw the funnel as a solid
 * silhouette and you get a wedge — a flat blade of sand with a hard edge, and
 * no amount of banding painted onto it reads as rotation, because a solid
 * shape has no inside to see into.
 *
 * What a dust devil actually is, is AIR YOU CAN SEE THROUGH with grit going
 * round in it. So it is built as a column of flattened rings — ellipse
 * OUTLINES, not fills — each one a little narrower than the one above and each
 * turned a little further round than its neighbour:
 *
 *   `axis(k)`  the spine bends: it hangs out of the cloud, curves back under
 *              itself, and only touches down at the bottom
 *   `half(k)`  wide and loose at the head, pinched hard at the foot
 *   the rings  are spaced so the gaps between them are the road showing
 *              through, which is what stops it reading as a cut-out
 *
 * The rotation is free: each ring carries a bright arc at an angle that is a
 * function of its height and the frame, so the highlights spiral up the column
 * and the whole thing turns without a single pixel being animated by hand.
 */
function twisterAxis(k) {
  return HAZARD_W / 2 + Math.sin(k * 2.0 - 0.5) * 6 - 2;
}

function twisterHalf(k) {
  return Math.max(1.8, 15 * (1 - k) ** 1.6 + 1.6);
}

/** One flattened ring of the column, lit on the arc facing `turn`. */
function twisterRing(ctx, cx, cy, rx, ry, turn, rng) {
  const steps = Math.max(10, Math.round(rx * 3));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    // The near half of the ring — the bottom of the ellipse — is in front, so
    // it is the solid one; the far half is dropped to a dotted line, which is
    // the cheapest possible way to draw "you are looking through it".
    const near = Math.sin(a) > 0;
    if (!near && rng.chance(0.45)) continue;
    // How close this point is to the lit arc, 0..1.
    const lit = (Math.cos(a - turn) + 1) / 2;
    const color =
      lit > 0.82 ? PALETTE.sandLight : lit > 0.5 ? PALETTE.sand : near ? PALETTE.sandDark : PALETTE.sandDeep;
    px(ctx, x, y, color);
  }
}

function buildTwister(frame) {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x30dd + frame * 131);
  const phase = frame * 1.6;
  const TOP = 4;

  /**
   * The head: the wall cloud it is hanging out of, spread across the top of
   * the frame. Without it the funnel is a shape that starts nowhere.
   */
  for (let x = 2; x < HAZARD_W - 2; x++) {
    const d = Math.abs(x - twisterAxis(0)) / 30;
    const depth = Math.round(6 * (1 - d * d));
    if (depth <= 0) continue;
    px(ctx, x, TOP - 3, PALETTE.sandDark, 1, depth);
    px(ctx, x, TOP - 3, PALETTE.sandMid, 1, Math.max(1, depth - 3));
    if (rng.chance(0.35)) px(ctx, x, TOP - 4 + rng.int(0, 1), PALETTE.sandLight);
  }

  // The debris skirt: what it has torn off the road, kicked out in a low fan.
  const footX = twisterAxis(1);
  for (let i = 0; i < 130; i++) {
    const spread = rng.range(-20, 20);
    const reach = 1 - Math.abs(spread) / 22;
    const y = HAZARD_H - 1 - Math.round(rng.range(0, 8) * reach * reach);
    px(ctx, footX + spread, y, rng.chance(0.5) ? PALETTE.sandMid : PALETTE.sandDark);
    if (rng.chance(0.25)) px(ctx, footX + spread * 1.2, y - rng.int(1, 4), PALETTE.sandLight);
  }

  // The column itself, ring by ring from the cloud down to the road.
  const RINGS = 21;
  for (let i = 0; i < RINGS; i++) {
    const k = i / (RINGS - 1);
    const cy = TOP + k * (HAZARD_H - TOP - 2);
    const rx = twisterHalf(k);
    twisterRing(ctx, twisterAxis(k), cy, rx, Math.max(1, rx * 0.3), phase + k * 5.5, rng);
    // A dim core down the middle, so the far wall of the funnel is not simply
    // the background: it is the inside of something.
    if (rx > 3) {
      px(ctx, twisterAxis(k) - rx * 0.4, cy, PALETTE.sandDark, Math.max(1, Math.round(rx * 0.8)), 1);
    }
    // Grit torn clear, loosest at the head.
    const looseness = 0.5 * (1 - k) + 0.1;
    if (rng.chance(looseness)) px(ctx, twisterAxis(k) - rx - rng.int(1, 5), cy, PALETTE.sandMid);
    if (rng.chance(looseness)) px(ctx, twisterAxis(k) + rx + rng.int(1, 5), cy, PALETTE.sandMid);
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// 2 · The hornet tree
// ---------------------------------------------------------------------------

function buildHornetTree() {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x40bb);
  const cx = HAZARD_W / 2 - 2;

  /**
   * A trunk with a ROOT FLARE. A rectangle that gets three pixels wider at the
   * bottom is a post; a dead cottonwood spreads hard into the ground over the
   * last few rows, and that flare is most of what makes it read as a tree
   * rather than as a plank with sticks glued to it.
   */
  for (let y = 7; y < HAZARD_H; y++) {
    const k = (y - 7) / (HAZARD_H - 7);
    const flare = k > 0.78 ? ((k - 0.78) / 0.22) ** 2 * 9 : 0;
    const w = Math.round(4 + k * 4 + flare);
    const x = Math.round(cx - w / 2 + Math.sin(k * 2.4) * 1.5);
    px(ctx, x, y, PALETTE.woodDark, w, 1);
    px(ctx, x, y, PALETTE.wood, 1, 1);
    px(ctx, x + w - 1, y, PALETTE.woodDeep, 1, 1);
    // Bark: broken vertical grooves, never a full-height line.
    if (rng.chance(0.5)) px(ctx, x + rng.int(1, Math.max(1, w - 2)), y, PALETTE.woodDeep);
    if (rng.chance(0.25)) px(ctx, x + rng.int(1, Math.max(1, w - 2)), y, PALETTE.woodLight);
  }

  /**
   * Six dead limbs, each one a walk out and up that TAPERS — three pixels
   * thick where it leaves the trunk and one at the tip — with a fork halfway
   * along. A dead cottonwood is mostly negative space; the forks are what put
   * the sky back between the branches.
   */
  const limb = (x0, y0, dir, len, thick) => {
    let x = x0;
    let y = y0;
    for (let i = 0; i < len; i++) {
      x += dir;
      if (rng.chance(0.55)) y -= 1;
      const t = Math.max(1, Math.round(thick * (1 - i / len)));
      px(ctx, x, y, PALETTE.woodDark, t, t);
      px(ctx, x, y, PALETTE.wood);
      if (i === Math.floor(len * 0.55) && len > 8) limb(x, y, dir, Math.round(len * 0.45), 1);
    }
  };
  limb(cx, 9, -1, 17, 3);
  limb(cx, 13, 1, 18, 3);
  limb(cx, 19, -1, 14, 2);
  limb(cx, 23, 1, 12, 2);
  limb(cx, 8, 1, 9, 2);
  limb(cx, 27, -1, 9, 2);

  /**
   * The nest. A paper lantern is not a diamond: it is a teardrop built out of
   * horizontal COURSES, each one a strip the wasps added, and the ridges
   * between them are the whole reason it reads as paper. It hangs off the
   * right-hand limb with a stalk, so it is attached to something.
   */
  const nx = cx + 9;
  const ny = 14;
  const NEST_H = 17;
  px(ctx, nx, ny - 3, PALETTE.woodDark, 1, 3);
  for (let y = 0; y < NEST_H; y++) {
    const k = y / (NEST_H - 1);
    // Fat at a third of the way down and drawn to a point at the bottom.
    const w = Math.round(11 * Math.sin(Math.min(1, k * 1.15) * Math.PI) ** 0.7 + 1);
    const left = nx - Math.floor(w / 2);
    px(ctx, left, ny + y, PALETTE.boneDark, w, 1);
    px(ctx, left, ny + y, PALETTE.bone, 2, 1);
    px(ctx, left + w - 1, ny + y, PALETTE.grey, 1, 1);
    // The courses: one shaded row every third, curved by starting it inboard.
    if (y % 3 === 2) px(ctx, left + 1, ny + y, PALETTE.grey, Math.max(1, w - 2), 1);
  }
  // The mouth of it, which is the only black on the whole thing.
  px(ctx, nx - 1, ny + NEST_H - 4, PALETTE.ink, 3, 3);
  px(ctx, nx - 2, ny + NEST_H - 5, PALETTE.greyDark, 5, 1);
  return canvas;
}

/**
 * The nest is not lit — but it is OCCUPIED, and that is what the glow layer is
 * for here: the hornets crawling on the paper and the loose ones turning
 * around it, moving between frames. A landmark whose whole threat is that
 * something lives in it has to have something living in it.
 */
function buildHornetTreeGlow() {
  const cx = HAZARD_W / 2 - 2;
  const nx = cx + 9;
  const ny = 14;
  return [0, 1, 2].map((frame) => {
    const { canvas, ctx } = sheet();
    const rng = makeRng(0x41bb + frame * 613);
    for (let i = 0; i < 16; i++) {
      const a = rng.range(0, Math.PI * 2) + frame * 0.7;
      const r = rng.range(6, 15);
      const x = Math.round(nx + Math.cos(a) * r);
      const y = Math.round(ny + 8 + Math.sin(a) * r * 0.7);
      px(ctx, x, y, PALETTE.gold);
      if (rng.chance(0.5)) px(ctx, x + 1, y, PALETTE.ink);
    }
    // The ones on the paper, closest to the mouth.
    for (let i = 0; i < 7; i++) {
      px(ctx, nx + rng.int(-4, 4), ny + rng.int(6, 15), rng.chance(0.5) ? PALETTE.gold : PALETTE.goldLight);
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// 3 · The hanging cornice
// ---------------------------------------------------------------------------

/**
 * ROCK FIRST, THEN SNOW ON TOP OF IT
 * ---------------------------------------------------------------------------
 * The first cornice was a white silhouette that filled the frame corner to
 * corner: two long diagonals meeting in a V, which at a glance is a chevron.
 * A crag reads as a crag when there is something UNDER the white — so this is
 * built in two passes, a dark blue-grey rock profile and then a snow load
 * lying on the shallow side of it, thinning where the slope steepens exactly
 * as real snow does.
 *
 * And the lip actually OVERHANGS: the snow at the top continues out past the
 * rock beneath it into empty air, with icicles hanging off the underside. That
 * overhang is the entire premise of the special — it is a thing that cannot
 * hold — and it was the one part the old drawing did not say.
 */
const CORNICE_PEAK = 26;

/**
 * Three pieces, and the middle one is the point: a shallow shoulder climbing
 * from the left, a hard drop off the far side of the summit, and then a talus
 * slope that carries the mass out to the bottom right corner. Without that
 * third piece the crag falls off the edge of its own canvas and leaves a hole
 * in the frame where the ground should be.
 */
function corniceProfile(x) {
  if (x < CORNICE_PEAK) return 11 + (CORNICE_PEAK - x) * 0.52;
  if (x < 44) return 11 + (x - CORNICE_PEAK) * 1.45;
  return Math.min(HAZARD_H - 1, 37 + (x - 44) * 0.32);
}

/**
 * The underside of the snow lip, out over the drop.
 *
 * It droops at 0.9 a pixel against the rock's 1.45, so the gap under it opens
 * to about eight pixels and stops. A shallower slope was tried and the lip
 * ended up twenty pixels clear of the mountain — which does not read as an
 * overhang, it reads as a second white object floating next to a black one.
 */
const corniceLip = (x) => 9 + Math.max(0, x - CORNICE_PEAK) * 0.9;

function buildCornice() {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x50cc);

  for (let x = 0; x < HAZARD_W; x++) {
    const top = Math.round(corniceProfile(x));
    if (top >= HAZARD_H) continue;
    /**
     * THE ROCK IS DARK, AND IT HAS TO BE
     * -------------------------------------------------------------------------
     * This was drawn in the snow ramp first, on the reasonable-sounding grounds
     * that it is a mountain in a snowfield. It disappeared — pale blue-grey
     * rock on a pale blue-grey biome under a pale blue sky, and the only thing
     * that read at all was a white line where the summit was. It is the exact
     * mistake the cypress two builders down was rewritten to fix.
     *
     * So the crag is BASALT, in the same violet-grey char ramp the basin's rock
     * uses, and the snow sits on top of it as the brightest thing in the frame.
     * Dark rock under white snow is both what an alpine face actually looks
     * like and the only version of it anybody can find at a glance.
     */
    px(ctx, x, top, PALETTE.charLight, 1, HAZARD_H - top);
    px(ctx, x, top + 4, PALETTE.char, 1, Math.max(1, HAZARD_H - top - 4));
    px(ctx, x, top + 1, PALETTE.charLight, 1, 3);
    // The shadow the valley keeps. It has to start BELOW the rock it is
    // shading and arrive by degrees — a flat band across the bottom of the
    // frame at a fixed height reads as a box the mountain is standing in.
    const dark = Math.max(top + 4, HAZARD_H - 12 + Math.round(Math.sin(x * 0.4) * 1.5));
    if (dark < HAZARD_H - 1) {
      px(ctx, x, dark + rng.int(0, 2), PALETTE.charDark, 1, HAZARD_H - dark);
    }
    // Broken strata across the face, so the drop has scale in it. They step
    // down to the right with the rock, which is what makes it one mountain
    // rather than a wall with scratches on it.
    if ((x * 3 + Math.round(top)) % 11 < 4) {
      px(ctx, x, top + 5 + Math.round(x * 0.12), PALETTE.charDark, 1, 2);
    }
    if ((x * 5 + Math.round(top)) % 13 < 5) {
      px(ctx, x, top + 13 + Math.round(x * 0.1), PALETTE.charLight, 1, 1);
    }
    if (rng.chance(0.3)) px(ctx, x, top + rng.int(4, 16), PALETTE.charDark);
    // Ice in the cracks, and snow caught on the ledges: the two things that
    // stop a dark face going to mud.
    if (rng.chance(0.1)) px(ctx, x, top + rng.int(5, 18), PALETTE.iceDark, 1, rng.int(1, 3));
    if (rng.chance(0.18)) px(ctx, x, top + rng.int(6, 15), PALETTE.snowShade, rng.int(1, 3), 1);

    // The snow load, thick on the shallow shoulder and thin on the steep face.
    const slope = x < CORNICE_PEAK ? 0.52 : x < 44 ? 1.45 : 0.32;
    const load = Math.max(0, Math.round(5 - slope * 1.9));
    if (load) {
      px(ctx, x, top, PALETTE.snow, 1, load + 1);
      px(ctx, x, top, PALETTE.snowLight, 1, Math.max(1, load - 1));
      px(ctx, x, top + load + 1, PALETTE.snowMid);
    }
  }

  /**
   * THE OVERHANG, WHICH IS THE WHOLE PREMISE
   * -------------------------------------------------------------------------
   * Snow carried past the edge of the summit by the wind and left curling over
   * nothing. It runs almost level out from the peak while the rock beneath it
   * drops away at three times the rate, so there is a widening wedge of open
   * air under it — and a thing that cannot hold is the one idea this special
   * needs the player to have before it lets go.
   */
  for (let i = 0; i < 13; i++) {
    const x = CORNICE_PEAK + i;
    const y = Math.round(corniceLip(x));
    const thick = Math.max(2, 7 - Math.round(i * 0.4));
    px(ctx, x, y - thick, PALETTE.snowLight, 1, thick);
    px(ctx, x, y, PALETTE.snow, 1, 2);
    // The underside, which never sees the sun.
    px(ctx, x, y + 2, PALETTE.snowShade, 1, 1);
    px(ctx, x, y + 3, PALETTE.iceDark, 1, 1);
    // Icicles, longer the further out along the lip they hang.
    if (rng.chance(0.5)) px(ctx, x, y + 4, PALETTE.iceLight, 1, rng.int(1, 2 + Math.round(i * 0.4)));
  }
  // Spindrift already coming off the lip, blown out over the drop.
  for (let i = 0; i < 30; i++) {
    const x = rng.int(CORNICE_PEAK + 4, HAZARD_W - 1);
    px(ctx, x, rng.int(4, Math.round(corniceLip(x)) + 8), PALETTE.snowLight);
  }

  /**
   * And a drift banked against its foot. Dark rock stopping dead on a flat
   * line across a white snowfield reads as a cut-out somebody pasted on; a
   * few rows of snow piled up the base is what puts the crag IN the pass
   * rather than in front of it.
   */
  for (let x = 0; x < HAZARD_W; x++) {
    const depth = Math.max(2, Math.round(4 + Math.sin(x * 0.28) * 1.8 + (rng.chance(0.4) ? 1 : 0)));
    px(ctx, x, HAZARD_H - depth, PALETTE.snowMid, 1, depth);
    px(ctx, x, HAZARD_H - depth, PALETTE.snow, 1, 1);
    if (rng.chance(0.2)) px(ctx, x, HAZARD_H - depth - 1, PALETTE.snowLight);
  }
  return canvas;
}

/**
 * The crack. Not light — this is the one glow layer in the file that is a
 * DARK mark, because what a cornice has to advertise before it goes is a
 * fracture, and it opens a little further on every frame.
 */
function buildCorniceGlow() {
  return [0, 1, 2].map((frame) => {
    const { canvas, ctx } = sheet();
    const rng = makeRng(0x51cc + frame * 401);
    /**
     * It runs back from the middle of the lip into the shoulder behind it,
     * following the snow line — a crack across the face of the drop would be a
     * crack in the rock, and rock is not what is about to come off.
     */
    for (let i = 0; i < 26; i++) {
      const x = CORNICE_PEAK - 14 + i;
      // Along the snow line itself: the shoulder's own profile behind the
      // summit, and the underside of the lip in front of it.
      const snow = x < CORNICE_PEAK ? corniceProfile(x) : corniceLip(x);
      const y = Math.round(snow) + 2 + (rng.chance(0.4) ? 1 : 0);
      const depth = 1 + frame + (i > 14 ? 1 : 0);
      px(ctx, x, y, PALETTE.charDark, 1, depth);
      // A lit edge on the upper lip of the fracture, so it reads as OPEN.
      px(ctx, x, y - 1, PALETTE.snowLight);
      if (frame === 2 && rng.chance(0.4)) px(ctx, x, y + depth, PALETTE.snowMid);
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// 4 · Blackdamp — the drowned cypress and the vent under it
// ---------------------------------------------------------------------------

const WATER_Y = HAZARD_H - 9;

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
   *
   * The base flares into a cypress BUTTRESS — the skirt a swamp tree grows
   * where it meets the water — which is the shape that says bayou before any
   * of the moss does.
   */
  const trunkX = (y) => cx + Math.round((y - 4) * -0.14) + 3;
  for (let y = 3; y < WATER_Y + 2; y++) {
    const k = y / WATER_Y;
    const buttress = k > 0.72 ? ((k - 0.72) / 0.28) ** 2 * 11 : 0;
    const w = Math.round(5 + k * 3 + buttress);
    const x = trunkX(y) - Math.floor(w / 2);
    px(ctx, x, y, PALETTE.rot, w, 1);
    px(ctx, x, y, PALETTE.boneDark, 1, 1);
    px(ctx, x + w - 1, y, PALETTE.bogDeep, 1, 1);
    if (rng.chance(0.3)) px(ctx, x + rng.int(1, Math.max(1, w - 2)), y, PALETTE.bogDark);
    if (rng.chance(0.14)) px(ctx, x + rng.int(0, Math.max(0, w - 1)), y, PALETTE.lichen);
  }

  // Bare limbs, and the moss hanging off them — the one shape that says bayou.
  const limb = (y0, dir, len) => {
    let x = trunkX(y0);
    let y = y0;
    for (let i = 0; i < len; i++) {
      x += dir;
      if (rng.chance(0.45)) y -= 1;
      const t = Math.max(1, 2 - Math.floor((i / len) * 2));
      px(ctx, x, y, PALETTE.rot, t + 1, t);
      px(ctx, x, y, PALETTE.boneDark, 1, 1);
      // Spanish moss: a hanging veil, longer the further out the limb goes.
      if (rng.chance(0.4)) {
        const drop = rng.int(2, 4 + Math.round((i / len) * 7));
        px(ctx, x, y + t, PALETTE.lichen, 1, drop);
        if (rng.chance(0.5)) px(ctx, x, y + t + drop - 1, PALETTE.algae);
      }
    }
  };
  limb(5, -1, 15);
  limb(8, 1, 16);
  limb(13, -1, 11);
  limb(17, 1, 10);

  /**
   * The water, and the trunk lying in it. A flat band of green at the bottom
   * of the frame is a floor; a REFLECTION is water, and it costs four lines.
   */
  for (let x = 0; x < HAZARD_W; x++) {
    px(ctx, x, WATER_Y, PALETTE.bogDark, 1, HAZARD_H - WATER_Y);
    px(ctx, x, WATER_Y, PALETTE.bogLight, 1, 1);
    px(ctx, x, HAZARD_H - 4, PALETTE.bogDeep, 1, 4);
  }
  for (let y = WATER_Y + 1; y < HAZARD_H - 2; y++) {
    // The mirrored trunk, broken up so it reads as lying on a moving surface.
    // It is drawn PALE against dark water rather than dark against light: what
    // a reflection is, is the bright thing above it arriving upside down.
    const src = WATER_Y - (y - WATER_Y) * 2;
    const w = Math.round(6 + (src / WATER_Y) * 3);
    if (((y * 3) % 5) < 3) {
      px(ctx, trunkX(src) - Math.floor(w / 2), y, PALETTE.bogHaze, w, 1);
      px(ctx, trunkX(src) - Math.floor(w / 2), y, PALETTE.rot, 1, 1);
    }
  }
  // Scum and ripple: short horizontal dashes only, never a curve.
  for (let i = 0; i < 40; i++) {
    const x = rng.int(0, HAZARD_W - 4);
    const y = rng.int(WATER_Y, HAZARD_H - 3);
    px(ctx, x, y, rng.chance(0.4) ? PALETTE.algae : PALETTE.bogLight, rng.int(1, 3), 1);
  }
  // Knees: the cypress roots that stand up out of the water around the trunk.
  for (const [dx, h] of [[-13, 4], [-8, 3], [9, 5], [14, 3], [18, 2]]) {
    const x = cx + dx + 3;
    px(ctx, x, WATER_Y - h, PALETTE.rot, 2, h + 1);
    px(ctx, x, WATER_Y - h, PALETTE.boneDark, 1, 1);
  }
  return canvas;
}

function buildCypressGlow() {
  return [0, 1, 2].map((frame) => {
    const { canvas, ctx } = sheet();
    const rng = makeRng(0x70aa + frame * 313);
    /**
     * The vent: gas already coming up through the water before it lets go, in
     * columns rather than scattered specks — a bubble train has a source, and
     * three sources that stay put between frames is what tells the player
     * where the ground is about to breathe.
     */
    for (const [vx, spread] of [[20, 3], [33, 5], [45, 3]]) {
      for (let i = 0; i < 7; i++) {
        const x = vx + rng.int(-spread, spread);
        const y = WATER_Y - rng.int(0, 3 + frame * 4) + rng.int(0, 2);
        px(ctx, x, y, PALETTE.algae);
        if (rng.chance(0.45)) px(ctx, x, y - 1, PALETTE.lichen);
        if (rng.chance(0.2)) px(ctx, x, y + 1, PALETTE.poison);
      }
    }
    // The sheen it leaves on the surface it is coming through.
    for (let i = 0; i < 10; i++) {
      px(ctx, rng.int(14, 50), WATER_Y + rng.int(0, 1), PALETTE.poison, rng.int(1, 3), 1);
    }
    return canvas;
  });
}

// ---------------------------------------------------------------------------
// 6 · The rift
// ---------------------------------------------------------------------------

/**
 * THE ONE THAT IS A WEAPON
 * ---------------------------------------------------------------------------
 * Every other landmark here is weather with a mountain attached. This one
 * spends five seconds visibly WINDING UP and then fires a single shot worth
 * the whole eruption (see the `charge` pattern in src/duel/duel-hazard.js), so
 * the art has one job the other five do not have: at any moment it has to say
 * how close it is to going off.
 *
 * It used to be an empty lens outline. It is a spiral now — a flat disc seen
 * at an angle, with two arms winding into a core — for three reasons: a spiral
 * has an obvious centre for a beam to come out of, arms give the frames
 * something to ROTATE, and a galaxy is the one shape that says "the galaxy"
 * without anybody having to be told.
 *
 * Three layers, and they are not the usual two:
 *   body    the dark disc it is cut into the sky, which is terrain
 *   glow    the arms and the core turning, always on
 *   charge  six frames of the core filling — indexed by the clock's `charge`
 *           level rather than by elapsed time, so the picture and the number
 *           can never disagree
 */
const RIFT_CX = HAZARD_W / 2;
const RIFT_CY = 19;
/** How flat the disc is. 1 would be face-on; this is tipped towards the road. */
const RIFT_TILT = 0.62;

/** One arm of the spiral, walked out from the core. */
function riftArm(ctx, turn, from, to, step, plot) {
  for (let t = from; t <= to; t += step) {
    const r = 3 + t * 22;
    const a = turn + t * 2.9;
    plot(RIFT_CX + Math.cos(a) * r, RIFT_CY + Math.sin(a) * r * RIFT_TILT, t);
  }
}

function buildRift() {
  const { canvas, ctx } = sheet();
  const rng = makeRng(0x80ee);
  // The hole it is cut in: a dark disc with a soft, dithered edge, so the sky
  // does not stop dead at a hard ellipse.
  ellipse(ctx, RIFT_CX, RIFT_CY, 25, 25 * RIFT_TILT, PALETTE.cosmicHigh);
  ellipse(ctx, RIFT_CX, RIFT_CY, 20, 20 * RIFT_TILT, PALETTE.cosmic);
  ellipse(ctx, RIFT_CX, RIFT_CY, 13, 13 * RIFT_TILT, PALETTE.purpleDark);
  for (let i = 0; i < 90; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(24, 29);
    px(ctx, RIFT_CX + Math.cos(a) * r, RIFT_CY + Math.sin(a) * r * RIFT_TILT, PALETTE.cosmicHigh);
  }
  // Stars caught on the edge of it, on their way in.
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(14, 27);
    px(ctx, RIFT_CX + Math.cos(a) * r, RIFT_CY + Math.sin(a) * r * RIFT_TILT, PALETTE.voidRockLight);
  }
  return canvas;
}

function buildRiftGlow() {
  return [0, 1, 2, 3].map((frame) => {
    const { canvas, ctx } = sheet();
    const rng = makeRng(0x81ee + frame * 719);
    const spin = frame * 0.42;
    // Two arms, half a turn apart, thinning and dimming as they wind out.
    for (const turn of [spin, spin + Math.PI]) {
      riftArm(ctx, turn, 0, 1, 0.012, (x, y, t) => {
        const thick = t < 0.35 ? 2 : 1;
        px(ctx, x, y, t < 0.5 ? PALETTE.astral : PALETTE.purple, thick, thick);
        if (t < 0.28) px(ctx, x, y, PALETTE.astralLight);
      });
      // A second, fainter arm trailing the first: two is a pinwheel, four is a
      // galaxy, and the trailing pair is what gives it depth.
      riftArm(ctx, turn + 0.55, 0.15, 1, 0.02, (x, y, t) => {
        if (rng.chance(0.75)) px(ctx, x, y, t < 0.6 ? PALETTE.astralDark : PALETTE.purpleDark);
      });
    }
    // The core, always lit, always the brightest thing on the sprite.
    ellipse(ctx, RIFT_CX, RIFT_CY, 4, 3, PALETTE.astral);
    ellipse(ctx, RIFT_CX, RIFT_CY, 2, 2, PALETTE.astralLight);
    px(ctx, RIFT_CX - 1, RIFT_CY - 1, PALETTE.white, 2, 2);
    return canvas;
  });
}

/**
 * THE WIND-UP, IN SIX STEPS
 * ---------------------------------------------------------------------------
 * Frame 0 is "it has started" and frame 5 is "it is about to fire", and the
 * scene picks between them by the clock's charge level, not by elapsed time.
 * Three things happen across them, and they are all the same idea drawn three
 * ways: the core grows, the light around it converges, and the whole disc
 * tightens up. By the last frame the core is white, twice the size of the one
 * on the glow layer, and every loose star in the frame is pointing at it.
 */
function buildRiftCharge() {
  return [0, 1, 2, 3, 4, 5].map((frame) => {
    const { canvas, ctx } = sheet();
    const rng = makeRng(0x90ee + frame * 1013);
    const k = frame / 5;

    /**
     * The in-fall. Streaks running INWARDS, each one starting further out the
     * fuller the thing is and ending on the core — the picture of something
     * being drawn in rather than thrown out, which is the difference between
     * this and an explosion.
     */
    for (let i = 0; i < 18 + frame * 5; i++) {
      const a = rng.range(0, Math.PI * 2);
      const outer = 10 + rng.range(0, 18) * (1 - k * 0.45);
      const inner = outer - (3 + k * 7);
      line(
        ctx,
        RIFT_CX + Math.cos(a) * outer,
        RIFT_CY + Math.sin(a) * outer * RIFT_TILT,
        RIFT_CX + Math.cos(a) * Math.max(3, inner),
        RIFT_CY + Math.sin(a) * Math.max(3, inner) * RIFT_TILT,
        k > 0.6 ? PALETTE.astralLight : PALETTE.astral,
      );
    }

    // The core, swelling. Three shells so it has an inside.
    const r = 3 + k * 7;
    ellipse(ctx, RIFT_CX, RIFT_CY, r + 2, (r + 2) * 0.8, PALETTE.purple);
    ellipse(ctx, RIFT_CX, RIFT_CY, r, r * 0.82, PALETTE.astral);
    ellipse(ctx, RIFT_CX, RIFT_CY, r * 0.6, r * 0.55, PALETTE.astralLight);
    if (frame >= 3) ellipse(ctx, RIFT_CX, RIFT_CY, r * 0.3, r * 0.3, PALETTE.white);

    /**
     * And the barrel. From half way up, two lines of light lie down along the
     * road out of the core — the beam has to be visibly AIMED before it fires
     * or the shot at the end arrives from nowhere.
     */
    if (frame >= 3) {
      const reach = (frame - 2) * 9;
      for (const dir of [-1, 1]) {
        line(ctx, RIFT_CX, RIFT_CY, RIFT_CX + dir * reach, RIFT_CY, PALETTE.astralLight);
        line(ctx, RIFT_CX, RIFT_CY - 1, RIFT_CX + dir * reach * 0.7, RIFT_CY - 1, PALETTE.white);
      }
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
    // The twister has no still frame: the body IS the animation, so all four
    // frames are bodies and it has no glow at all.
    body: buildTwister(0),
    frames: [0, 1, 2, 3].map(buildTwister),
    glow: [],
    plume: null,
  }),
  hornetTree: () => ({ body: buildHornetTree(), glow: buildHornetTreeGlow(), plume: null }),
  cornice: () => ({ body: buildCornice(), glow: buildCorniceGlow(), plume: null }),
  blackdamp: () => ({ body: buildCypress(), glow: buildCypressGlow(), plume: 'gas' }),
  rift: () => ({
    body: buildRift(),
    glow: buildRiftGlow(),
    /** The only landmark with a wind-up to draw. See `buildRiftCharge`. */
    charge: buildRiftCharge(),
    plume: null,
  }),
};

const cache = new Map();

/**
 * The art for one hazard, built once.
 * @returns {{body: HTMLCanvasElement, glow: HTMLCanvasElement[],
 *            frames?: HTMLCanvasElement[], charge?: HTMLCanvasElement[],
 *            plume: string|null}}
 */
export function getHazardArt(id) {
  if (cache.has(id)) return cache.get(id);
  const build = BUILDERS[id] || BUILDERS.volcano;
  const art = build();
  cache.set(id, art);
  return art;
}
