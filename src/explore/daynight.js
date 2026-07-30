/**
 * SHOOT! — Day / night cycle (Block 3b).
 *
 * A single continuous clock drives the sky gradient, the sun/moon position and
 * an ambient tint that is composited over every parallax layer. Nothing snaps:
 * colors are interpolated between four key stops so dawn bleeds into day and
 * dusk bleeds into night.
 *
 * The cycle advances only while the player is actually walking (the exploration
 * loop calls `update`), so a long shopping trip does not skip a whole night.
 *
 * Global read-only state is exposed through `getTimeState()` — the duel system
 * reads `isNight` from it to apply its night modifier.
 */

import { EVENTS, emit } from '../core/events.js';
import { PALETTE } from '../art/palette.js';

/** Full day length in milliseconds of walking. */
export const DAY_LENGTH_MS = 200000; // ~3.5 minutes of travel per full cycle

/** Key stops around the clock. `t` is the normalised time of day (0..1). */
const STOPS = [
  { t: 0.0, name: 'night', top: PALETTE.skyNightHigh, bottom: PALETTE.skyNight, light: 0.32, tint: '#1b2450' },
  { t: 0.22, name: 'dawn', top: '#3d4a86', bottom: '#e8955a', light: 0.62, tint: '#c9743a' },
  { t: 0.3, name: 'day', top: PALETTE.skyDayHigh, bottom: PALETTE.skyDay, light: 1.0, tint: '#ffffff' },
  { t: 0.68, name: 'day', top: PALETTE.skyDayHigh, bottom: PALETTE.skyDay, light: 1.0, tint: '#ffffff' },
  { t: 0.8, name: 'dusk', top: '#5b3f7a', bottom: PALETTE.skyDusk, light: 0.66, tint: '#d2703c' },
  { t: 0.92, name: 'night', top: PALETTE.skyNightHigh, bottom: PALETTE.skyNight, light: 0.32, tint: '#1b2450' },
  { t: 1.0, name: 'night', top: PALETTE.skyNightHigh, bottom: PALETTE.skyNight, light: 0.32, tint: '#1b2450' },
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, k) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const state = {
  time: 0.32,          // start mid-morning
  elapsed: 0,
  phase: 'day',
  paused: false,
};

/** Advance the clock. `dt` is milliseconds of *walking* time. */
export function update(dt) {
  if (state.paused) return;
  state.elapsed += dt;
  state.time = (state.time + dt / DAY_LENGTH_MS) % 1;
  const next = phaseAt(state.time);
  if (next !== state.phase) {
    state.phase = next;
    emit(EVENTS.TIME_OF_DAY_CHANGED, getTimeState());
  }
}

export function setPaused(paused) {
  state.paused = paused;
}

/** Jump the clock (used when loading a save). */
export function setTime(t) {
  state.time = ((t % 1) + 1) % 1;
  state.phase = phaseAt(state.time);
}

function phaseAt(t) {
  if (t < 0.18 || t >= 0.9) return 'night';
  if (t < 0.28) return 'dawn';
  if (t < 0.74) return 'day';
  if (t < 0.9) return 'dusk';
  return 'night';
}

/** Interpolated visual description of the current moment. */
export function getSky() {
  const t = state.time;
  let a = STOPS[0];
  let b = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i].t && t <= STOPS[i + 1].t) {
      a = STOPS[i];
      b = STOPS[i + 1];
      break;
    }
  }
  const span = b.t - a.t || 1;
  const k = (t - a.t) / span;
  return {
    top: mix(a.top, b.top, k),
    bottom: mix(a.bottom, b.bottom, k),
    light: a.light + (b.light - a.light) * k,
    tint: mix(a.tint, b.tint, k),
    /** 0 at sunrise, 1 at sunset — drives the sun arc across the sky. */
    sunProgress: (t - 0.22) / 0.58,
    /** Star opacity, faded in around night. */
    stars: Math.max(0, 1 - (a.light + (b.light - a.light) * k - 0.32) / 0.5),
  };
}

/** Read-only snapshot other systems (duel modifiers, saves) consume. */
export function getTimeState() {
  return {
    time: state.time,
    phase: state.phase,
    isNight: state.phase === 'night',
    isDark: state.phase === 'night' || state.phase === 'dusk',
  };
}

export function serialize() {
  return { time: state.time };
}

export function restore(data) {
  if (data && typeof data.time === 'number') setTime(data.time);
}
