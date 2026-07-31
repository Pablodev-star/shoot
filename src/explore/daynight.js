/**
 * SHOOT! — Day / night cycle (Block 3b).
 *
 * A single continuous clock drives the sky, the sun/moon arc, the star field
 * and the light the whole world is drawn in. Nothing snaps: every value is
 * interpolated between key stops, so first light bleeds into sunrise, sunrise
 * into morning, golden hour into sunset and sunset into the blue hour.
 *
 * WHAT A STOP CARRIES
 * ---------------------------------------------------------------------------
 *   top / mid / bottom  the three-stop vertical sky ramp (zenith → horizon)
 *   light               0..1 ambient brightness; 1 is full daylight
 *   tint                the colour the *world* turns as the light goes; it is
 *                       laid over the desert at an opacity of (1 - light), so
 *                       it is the colour of the hour, not a multiplier
 *   warm / warmA        a colour and strength put back on top, because low
 *                       sunlight does not only darken a scene, it recolours the
 *                       faces still catching it. Darkening alone gives you a
 *                       daytime photograph with the brightness pulled down; the
 *                       pair gives you evening.
 *   glow / glowA        the band of light sitting on the horizon
 *
 * The cycle advances only while the player is actually walking (the exploration
 * loop calls `update`), so a long shopping trip does not skip a whole night.
 *
 * TIMING — deliberately unchanged
 * ---------------------------------------------------------------------------
 * A full cycle is DAY_LENGTH_MS of travel, and the phase boundaries in
 * `phaseAt` are exactly where they have always been. The extra stops below only
 * subdivide the colour ramp; they do not move dawn, dusk or nightfall, so the
 * duel's night modifier arrives at the same moment it always did.
 *
 * Global read-only state is exposed through `getTimeState()` — the duel system
 * reads `isNight` from it to apply its night modifier.
 */

import { EVENTS, emit } from '../core/events.js';
import { PALETTE } from '../art/palette.js';
import { MOON_PHASE_COUNT } from '../art/sprites-environment.js';

/** Full day length in milliseconds of walking. */
export const DAY_LENGTH_MS = 200000; // ~3.5 minutes of travel per full cycle

/** Key stops around the clock. `t` is the normalised time of day (0..1). */
const STOPS = [
  {
    t: 0.0,
    name: 'night',
    top: PALETTE.skyNightHigh, mid: '#141c40', bottom: PALETTE.skyNight,
    light: 0.32, tint: '#1b2450',
    warm: '#4a6ac0', warmA: 0.1,
    glow: '#2a3568', glowA: 0.18,
  },
  {
    t: 0.16,
    name: 'night',
    top: '#080c26', mid: '#121a3e', bottom: '#232c5c',
    light: 0.3, tint: '#182047',
    warm: '#4a6ac0', warmA: 0.1,
    glow: '#33406f', glowA: 0.22,
  },
  {
    // Blue hour: the sky lifts well before the sun does.
    t: 0.2,
    name: 'dawn',
    top: '#16204d', mid: '#33447d', bottom: '#7b5f88',
    light: 0.44, tint: '#2c3a70',
    warm: '#c07a5a', warmA: 0.12,
    glow: '#b06a5a', glowA: 0.5,
  },
  {
    t: 0.24,
    name: 'dawn',
    top: '#3d4a86', mid: '#9a6a80', bottom: PALETTE.skyDusk,
    light: 0.58, tint: '#8a4526',
    warm: '#ff9a3c', warmA: 0.22,
    glow: '#ffb257', glowA: 1,
  },
  {
    t: 0.3,
    name: 'day',
    top: PALETTE.skyDayHigh, mid: PALETTE.skyDay, bottom: '#c8e6ee',
    light: 0.94, tint: '#ffe9d0',
    warm: '#ffcf9a', warmA: 0.1,
    glow: '#f5d9a8', glowA: 0.3,
  },
  {
    t: 0.45,
    name: 'day',
    top: '#2f8fd0', mid: '#6dc0e8', bottom: '#d2eaf5',
    light: 1.0, tint: '#ffffff',
    warm: '#fff3c8', warmA: 0.05,
    glow: '#eaf3f7', glowA: 0.12,
  },
  {
    t: 0.62,
    name: 'day',
    top: PALETTE.skyDayHigh, mid: PALETTE.skyDay, bottom: '#cfe7ef',
    light: 0.98, tint: '#fff6e8',
    warm: '#ffe6b4', warmA: 0.07,
    glow: '#f2e2bc', glowA: 0.2,
  },
  {
    // Golden hour.
    t: 0.74,
    name: 'day',
    top: '#3f76b8', mid: '#c9a276', bottom: '#f0c079',
    light: 0.88, tint: '#c98a3c',
    warm: '#ffb257', warmA: 0.2,
    glow: '#ffc46a', glowA: 0.72,
  },
  {
    t: 0.8,
    name: 'dusk',
    top: '#5b3f7a', mid: '#bd5a48', bottom: PALETTE.skyDusk,
    light: 0.6, tint: '#7a3a1e',
    warm: '#ff7a3a', warmA: 0.24,
    glow: '#ff8a3c', glowA: 1,
  },
  {
    // Second blue hour, the mirror of 0.2.
    t: 0.86,
    name: 'dusk',
    top: '#2a2352', mid: '#5c3a68', bottom: '#a8503f',
    light: 0.42, tint: '#40254c',
    warm: '#c05a3a', warmA: 0.14,
    glow: '#b04a3a', glowA: 0.55,
  },
  {
    t: 0.92,
    name: 'night',
    top: PALETTE.skyNightHigh, mid: '#141c40', bottom: PALETTE.skyNight,
    light: 0.32, tint: '#1b2450',
    warm: '#4a6ac0', warmA: 0.1,
    glow: '#2a3568', glowA: 0.2,
  },
  {
    t: 1.0,
    name: 'night',
    top: PALETTE.skyNightHigh, mid: '#141c40', bottom: PALETTE.skyNight,
    light: 0.32, tint: '#1b2450',
    warm: '#4a6ac0', warmA: 0.1,
    glow: '#2a3568', glowA: 0.18,
  },
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, k) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return A.map((v, i) => Math.round(v + (B[i] - v) * k));
}

function mix(a, b, k) {
  const c = mixRgb(a, b, k);
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

/** Jump the clock without touching how many days have gone by. */
export function setTime(t) {
  state.time = ((t % 1) + 1) % 1;
  state.phase = phaseAt(state.time);
}

/**
 * Start the clock over: hour of the day *and* the day count.
 *
 * A new run needs both. `elapsed` is what the moon phase is counted from, and
 * it keeps running under the menu backdrop, so a run started after ten minutes
 * on the title screen would otherwise open under a different moon than one
 * started immediately. Saves restore `elapsed` and so keep their own moon.
 */
export function reset(t = 0.32) {
  state.elapsed = 0;
  setTime(t);
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
  const lerp = (key) => a[key] + (b[key] - a[key]) * k;
  const light = lerp('light');

  /** 0 at sunrise, 1 at sunset — drives the sun arc across the sky. */
  const sunProgress = (t - 0.22) / 0.58;
  /** Same arc, half a cycle later, for the moon. */
  const arcT = sunProgress >= 0 && sunProgress <= 1
    ? sunProgress
    : (sunProgress < 0 ? sunProgress + 1 : sunProgress - 1);

  return {
    top: mix(a.top, b.top, k),
    mid: mix(a.mid, b.mid, k),
    bottom: mix(a.bottom, b.bottom, k),
    /** Same three, as [r,g,b] triples — the sky renderer dithers with these. */
    rgb: {
      top: mixRgb(a.top, b.top, k),
      mid: mixRgb(a.mid, b.mid, k),
      bottom: mixRgb(a.bottom, b.bottom, k),
    },
    light,
    tint: mix(a.tint, b.tint, k),
    warm: mix(a.warm, b.warm, k),
    warmA: lerp('warmA'),
    glow: mix(a.glow, b.glow, k),
    glowA: lerp('glowA'),
    sunProgress,
    /** How high the visible body is, 0 at either horizon, 1 overhead. */
    elevation: Math.sin(Math.max(0, Math.min(1, arcT)) * Math.PI),
    /** Star opacity, faded in around night. */
    stars: Math.max(0, Math.min(1, (0.66 - light) / 0.3)),
    /** Which baked moon sprite to use tonight. */
    moonPhase: Math.floor(state.elapsed / DAY_LENGTH_MS) % MOON_PHASE_COUNT,
    /** Turns the star field slowly through the night. */
    skyRotation: state.time,
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
  return { time: state.time, elapsed: state.elapsed };
}

export function restore(data) {
  if (data && typeof data.time === 'number') setTime(data.time);
  if (data && typeof data.elapsed === 'number') state.elapsed = data.elapsed;
}
