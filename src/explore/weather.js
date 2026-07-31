/**
 * SHOOT! — Dynamic weather (Block 3b).
 *
 * Four states, each with its own visual treatment and a limited duration before
 * the sky clears again:
 *
 *   clear      — nothing drawn
 *   cloudy     — a grey wash and drifting cloud shadows, mild visibility loss
 *   rain       — three depths of falling rain that break on the ground, a dark
 *                wash, and lightning that actually strikes something
 *   sandstorm  — three depths of driven sand, tumbling grit, gusting dust
 *                sheets and heavy ochre haze; the harshest weather to be
 *                caught in
 *
 * `getWeatherState()` is the global read-only handle the duel system uses to
 * apply combat modifiers when a fight starts in bad weather.
 *
 * EVERYTHING IS DRAWN ON THE PIXEL GRID
 * ---------------------------------------------------------------------------
 * Not one stroked line. Rain, sand, splashes, lightning and haze are all whole
 * `view.scale` blocks snapped to the same grid the sprites live on, because a
 * 1.5px anti-aliased streak over pixel art is the fastest way to make the art
 * look like a mistake. Washes are quantised into bands for the same reason.
 *
 * RAIN LANDS
 * ---------------------------------------------------------------------------
 * Drops are not recycled when they leave the bottom of the screen — they are
 * recycled when they hit the ground, and they leave a splash where they hit.
 * Each depth lands on its own line (the far one against the dunes, the near one
 * down in the foreground), which is what stops the ground from reading as a
 * single flat shelf everything happens to stop at.
 *
 * THE CLOCK AND THE ANIMATION ARE SEPARATE
 * ---------------------------------------------------------------------------
 * `paused` stops the *clock* — how much longer this weather lasts — and nothing
 * else. The rain keeps falling while a duel is being fought or the saddlebag is
 * open, without spending its time doing it. Weather that freezes mid-air the
 * moment a fight starts tells the player the world is a backdrop.
 */

import { EVENTS, emit } from '../core/events.js';
import { makeRng } from '../core/rng.js';
import { play } from '../core/audio.js';
import { getSky } from './daynight.js';

export const WEATHER = {
  clear: {
    id: 'clear',
    label: 'Clear',
    visibility: 1,
    minMs: 26000,
    maxMs: 60000,
    /** Duel modifiers this weather applies (read by the duel engine). */
    duel: {},
  },
  cloudy: {
    id: 'cloudy',
    label: 'Overcast',
    visibility: 0.88,
    minMs: 20000,
    maxMs: 45000,
    duel: {},
  },
  rain: {
    id: 'rain',
    label: 'Rain',
    visibility: 0.72,
    minMs: 18000,
    maxMs: 38000,
    /** Wet powder: shots occasionally misfire for BOTH duellists. */
    duel: { misfireChance: 0.08 },
  },
  sandstorm: {
    id: 'sandstorm',
    label: 'Sandstorm',
    visibility: 0.5,
    minMs: 15000,
    maxMs: 30000,
    /** Sand in the eyes: the enemy AI reads your move less reliably. */
    duel: { enemyAccuracyPenalty: 0.18, misfireChance: 0.04 },
  },
};

/** Transition weights: from -> { to: weight }. Clear is the hub state. */
const TRANSITIONS = {
  clear: { clear: 0, cloudy: 5, rain: 2, sandstorm: 2 },
  cloudy: { clear: 5, rain: 3, sandstorm: 1 },
  rain: { clear: 4, cloudy: 4 },
  sandstorm: { clear: 5, cloudy: 2 },
};

/**
 * Rain depths, in source pixels per 60Hz frame.
 *  `land` is how far below the walk line this depth breaks: negative is behind
 *  the road (up against the dunes), positive is in front of it.
 */
const RAIN_DEPTHS = [
  { len: 4, vy: 3.4, alpha: 0.34, w: 1, land: 0, share: 0.42 },
  { len: 7, vy: 4.8, alpha: 0.5, w: 1, land: 5, share: 0.34 },
  { len: 11, vy: 6.4, alpha: 0.72, w: 2, land: 11, share: 0.24 },
];

/** Sandstorm depths, same units. Sand travels sideways, not down. */
const SAND_DEPTHS = [
  { vx: -7, len: [12, 30], alpha: 0.26, h: 1, share: 0.4 },
  { vx: -12, len: [9, 22], alpha: 0.44, h: 1, share: 0.36 },
  { vx: -19, len: [6, 15], alpha: 0.68, h: 2, share: 0.24 },
];

const RAIN_COLOR = [186, 214, 255];
const SAND_COLOR = [240, 214, 154];

const rng = makeRng(0xc0ffee);

const state = {
  /** The weather the game is in — what the duel reads. */
  current: WEATHER.clear,
  /**
   * The weather being *drawn*. It lags behind `current`: when the sky turns,
   * the old weather thins out and blows over before the new one rolls in. The
   * old code swapped the particle array on the spot, so a storm that ended
   * ended between two frames.
   */
  shown: WEATHER.clear,
  remaining: 30000,
  paused: false,
  intensity: 0,        // 0..1 fade so weather rolls in instead of popping
  clock: 0,            // free-running animation clock (never pauses)
  flash: 0,            // lightning flash timer
  bolt: null,          // the strike currently on screen
  particles: [],
  splashes: [],
  sheets: [],          // sandstorm dust gusts
  /** Walk line in device pixels; the screens hand it over each frame. */
  groundY: null,
};

function clearParticles() {
  state.particles = [];
  state.splashes = [];
  state.sheets = [];
}

function roll(next) {
  const cfg = WEATHER[next];
  state.current = cfg;
  state.remaining = rng.range(cfg.minMs, cfg.maxMs);
  if (next === 'sandstorm') play('wind');
  emit(EVENTS.WEATHER_CHANGED, getWeatherState());
}

/**
 * Tell the weather where the ground is, in device pixels. Called by whichever
 * screen is drawing, because the duel raises the walk line and the road does
 * not.
 */
export function setGroundLine(y) {
  state.groundY = y;
}

function groundOf(view) {
  return state.groundY ?? view.h * 0.78;
}

/**
 * Advance weather. `dt` is milliseconds.
 *
 * The countdown to the next change only runs when the world is running; the
 * animation always does. See the note at the top of the file.
 */
export function update(dt, view) {
  if (!state.paused) {
    state.remaining -= dt;
    if (state.remaining <= 0) roll(rng.weighted(TRANSITIONS[state.current.id]));
  }

  state.clock += dt;

  // Ease the effect in/out so transitions feel like weather, not a switch: the
  // weather on screen thins to nothing first, and only then is it replaced.
  const settling = state.shown.id !== state.current.id;
  const target = settling || state.current.id === 'clear' ? 0 : 1;
  const fadeSpeed = dt / 2600;
  state.intensity += Math.sign(target - state.intensity) * Math.min(fadeSpeed, Math.abs(target - state.intensity));
  if (settling && state.intensity <= 0.001) {
    state.shown = state.current;
    clearParticles();
  }

  if (state.flash > 0) {
    state.flash -= dt;
    if (state.flash <= 0) state.bolt = null;
  }
  if (state.current.id === 'rain' && rng.chance(dt / 9000)) {
    state.flash = 180;
    if (view) state.bolt = makeBolt(view);
    play('thunder');
  }

  if (view) {
    stepParticles(dt, view);
    stepSplashes(dt);
  }
}

// ---------------------------------------------------------------------------
// Particles
//
// Positions are kept in SOURCE pixels (the units the art is drawn in) and
// multiplied up at draw time, so a drop is the same size on a phone and on a
// desktop instead of being scale/2 device pixels wide on both.
// ---------------------------------------------------------------------------

function stepParticles(dt, view) {
  const id = state.shown.id;
  const wanted = id === 'sandstorm' ? 240 : id === 'rain' ? 200 : 0;
  const count = Math.round(wanted * state.intensity);
  const W = view.w / view.scale;
  const H = view.h / view.scale;
  const gy = groundOf(view) / view.scale;

  while (state.particles.length < count) state.particles.push(spawn(W, H, gy, id));
  while (state.particles.length > count) state.particles.pop();

  const step = dt / 16.67;

  if (id === 'rain') {
    // Wind gusts, so the rain leans and eases back instead of falling on rails.
    const wind = -1.5 * (1 + 0.38 * Math.sin(state.clock / 2600) + 0.16 * Math.sin(state.clock / 830));
    for (const p of state.particles) {
      p.vx = (wind * p.vy) / 6;
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (p.y >= p.landY) {
        // The far curtain does not splash: at that distance a single pixel of
        // spray is noise, and 200 of them turned the road into gravel.
        if (p.depth > 0) addSplash(p.x, p.landY, p.depth);
        Object.assign(p, spawn(W, H, gy, id));
        p.y = -rng.range(2, 30);
      } else if (p.x < -30 || p.x > W + 30) {
        Object.assign(p, spawn(W, H, gy, id));
      }
    }
    return;
  }

  if (id === 'sandstorm') {
    const gust = 1 + 0.3 * Math.sin(state.clock / 1700) + 0.14 * Math.sin(state.clock / 520);
    for (const p of state.particles) {
      p.x += p.vx * gust * step;
      p.y += p.vy * step;
      if (p.grit) p.y += Math.sin(state.clock / 260 + p.phase) * 0.28 * step;
      if (p.x < -40 || p.y > H + 10 || p.y < -10) Object.assign(p, spawn(W, H, gy, id));
    }
    stepSheets(dt, W, H);
  }
}

function spawn(W, H, gy, id) {
  if (id === 'sandstorm') {
    const depth = pickDepth(SAND_DEPTHS);
    const d = SAND_DEPTHS[depth];
    const grit = rng.chance(0.14);
    return {
      depth,
      grit,
      x: rng.range(-30, W + 30),
      // Sand hugs the ground: the lower half of the screen carries most of it.
      y: rng.range(0, H) * 0.55 + rng.range(gy * 0.25, gy + 6) * 0.45,
      vx: d.vx * rng.range(0.85, 1.15),
      vy: rng.range(-0.35, 0.35),
      len: grit ? 2 : Math.round(rng.range(d.len[0], d.len[1])),
      a: d.alpha * rng.range(0.7, 1.15),
      phase: rng.range(0, Math.PI * 2),
    };
  }
  const depth = pickDepth(RAIN_DEPTHS);
  const d = RAIN_DEPTHS[depth];
  return {
    depth,
    x: rng.range(-40, W + 40),
    y: rng.range(-H, 0),
    vx: 0,
    vy: d.vy * rng.range(0.9, 1.1),
    len: d.len,
    a: d.alpha * rng.range(0.75, 1.1),
    landY: gy + d.land + rng.range(-3, 3),
  };
}

function pickDepth(depths) {
  let roll = rng();
  for (let i = 0; i < depths.length; i++) {
    roll -= depths[i].share;
    if (roll <= 0) return i;
  }
  return depths.length - 1;
}

// --- splashes --------------------------------------------------------------

function addSplash(x, y, depth) {
  if (state.splashes.length > 90) return;
  state.splashes.push({ x, y, depth, t: 0 });
}

function stepSplashes(dt) {
  for (let i = state.splashes.length - 1; i >= 0; i--) {
    state.splashes[i].t += dt / 300;
    if (state.splashes[i].t >= 1) state.splashes.splice(i, 1);
  }
}

// --- sandstorm dust sheets --------------------------------------------------

function stepSheets(dt, W, H) {
  const step = dt / 16.67;
  while (state.sheets.length < 5) {
    state.sheets.push({
      x: rng.range(0, W * 1.6),
      y: rng.range(H * 0.3, H * 0.95),
      w: rng.range(W * 0.35, W * 0.9),
      h: rng.range(4, 16),
      vx: rng.range(-9, -4),
      a: rng.range(0.08, 0.18),
    });
  }
  for (const sh of state.sheets) {
    sh.x += sh.vx * step;
    if (sh.x + sh.w < -20) {
      sh.x = W + rng.range(10, W * 0.6);
      sh.y = rng.range(H * 0.3, H * 0.95);
      sh.h = rng.range(4, 16);
    }
  }
}

// --- lightning --------------------------------------------------------------

/**
 * A strike, generated in source pixels: a jagged trunk from the top of the
 * screen down to the horizon, plus one or two forks that die early. A flash
 * with no bolt in it is a screen going white; a bolt makes the storm a place.
 */
function makeBolt(view) {
  const s = view.scale;
  const W = view.w / s;
  const end = groundOf(view) / s - rng.range(2, 16);
  const trunk = [];
  let x = rng.range(W * 0.15, W * 0.85);
  let y = 0;
  while (y < end) {
    trunk.push([x, y]);
    y += rng.range(5, 13);
    x += rng.range(-6, 6);
  }
  trunk.push([x, end]);

  const forks = [];
  const branches = rng.int(1, 2);
  for (let i = 0; i < branches; i++) {
    const from = rng.int(1, Math.max(1, trunk.length - 3));
    let [fx, fy] = trunk[from];
    const dir = rng.chance(0.5) ? -1 : 1;
    const fork = [[fx, fy]];
    const steps = rng.int(2, 4);
    for (let k = 0; k < steps; k++) {
      fx += dir * rng.range(3, 9);
      fy += rng.range(4, 10);
      fork.push([fx, fy]);
    }
    forks.push(fork);
  }
  return { trunk, forks };
}

/** Strobe envelope: bright, gone, bright again, out. */
function boltAlpha() {
  const k = 1 - state.flash / 180;          // 0 at the strike, 1 at the end
  const frames = [1, 0.25, 0.85, 0.15];
  const i = Math.min(frames.length - 1, Math.floor(k * frames.length));
  return frames[i] * (1 - k * 0.35);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * A wash quantised into bands, so it steps like pixel art instead of pouring.
 * Band edges are computed as exact integer boundaries and never overlap: a
 * one-pixel overlap between two translucent bands is painted twice, and eight
 * of those read as eight ruled lines across the desert.
 */
function bandWash(ctx, view, color, fromY, toY, alphaTop, alphaBottom) {
  const bands = 8;
  const span = toY - fromY;
  ctx.fillStyle = color;
  for (let i = 0; i < bands; i++) {
    const y0 = Math.round(fromY + (span * i) / bands);
    const y1 = Math.round(fromY + (span * (i + 1)) / bands);
    const k = i / (bands - 1);
    const a = alphaTop + (alphaBottom - alphaTop) * k;
    if (a <= 0.004 || y1 <= y0) continue;
    ctx.globalAlpha = a;
    ctx.fillRect(0, y0, view.w, y1 - y0);
  }
  ctx.globalAlpha = 1;
}

/** Draw a run of whole pixels between two points, on the grid. */
function pixelLine(ctx, x0, y0, x1, y1, s, thick) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    ctx.fillRect(
      Math.round(x0 + dx * k) * s,
      Math.round(y0 + dy * k) * s,
      thick * s,
      s,
    );
  }
}

/** Draw the weather overlay. Call after the parallax, before the UI. */
export function render(ctx, view) {
  const id = state.shown.id;
  const k = state.intensity;
  if (k <= 0.01) return;

  const s = view.scale;
  const gy = groundOf(view);
  // Weather is lit by the same sky as everything else: silver rain at noon,
  // cold grey rain at midnight.
  const light = 0.45 + getSky().light * 0.55;

  if (id === 'cloudy') {
    bandWash(ctx, view, 'rgb(64, 68, 84)', 0, view.h, 0.4 * k, 0.28 * k);
    /**
     * Cloud shadows crawling over the road. Two rules learned the hard way: a
     * shadow falls on the ground, not on the sky above it — and it has no edge.
     * Cast over the ridges it was a translucent rectangle sliding across the
     * scenery, which is exactly what it looked like. Kept to the flat sand
     * below the walk line and stepped in five widths, it is a cloud going over.
     */
    ctx.fillStyle = 'rgb(40, 42, 56)';
    for (let i = 0; i < 3; i++) {
      const w = view.w * (0.34 + i * 0.1);
      const x = ((state.clock / (46 + i * 17) + i * 900) % (view.w + w * 2)) - w * 1.5;
      for (const [inset, mul] of [[0, 0.2], [0.1, 0.4], [0.2, 0.65], [0.32, 0.85], [0.42, 1]]) {
        ctx.globalAlpha = 0.09 * k * mul;
        ctx.fillRect(
          Math.round((x + w * inset) / s) * s,
          gy,
          Math.round((w * (1 - inset * 2)) / s) * s,
          view.h - gy,
        );
      }
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (id === 'rain') {
    // Heavy enough to take the blue out of the sky: rain falling out of a clear
    // summer afternoon was the single least convincing thing on screen.
    bandWash(ctx, view, 'rgb(28, 34, 52)', 0, view.h, 0.6 * k, 0.7 * k);

    // Wet ground: the road darkens under the rain and holds the reflection of
    // the flash when one goes off.
    ctx.globalAlpha = 0.22 * k;
    ctx.fillStyle = 'rgb(30, 40, 66)';
    ctx.fillRect(0, gy, view.w, view.h - gy);
    ctx.globalAlpha = 1;

    drawRain(ctx, view, k, light);
    drawSplashes(ctx, view, k, light);

    if (state.flash > 0) {
      const a = boltAlpha();
      ctx.globalAlpha = Math.min(0.5, a * 0.45) * k;
      ctx.fillStyle = 'rgb(226, 236, 255)';
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.globalAlpha = 1;
      if (state.bolt) drawBolt(ctx, s, a * k);
    }
    return;
  }

  if (id === 'sandstorm') {
    // Sand takes the sky first. Half the point of a sandstorm is that the blue
    // goes out of the world entirely, which a light ochre veil never did.
    bandWash(ctx, view, 'rgb(198, 148, 74)', 0, view.h, 0.66 * k, 0.74 * k);
    drawSheets(ctx, view, k);
    drawSand(ctx, view, k, light);
    // Heavier haze from the horizon down — where the sand is actually coming
    // from — in the same quantised bands as everything else.
    bandWash(ctx, view, 'rgb(176, 124, 58)', view.h * 0.3, view.h, 0, 0.55 * k);
  }
}

function drawRain(ctx, view, k, light) {
  const s = view.scale;
  for (const p of state.particles) {
    const d = RAIN_DEPTHS[p.depth];
    const c = RAIN_COLOR.map((v) => Math.round(v * light));
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.a * k})`;
    // A streak is a stack of short blocks, each nudged sideways by the wind,
    // rather than one long slanted line: this is what a drop looks like when
    // the screen only has whole pixels to spend.
    const segs = Math.max(2, Math.round(p.len / 3));
    const segLen = p.len / segs;
    for (let i = 0; i < segs; i++) {
      const y = p.y - i * segLen;
      const x = p.x - (p.vx / p.vy) * (i * segLen);
      ctx.fillRect(
        Math.round(x) * s,
        Math.round(y) * s,
        d.w * s,
        Math.ceil(segLen) * s,
      );
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * The moment a drop lands: a bright chip, two beads thrown sideways, then a
 * flat ring left on the wet ground. Three drawn stages, no tweening — the same
 * way a three-frame effect was animated when this was all anyone had.
 */
function drawSplashes(ctx, view, k, light) {
  const s = view.scale;
  const c = RAIN_COLOR.map((v) => Math.round(v * light));
  for (const sp of state.splashes) {
    const near = sp.depth === 2;
    const x = Math.round(sp.x) * s;
    const y = Math.round(sp.y) * s;
    const a = (1 - sp.t) * k * (near ? 0.8 : 0.5);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    if (sp.t < 0.34) {
      // The hit: a chip of water standing up off the ground.
      ctx.fillRect(x, y - s, s, s);
      ctx.fillRect(x - s, y, s * 3, s);
    } else if (sp.t < 0.67) {
      // Two beads thrown sideways.
      ctx.fillRect(x - s * 2, y - s, s, s);
      ctx.fillRect(x + s * 2, y - s, s, s);
      ctx.fillRect(x - s, y, s * 3, s);
    } else {
      // The ring left behind, one continuous line so it reads as a puddle
      // rather than as two pieces of grit.
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x - s * 2, y, s * 5, s);
      ctx.globalAlpha = 1;
    }
  }
  ctx.globalAlpha = 1;
}

function drawBolt(ctx, s, alpha) {
  const { trunk, forks } = state.bolt;
  // Halo first, then the white core inside it.
  ctx.globalAlpha = Math.min(1, alpha * 0.5);
  ctx.fillStyle = 'rgb(150, 190, 255)';
  for (let i = 0; i < trunk.length - 1; i++) {
    pixelLine(ctx, trunk[i][0] - 1, trunk[i][1], trunk[i + 1][0] - 1, trunk[i + 1][1], s, 4);
  }
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = 'rgb(240, 248, 255)';
  for (let i = 0; i < trunk.length - 1; i++) {
    pixelLine(ctx, trunk[i][0], trunk[i][1], trunk[i + 1][0], trunk[i + 1][1], s, 2);
  }
  ctx.globalAlpha = Math.min(1, alpha * 0.8);
  for (const fork of forks) {
    for (let i = 0; i < fork.length - 1; i++) {
      pixelLine(ctx, fork[i][0], fork[i][1], fork[i + 1][0], fork[i + 1][1], s, 1);
    }
  }
  ctx.globalAlpha = 1;
}

function drawSand(ctx, view, k, light) {
  const s = view.scale;
  const c = SAND_COLOR.map((v) => Math.round(v * light));
  for (const p of state.particles) {
    const d = SAND_DEPTHS[p.depth];
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.a * k})`;
    const x = Math.round(p.x) * s;
    const y = Math.round(p.y) * s;
    if (p.grit) {
      // Grit tumbles: a two-pixel clump with a pixel trailing it.
      ctx.fillRect(x, y, s * 2, s * 2);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + s * 3, y + s, s, s);
      ctx.globalAlpha = 1;
    } else {
      // A streak with a gap in it reads as speed; a solid bar reads as a bar.
      const head = Math.round(p.len * 0.6);
      ctx.fillRect(x, y, head * s, d.h * s);
      ctx.fillRect(x + (head + 2) * s, y, (p.len - head) * s, d.h * s);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * The gusts: broad, faint sheets of dust crossing in front of everything. Each
 * one is drawn as three stacked bands, the outer two shorter and fainter, so it
 * thins out at its edges instead of ending on a hard vertical line — a rectangle
 * of haze sliding across the desert reads as a rendering fault, not as wind.
 */
function drawSheets(ctx, view, k) {
  const s = view.scale;
  ctx.fillStyle = 'rgb(214, 172, 104)';
  for (const sh of state.sheets) {
    const x = Math.round(sh.x) * s;
    const y = Math.round(sh.y) * s;
    const w = Math.round(sh.w) * s;
    const h = Math.max(1, Math.round(sh.h / 3)) * s;
    ctx.globalAlpha = sh.a * k * 0.45;
    ctx.fillRect(x + w * 0.12, y, w * 0.76, h);
    ctx.globalAlpha = sh.a * k;
    ctx.fillRect(x, y + h, w, h);
    ctx.globalAlpha = sh.a * k * 0.45;
    ctx.fillRect(x + w * 0.08, y + h * 2, w * 0.84, h);
  }
  ctx.globalAlpha = 1;
}

export function setPaused(paused) {
  state.paused = paused;
}

/** Force a specific weather (used by world intros and the Galaxy world). */
export function force(id, durationMs) {
  if (!WEATHER[id]) return;
  roll(id);
  if (durationMs) state.remaining = durationMs;
  state.shown = state.current;
  clearParticles();
  state.intensity = id === 'clear' ? 0 : 1;
}

export function getWeatherState() {
  return {
    id: state.current.id,
    label: state.current.label,
    visibility: 1 - (1 - state.current.visibility) * state.intensity,
    duel: state.current.duel,
    intensity: state.intensity,
    /** What is on screen right now, which lags `id` through a change. */
    shownId: state.shown.id,
  };
}

export function serialize() {
  return { id: state.current.id, remaining: state.remaining };
}

export function restore(data) {
  if (data && WEATHER[data.id]) {
    roll(data.id);
    state.shown = state.current;
    clearParticles();
    state.intensity = 0; // a loaded save rolls its weather in, it does not pop
    if (typeof data.remaining === 'number') state.remaining = data.remaining;
  }
}
