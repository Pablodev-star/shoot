/**
 * SHOOT! — Dynamic weather (Block 3b).
 *
 * Four states, each with its own visual treatment and a limited duration before
 * the sky clears again:
 *
 *   clear      — nothing drawn
 *   cloudy     — extra cloud density + a grey wash, mild visibility loss
 *   rain       — slanted rain streaks, dark wash, occasional lightning flash
 *   sandstorm  — fast horizontal sand streaks + heavy ochre haze, big
 *                visibility loss (the harshest weather to be caught in)
 *
 * `getWeatherState()` is the global read-only handle the duel system uses to
 * apply combat modifiers when a fight starts in bad weather.
 */

import { EVENTS, emit } from '../core/events.js';
import { makeRng } from '../core/rng.js';
import { play } from '../core/audio.js';

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

const rng = makeRng(0xc0ffee);

const state = {
  current: WEATHER.clear,
  remaining: 30000,
  paused: false,
  intensity: 0,        // 0..1 fade so weather rolls in instead of popping
  flash: 0,            // lightning flash timer
  particles: [],
};

function roll(next) {
  const cfg = WEATHER[next];
  state.current = cfg;
  state.remaining = rng.range(cfg.minMs, cfg.maxMs);
  state.particles = [];
  if (next === 'sandstorm') play('wind');
  emit(EVENTS.WEATHER_CHANGED, getWeatherState());
}

/** Advance weather. `dt` is milliseconds of walking time. */
export function update(dt, view) {
  if (state.paused) return;
  state.remaining -= dt;
  if (state.remaining <= 0) roll(rng.weighted(TRANSITIONS[state.current.id]));

  // Ease the effect in/out so transitions feel like weather, not a switch.
  const target = state.current.id === 'clear' ? 0 : 1;
  const fadeSpeed = dt / 2600;
  state.intensity += Math.sign(target - state.intensity) * Math.min(fadeSpeed, Math.abs(target - state.intensity));

  if (state.flash > 0) state.flash -= dt;
  if (state.current.id === 'rain' && rng.chance(dt / 9000)) {
    state.flash = 180;
    play('thunder');
  }

  if (view) stepParticles(dt, view);
}

function stepParticles(dt, view) {
  const id = state.current.id;
  const wanted = id === 'sandstorm' ? 160 : id === 'rain' ? 130 : 0;
  const count = Math.round(wanted * state.intensity);

  while (state.particles.length < count) {
    state.particles.push(spawn(view, id));
  }
  while (state.particles.length > count) state.particles.pop();

  const step = dt / 16.67;
  for (const p of state.particles) {
    p.x += p.vx * step;
    p.y += p.vy * step;
    if (p.x < -40 || p.x > view.w + 40 || p.y > view.h + 20) Object.assign(p, spawn(view, id));
  }
}

function spawn(view, id) {
  if (id === 'sandstorm') {
    return {
      x: rng.range(-60, view.w),
      y: rng.range(0, view.h),
      vx: rng.range(-22, -11),
      vy: rng.range(-1.2, 1.2),
      len: rng.range(10, 40),
      a: rng.range(0.14, 0.5),
    };
  }
  return {
    x: rng.range(-40, view.w + 40),
    y: rng.range(-view.h, view.h),
    vx: rng.range(-4.5, -2.5),
    vy: rng.range(13, 19),
    len: rng.range(7, 15),
    a: rng.range(0.2, 0.55),
  };
}

/** Draw the weather overlay. Call after the parallax, before the UI. */
export function render(ctx, view) {
  const id = state.current.id;
  const k = state.intensity;
  if (k <= 0.01) return;

  if (id === 'cloudy') {
    ctx.fillStyle = `rgba(60, 60, 72, ${0.3 * k})`;
    ctx.fillRect(0, 0, view.w, view.h);
    return;
  }

  if (id === 'rain') {
    ctx.fillStyle = `rgba(24, 32, 54, ${0.4 * k})`;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.lineWidth = Math.max(1, view.scale / 2);
    for (const p of state.particles) {
      ctx.strokeStyle = `rgba(190, 214, 255, ${p.a * k})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.9, p.y - p.len);
      ctx.stroke();
    }
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(226, 236, 255, ${Math.min(0.55, state.flash / 300)})`;
      ctx.fillRect(0, 0, view.w, view.h);
    }
    return;
  }

  if (id === 'sandstorm') {
    ctx.fillStyle = `rgba(196, 146, 74, ${0.42 * k})`;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.lineWidth = Math.max(1, view.scale / 2);
    for (const p of state.particles) {
      ctx.strokeStyle = `rgba(240, 214, 154, ${p.a * k})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.len, p.y + p.vy * 0.6);
      ctx.stroke();
    }
    // Heavier haze band across the middle of the screen.
    const grad = ctx.createLinearGradient(0, view.h * 0.35, 0, view.h);
    grad.addColorStop(0, `rgba(214, 165, 92, 0)`);
    grad.addColorStop(1, `rgba(184, 132, 62, ${0.5 * k})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, view.h * 0.35, view.w, view.h * 0.65);
  }
}

export function setPaused(paused) {
  state.paused = paused;
}

/** Force a specific weather (used by world intros and the Galaxy world). */
export function force(id, durationMs) {
  if (!WEATHER[id]) return;
  roll(id);
  if (durationMs) state.remaining = durationMs;
  state.intensity = id === 'clear' ? 0 : 1;
}

export function getWeatherState() {
  return {
    id: state.current.id,
    label: state.current.label,
    visibility: 1 - (1 - state.current.visibility) * state.intensity,
    duel: state.current.duel,
    intensity: state.intensity,
  };
}

export function serialize() {
  return { id: state.current.id, remaining: state.remaining };
}

export function restore(data) {
  if (data && WEATHER[data.id]) {
    roll(data.id);
    if (typeof data.remaining === 'number') state.remaining = data.remaining;
  }
}
