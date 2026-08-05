/**
 * SHOOT! — Dynamic weather (Block 3b).
 *
 * Eight states, each with its own visual treatment and a limited duration
 * before the sky clears again:
 *
 *   clear      — nothing drawn
 *   cloudy     — a light grey wash under the storm deck, mild visibility loss
 *   rain       — three depths of falling rain that break on the ground, a dark
 *                wash, and lightning that actually strikes something
 *   sandstorm  — three depths of driven sand, tumbling grit, gusting dust
 *                sheets and heavy ochre haze; the harshest weather to be
 *                caught in
 *   fog        — still, banked mist that thickens towards the ground and eats
 *                the horizon; nothing falls, and that stillness is the point
 *   snow       — flakes that drift rather than fall, settle where they land,
 *                and cost you rations to walk through
 *   ash        — the basin's fallout: slow grey flakes with live embers riding
 *                up through them, and a dry brown haze over everything
 *   starfall   — meteors crossing the void, in flights rather than singly.
 *                The one weather with nothing between you and it
 *
 * ADDING ONE IS THREE EDITS AND NO NEW MACHINERY
 * ---------------------------------------------------------------------------
 * The three states above `starfall` were added long after the first five, and
 * between them they needed exactly one new primitive (`settle`, the snow lying
 * on the ground). Everything else came out of what the rain and the sandstorm
 * already had: a particle population with depths, drifting sheets, banded
 * washes and a pixel-grid line drawer. A weather is a table entry, a spawn
 * case, a step case and a draw case — see `snow` for the shortest complete
 * example of all four.
 *
 * `getWeatherState()` is the global read-only handle the duel system uses to
 * apply combat modifiers when a fight starts in bad weather.
 *
 * NOT EVERY SKY BELONGS TO EVERY PLACE
 * ---------------------------------------------------------------------------
 * Which of the five a world can actually get is the *biome's* business, not
 * this file's: `setBiome()` installs the transition table from
 * `src/game/biomes.js` and the roll can never leave it. So sand only blows
 * where there is sand to blow, fog only banks up over the wet grass of the
 * prairie, and adding a snowfall later means adding one state here and listing
 * it in one biome — not rewriting a global table that every world shares.
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
import { getBiome } from '../game/biomes.js';
import {
  HUNGER_DRAIN_SANDSTORM_MUL,
  HUNGER_DRAIN_SNOW_MUL,
  HUNGER_DRAIN_ASH_MUL,
} from '../game/progression.js';
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
    blurb: 'Clouds are gathering',
  },
  rain: {
    id: 'rain',
    label: 'Rain',
    visibility: 0.72,
    minMs: 18000,
    maxMs: 38000,
    /** Wet powder: shots occasionally misfire for BOTH duellists. */
    duel: { misfireChance: 0.08 },
    blurb: 'Rain is coming down',
  },
  sandstorm: {
    id: 'sandstorm',
    label: 'Sandstorm',
    visibility: 0.5,
    minMs: 15000,
    maxMs: 30000,
    /** Sand in the eyes: the enemy AI reads your move less reliably. */
    duel: { enemyAccuracyPenalty: 0.18, misfireChance: 0.04 },
    /**
     * WEATHER THAT COSTS YOU SOMETHING TO WALK THROUGH
     * -----------------------------------------------------------------------
     * `hungerMul` multiplies the rate hunger drains at while you are on the
     * road in it. It used to be a lone constant in `progression.js` that
     * hunger.js checked for the string "sandstorm", which meant a second harsh
     * weather could not exist without a second `if`. It is a field now, and
     * the travel band reads the same field to draw the multiplier next to the
     * meter — a hunger bar that quietly empties half again as fast is a
     * difficulty spike the player can only find out about by dying of it.
     */
    hungerMul: HUNGER_DRAIN_SANDSTORM_MUL,
    /** Toast wording, and the one line the player is told about it. */
    blurb: 'Sand whips across the road',
    tone: 'bad',
  },
  fog: {
    id: 'fog',
    label: 'Fog',
    visibility: 0.58,
    /** Mist outlasts a squall — it sits on the grass until the sun burns it off. */
    minMs: 24000,
    maxMs: 52000,
    /**
     * Neither of you can read the other properly, but the powder stays dry:
     * a duel in fog is a guessing game, not a coin toss over whether the gun
     * goes off at all.
     */
    duel: { enemyAccuracyPenalty: 0.14 },
    blurb: 'Mist settles over the grass',
  },

  snow: {
    id: 'snow',
    label: 'Snowfall',
    visibility: 0.62,
    /** It comes on for a long time up there, and it goes off slowly. */
    minMs: 26000,
    maxMs: 58000,
    /**
     * Cold hands and a white sky. Nobody's aim is helped, and unlike the rain
     * the powder stays dry — a snowstorm is a visibility problem, which is
     * why it reads as a milder sandstorm rather than as a wetter one.
     */
    duel: { enemyAccuracyPenalty: 0.12 },
    hungerMul: HUNGER_DRAIN_SNOW_MUL,
    blurb: 'Snow is coming down over the pass',
  },

  ash: {
    id: 'ash',
    label: 'Ashfall',
    visibility: 0.56,
    minMs: 18000,
    maxMs: 40000,
    /**
     * Grit in the eyes and no clean air to breathe: it throws the enemy off
     * as hard as sand does, and it lights the odd cartridge that should not
     * have gone off.
     */
    duel: { enemyAccuracyPenalty: 0.16, misfireChance: 0.05 },
    hungerMul: HUNGER_DRAIN_ASH_MUL,
    blurb: 'Ash is falling across the basin',
    tone: 'bad',
  },

  starfall: {
    id: 'starfall',
    label: 'Starfall',
    /**
     * It takes almost nothing out of the view — there is no air out here to
     * hold anything up. What it does is throw moving light across a scene
     * that has none, which is worth more to a duel than a haze would be.
     */
    visibility: 0.9,
    minMs: 16000,
    maxMs: 34000,
    duel: { enemyAccuracyPenalty: 0.1 },
    blurb: 'Something is falling through the dark',
  },
};

/**
 * EVERYTHING HERE IS MEASURED AGAINST THE MAN
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels. That is the ruler. A raindrop two
 * pixels wide and eleven long is a drop half as tall as the person it is
 * falling on, and no amount of detail survives that — it reads as debris
 * flying past, not as weather. Drops are one pixel wide and two to five long,
 * sand is a dash of two to nine — half his width at the very most, and only on
 * the fastest layer, where the length is reading as speed — and the density
 * does the work the size used to be doing.
 *
 * Rain depths, in source pixels per 60Hz frame. `land` is how far below the
 * walk line this depth breaks: negative is behind the road (up against the
 * dunes), positive is in front of it.
 */
const RAIN_DEPTHS = [
  { len: 2, vy: 3.4, alpha: 0.4, w: 1, land: 0, share: 0.42 },
  { len: 3, vy: 4.8, alpha: 0.56, w: 1, land: 5, share: 0.34 },
  { len: 5, vy: 6.4, alpha: 0.78, w: 1, land: 11, share: 0.24 },
];

/**
 * Sandstorm depths, same units. Sand travels sideways, not down.
 *
 * SAND DOES NOT TELEPORT
 * ---------------------------------------------------------------------------
 * The near layer used to run at 19 source pixels per frame. That is more than
 * the gunslinger is wide, every frame: the eye never sees a grain travel, it
 * sees it in one place and then in another, which reads as flickering rather
 * than as wind. Nineteen is also far past the point where the extra speed says
 * anything — the storm was already unreadable at seven.
 *
 * So the near layer now runs at what used to be the *far* one — the slowest
 * speed the storm had — and the two behind it are a shade slower still, which
 * is all the parallax needs. Depth is carried by opacity and dash length from
 * here on, and both of those survive being looked at. The storm reads exactly
 * as hard, because the density and the haze were always doing that work.
 */
const SAND_DEPTHS = [
  // Dashes come in with the speed: a 9px streak is motion blur, and there is
  // no longer 9px of motion in a frame to blur.
  { vx: -5.5, len: [2, 5], alpha: 0.3, h: 1, share: 0.4 },
  { vx: -6.2, len: [2, 6], alpha: 0.48, h: 1, share: 0.36 },
  { vx: -7, len: [3, 7], alpha: 0.7, h: 1, share: 0.24 },
];

/**
 * Snow depths. A flake is a whole pixel — never a two-pixel block, which at
 * this scale is a snowball — and it falls at a fifth of the speed of rain,
 * because the single thing that separates snow from rain on screen is how long
 * it takes to cross it. `wander` is how far it swings sideways on the way
 * down: snow does not fall, it *drifts*, and a flake on rails is hail.
 */
const SNOW_DEPTHS = [
  { vy: 0.5, alpha: 0.42, wander: 0.9, rate: 3200, share: 0.42 },
  { vy: 0.8, alpha: 0.66, wander: 1.4, rate: 2400, share: 0.34 },
  { vy: 1.2, alpha: 0.92, wander: 2, rate: 1700, share: 0.24 },
];

/**
 * Ash depths. Between the two above: it falls like snow and it is the colour
 * of the sand. The near layer carries live embers — the basin is still
 * burning somewhere upwind — and those are the only particles in the game that
 * travel *up*.
 */
const ASH_DEPTHS = [
  { vy: 0.6, alpha: 0.3, wander: 0.7, rate: 3000, share: 0.44 },
  { vy: 0.95, alpha: 0.48, wander: 1.1, rate: 2200, share: 0.36 },
  { vy: 1.35, alpha: 0.7, wander: 1.6, rate: 1500, share: 0.2 },
];

/**
 * Starfall depths. These are not particles falling *on* you — they are a long
 * way off, which is why the far layer is slow and short and the near one is
 * fast and long. They travel down and to the left at a fixed rake, because
 * meteors in one shower are parallel: they are all coming from the same place.
 */
const METEOR_DEPTHS = [
  { v: 3.2, len: 5, alpha: 0.4, share: 0.46 },
  { v: 5.4, len: 9, alpha: 0.68, share: 0.34 },
  { v: 8, len: 15, alpha: 1, share: 0.2 },
];

/** How far a meteor leans: one pixel down for every this many across. */
const METEOR_RAKE = 0.42;

const RAIN_COLOR = [186, 214, 255];
const SAND_COLOR = [240, 214, 154];
const SNOW_COLOR = [244, 250, 255];
const ASH_COLOR = [168, 160, 168];

/**
 * The drifting sheets. Sand throws thin, fast gusts across the road; fog is
 * the same primitive slowed almost to a stop and made deep, which is exactly
 * the difference between weather that is arriving and weather that has settled
 * in and is not going anywhere.
 */
const SHEETS = {
  // The gusts ride with the sand rather than through it: a sheet of haze
  // overtaking the grains it is supposedly made of was the other half of the
  // storm's speed problem.
  sandstorm: { count: 5, h: [4, 16], vx: [-7, -3], alpha: [0.08, 0.18], color: 'rgb(214, 172, 104)' },
  fog: { count: 8, h: [10, 34], vx: [-1.6, -0.4], alpha: [0.1, 0.22], color: 'rgb(222, 230, 226)' },
  // Snow's banks are fog's, moving at a walking pace rather than a standstill:
  // a squall is mist with somewhere to be.
  snow: { count: 6, h: [8, 26], vx: [-3.4, -1.2], alpha: [0.08, 0.2], color: 'rgb(238, 246, 255)' },
  // Smoke, not haze: fewer, deeper, darker, and the only sheets in the game
  // that take light *out* of the scene rather than putting a veil over it.
  ash: { count: 5, h: [10, 30], vx: [-2.6, -0.8], alpha: [0.1, 0.24], color: 'rgb(96, 88, 96)' },
};

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
  sheets: [],          // drifting sand gusts / fog banks / snow squalls / smoke
  settled: [],         // flakes lying where they landed, until the sky changes
  /** The biome whose weather table the roll is drawn from. */
  biome: getBiome('desert'),
  /** Walk line in device pixels; the screens hand it over each frame. */
  groundY: null,
};

function clearParticles() {
  state.particles = [];
  state.splashes = [];
  state.sheets = [];
  state.settled = [];
}

/**
 * Move the weather to the biome the player has just entered.
 *
 * If the sky is currently doing something this biome cannot do — walking out
 * of a sandstorm and into the prairie — it is cleared rather than carried
 * over. The alternative is sand still blowing across the grass for the next
 * twenty seconds because the countdown had not run out yet.
 *
 * Call this BEFORE `restore()`, so a save written in one biome cannot reinstate
 * a weather the biome it is being loaded into has never heard of.
 */
export function setBiome(id) {
  state.biome = getBiome(id);
  if (!allowed(state.current.id)) force('clear');
}

/** Is this state one the current biome can be in at all? */
function allowed(id) {
  return id === 'clear' || !!state.biome.weather[id];
}

/** Where the sky can go from where it is, in this biome. */
function transitionsFrom(id) {
  return state.biome.weather[id] || state.biome.weather.clear || { clear: 1 };
}

function roll(next) {
  const cfg = WEATHER[next] || WEATHER.clear;
  state.current = cfg;
  state.remaining = rng.range(cfg.minMs, cfg.maxMs);
  // Anything driven by wind announces itself before you can see it properly.
  if (next === 'sandstorm' || next === 'snow' || next === 'ash') play('wind');
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
    if (state.remaining <= 0) roll(rng.weighted(transitionsFrom(state.current.id)));
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

/** How many particles each weather wants on screen at full strength. */
const PARTICLE_COUNT = {
  rain: 300,
  sandstorm: 300,
  // Fewer than the rain, and each one lasts far longer on screen. Three
  // hundred flakes drifting at a fifth of the speed is a blizzard, and a
  // blizzard is a different weather from a snowfall.
  snow: 190,
  ash: 150,
  // A shower is not a downpour. Twenty-two streaks is already more meteors
  // than any real one puts up, and the number is doing the same job the
  // sandstorm's three hundred grains do: it is what makes it a *fall*.
  starfall: 22,
};

function stepParticles(dt, view) {
  const id = state.shown.id;
  const wanted = PARTICLE_COUNT[id] || 0;
  const count = Math.round(wanted * state.intensity);
  const W = view.w / view.scale;
  const H = view.h / view.scale;
  const gy = groundOf(view) / view.scale;

  while (state.particles.length < count) state.particles.push(spawn(W, H, id, gy));
  while (state.particles.length > count) state.particles.pop();

  const step = dt / 16.67;

  if (id === 'rain') {
    // Wind gusts, so the rain leans and eases back instead of falling on rails.
    const wind = -1.5 * (1 + 0.38 * Math.sin(state.clock / 2600) + 0.16 * Math.sin(state.clock / 830));
    for (const p of state.particles) {
      p.vx = (wind * p.vy) / 6;
      p.x += p.vx * step;
      p.y += p.vy * step;
      // The landing line is derived from the ground *this frame*, never
      // captured at spawn: the duel raises the walk line, and drops holding an
      // old landing line fell straight through the new road until they
      // happened to be recycled.
      const landY = gy + p.landOffset;
      if (p.y >= landY) {
        // The far curtain does not splash: at that distance a single pixel of
        // spray is noise, and 200 of them turned the road into gravel.
        if (p.depth > 0) addSplash(p.x, landY, p.depth);
        Object.assign(p, spawn(W, H, id));
        p.y = -rng.range(2, 30);
      } else if (p.x < -30 || p.x > W + 30) {
        Object.assign(p, spawn(W, H, id));
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
      if (p.x < -40 || p.y > H + 10 || p.y < -10) Object.assign(p, spawn(W, H, id, gy));
    }
    stepSheets(dt, W, H, SHEETS.sandstorm);
    return;
  }

  // Fog has no particles at all: it is banks and haze, and nothing in it is
  // travelling fast enough to be a grain of anything.
  if (id === 'fog') {
    stepSheets(dt, W, H, SHEETS.fog, gy);
    return;
  }

  if (id === 'snow' || id === 'ash') {
    // One shared wind for the whole sky, so every flake leans the same way at
    // the same moment. Independent per-flake drift reads as static.
    const wind = -0.7 * (1 + 0.5 * Math.sin(state.clock / 4200) + 0.22 * Math.sin(state.clock / 1300));
    for (const p of state.particles) {
      if (p.ember) {
        // Embers rise, wander, and burn out rather than landing.
        p.y -= p.vy * step;
        p.x += Math.sin(state.clock / p.rate + p.phase) * 0.25 * step;
        p.life -= dt;
        if (p.life <= 0 || p.y < -6) Object.assign(p, spawn(W, H, id, gy));
        continue;
      }
      p.y += p.vy * step;
      // The swing is a sine on the flake's own clock, plus the shared wind:
      // that combination is what makes a fall look soft instead of striped.
      p.x += (Math.sin(state.clock / p.rate + p.phase) * p.wander + wind * 0.35) * step;
      const landY = gy + p.landOffset;
      if (p.y >= landY) {
        // Snow lies where it lands. Ash does not — it is too hot and too fine,
        // and a grey crust building up over a lava field would read as snow.
        if (id === 'snow' && p.depth > 0) addSettled(p.x, landY, p.depth);
        Object.assign(p, spawn(W, H, id, gy));
        p.y = -rng.range(2, 24);
      } else if (p.x < -40 || p.x > W + 40) {
        Object.assign(p, spawn(W, H, id, gy));
      }
    }
    stepSheets(dt, W, H, id === 'snow' ? SHEETS.snow : SHEETS.ash, id === 'ash' ? gy : null);
    stepSettled(dt);
    return;
  }

  if (id === 'starfall') {
    for (const p of state.particles) {
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.t += dt;
      // A meteor is not recycled at the edge of the screen — it burns out on
      // its own clock, wherever it happens to be, and the next one starts
      // somewhere else. Nothing in a meteor shower crosses the whole sky.
      if (p.t >= p.life || p.y > H + 20 || p.x < -60) Object.assign(p, spawn(W, H, id, gy));
    }
  }
}

// --- settled snow -----------------------------------------------------------

/**
 * A flake that has landed. It sits on the walk line, fades, and goes.
 *
 * This is the only weather in the game that leaves anything behind, and it is
 * capped hard: at a hundred and twenty the road is dusted, and past that the
 * ground reads as a solid white bar rather than as snow lying on it. They are
 * *not* stored against the world — the camera moves and they do not, because
 * they are a suggestion of settling rather than a simulation of it, and a
 * player watching for that on a horse would be watching very hard indeed.
 */
function addSettled(x, y, depth) {
  if (state.settled.length > 120) return;
  state.settled.push({ x, y, depth, t: 0, life: rng.range(2600, 6000) });
}

function stepSettled(dt) {
  for (let i = state.settled.length - 1; i >= 0; i--) {
    const s = state.settled[i];
    s.t += dt;
    if (s.t >= s.life) state.settled.splice(i, 1);
  }
}

/**
 * A new particle. `gy` is only consulted by the sandstorm, which piles its sand
 * up against the ground at spawn time; rain keeps its landing line as an offset
 * from whatever the ground happens to be when it gets there.
 */
function spawn(W, H, id, gy = H * 0.78) {
  if (id === 'snow' || id === 'ash') {
    const table = id === 'snow' ? SNOW_DEPTHS : ASH_DEPTHS;
    const depth = pickDepth(table);
    const d = table[depth];
    // One flake in twelve on the near ash layer is a live ember going the
    // other way. Rare, because two of them on screen at once stops reading as
    // "something is burning upwind" and starts reading as fireworks.
    const ember = id === 'ash' && depth === 2 && rng.chance(0.12);
    return {
      depth,
      ember,
      x: rng.range(-30, W + 30),
      y: ember ? rng.range(gy - 10, gy + 6) : rng.range(-H, 0),
      vy: ember ? rng.range(0.5, 1.1) : d.vy * rng.range(0.85, 1.2),
      wander: d.wander * rng.range(0.7, 1.3),
      rate: d.rate * rng.range(0.75, 1.35),
      phase: rng.range(0, Math.PI * 2),
      a: d.alpha * rng.range(0.75, 1.1),
      life: ember ? rng.range(900, 2600) : 0,
      /** How far below the walk line this flake settles, in source pixels. */
      landOffset: [0, 5, 11][depth] + rng.range(-3, 3),
    };
  }

  if (id === 'starfall') {
    const depth = pickDepth(METEOR_DEPTHS);
    const d = METEOR_DEPTHS[depth];
    const v = d.v * rng.range(0.85, 1.15);
    return {
      depth,
      // Meteors only ever appear in the upper part of the frame: one climbing
      // out of the ground would be a rocket.
      x: rng.range(-20, W + 60),
      y: rng.range(-30, H * 0.45),
      vx: -v,
      vy: v * METEOR_RAKE,
      len: d.len * rng.range(0.8, 1.25),
      a: d.alpha * rng.range(0.8, 1.1),
      t: 0,
      life: rng.range(500, 1600),
      /** A few of them are worth more than the rest — the ones you look up for. */
      bright: rng.chance(0.18),
    };
  }

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
    /** How far below the walk line this drop breaks, in source pixels. */
    landOffset: d.land + rng.range(-3, 3),
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

// --- drifting sheets (sand gusts / fog banks) -------------------------------

/**
 * @param {object} cfg one of SHEETS
 * @param {number} [gy] walk line in source pixels. Fog passes it so its banks
 *   pile up against the ground instead of spreading evenly up the screen —
 *   mist that is as thick at the top of the sky as it is on the grass is
 *   smoke, not fog.
 */
function stepSheets(dt, W, H, cfg, gy = null) {
  const step = dt / 16.67;
  const top = gy === null ? H * 0.3 : gy * 0.45;
  const bottom = gy === null ? H * 0.95 : Math.min(H, gy + H * 0.1);
  const respawn = (sh, fresh) => {
    sh.x = fresh ? rng.range(0, W * 1.6) : W + rng.range(10, W * 0.6);
    sh.y = rng.range(top, bottom);
    sh.w = rng.range(W * 0.35, W * 0.9);
    sh.h = rng.range(cfg.h[0], cfg.h[1]);
    sh.vx = rng.range(cfg.vx[0], cfg.vx[1]);
    sh.a = rng.range(cfg.alpha[0], cfg.alpha[1]);
  };
  while (state.sheets.length < cfg.count) {
    const sh = {};
    respawn(sh, true);
    state.sheets.push(sh);
  }
  while (state.sheets.length > cfg.count) state.sheets.pop();
  for (const sh of state.sheets) {
    sh.x += sh.vx * step;
    if (sh.x + sh.w < -20) respawn(sh, false);
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
  const bands = 16;
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
    /**
     * Overcast is the mildest weather there is: it takes the edge off the
     * light, and that is the whole of it. It used to drop the scene by nearly
     * half and drag shadow bands across the road as well, which made a cloudy
     * afternoon a bigger change than nightfall and put a shape on the sand
     * that nothing in the sky accounted for. The cloud belongs in the sky,
     * where the storm deck draws it. Down here it is only less sun.
     */
    bandWash(ctx, view, 'rgb(64, 68, 84)', 0, view.h, 0.2 * k, 0.14 * k);
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
    drawSheets(ctx, view, k, SHEETS.sandstorm.color);
    drawSand(ctx, view, k, light);
    // Heavier haze from the horizon down — where the sand is actually coming
    // from — in the same quantised bands as everything else.
    bandWash(ctx, view, 'rgb(176, 124, 58)', view.h * 0.3, view.h, 0, 0.55 * k);
    return;
  }

  if (id === 'snow') {
    /**
     * Snow is drawn light, not dark. Every other weather in the game takes
     * value out of the scene; this one puts it in — the sky goes pale, the
     * ground goes paler, and the contrast in the middle distance drops away
     * until the peaks are barely there. That is what falling snow does to a
     * view, and it is the reason the wash is nearly white while the fog's,
     * which is a similar colour, is a veil rather than a fill.
     */
    const glare = 232 + Math.round(getSky().light * 20);
    const pale = `rgb(${glare}, ${glare + 4}, ${Math.min(255, glare + 10)})`;
    bandWash(ctx, view, pale, 0, view.h, 0.34 * k, 0.2 * k);
    drawSheets(ctx, view, k, SHEETS.snow.color);
    drawSettled(ctx, view, k);
    drawFlakes(ctx, view, k, light, SNOW_COLOR, SNOW_DEPTHS);
    // A last thin wash lying on the ground, so the road is the brightest part
    // of the frame rather than the sky.
    bandWash(ctx, view, pale, gy - view.h * 0.08, view.h, 0.1 * k, 0.4 * k);
    return;
  }

  if (id === 'ash') {
    /**
     * The basin's own colour pulled up over the sky: dry, brown and lightless.
     *
     * It is deliberately lighter than the sandstorm's, which is the opposite
     * of what the first pass assumed. A sandstorm can afford to blind you
     * because the sand it is made of is the brightest thing in the desert —
     * the scene stays legible while being nearly white. Ash is dark, and the
     * basin under it is darker, so the same weight of haze turned the world
     * into one flat brown rectangle with a hat moving across it. Half as much
     * says the same thing and leaves a place underneath.
     */
    bandWash(ctx, view, 'rgb(84, 70, 64)', 0, view.h, 0.34 * k, 0.44 * k);
    drawSheets(ctx, view, k, SHEETS.ash.color);
    drawFlakes(ctx, view, k, light, ASH_COLOR, ASH_DEPTHS);
    // Heavier towards the ground, where it is coming from and where it is
    // piling up — the same shape as the sandstorm's haze, in soot.
    bandWash(ctx, view, 'rgb(60, 48, 48)', view.h * 0.4, view.h, 0, 0.32 * k);
    return;
  }

  if (id === 'starfall') {
    // Almost no wash at all: a veil over open space is a contradiction. What
    // little there is cools the frame rather than dimming it.
    bandWash(ctx, view, 'rgb(38, 24, 72)', 0, view.h, 0.24 * k, 0.1 * k);
    drawMeteors(ctx, view, k);
    return;
  }

  if (id === 'fog') {
    /**
     * Fog is built the other way up from every other weather here. The rest
     * are things falling *through* the air; this is the air itself, so it is
     * drawn as three washes of increasing weight from the horizon down, with
     * the banks in between them, and nothing at all in front.
     *
     * It is also the only weather with no motion to speak of. Two earlier
     * passes gave the banks a sandstorm's speed and the result read as smoke
     * blowing off something on fire — mist that visibly travels is not mist.
     * The banks now cross the screen in about a minute, which is slow enough
     * that the eye reads them as depth rather than as movement.
     */
    const grey = 210 + Math.round(getSky().light * 24);
    const pale = `rgb(${grey}, ${grey + 6}, ${grey + 2})`;

    // A thin veil over everything, so even the sky loses its edge.
    bandWash(ctx, view, pale, 0, view.h, 0.16 * k, 0.3 * k);
    // The body of it, banked from the horizon down to the walk line.
    bandWash(ctx, view, pale, view.h * 0.25, gy, 0, 0.5 * k);
    drawSheets(ctx, view, k, SHEETS.fog.color);
    // And the densest layer of all, lying on the ground the way it does at
    // first light: the traveller's boots go into it.
    bandWash(ctx, view, pale, gy - view.h * 0.1, view.h, 0.18 * k, 0.62 * k);
  }
}

function drawRain(ctx, view, k, light) {
  const s = view.scale;
  for (const p of state.particles) {
    const d = RAIN_DEPTHS[p.depth];
    const c = RAIN_COLOR.map((v) => Math.round(v * light));
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.a * k})`;
    // A streak is one or two short blocks, the upper one nudged sideways by
    // the wind. At this size that is the whole drop: a couple of pixels of
    // lean is already the difference between rain and hail.
    const segs = Math.max(1, Math.round(p.len / 2));
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
      // The hit: one pixel of water standing up off the road.
      ctx.fillRect(x, y - s, s, s);
      ctx.fillRect(x, y, s, s);
    } else if (sp.t < 0.67) {
      // Two beads thrown sideways, one pixel each — a drop one pixel wide
      // cannot throw a five-pixel crown.
      ctx.fillRect(x - s, y, s, s);
      ctx.fillRect(x + s, y, s, s);
    } else {
      // The ring left behind on the wet ground.
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x - s, y, s * 3, s);
      ctx.globalAlpha = 1;
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Snow and ash, which are the same routine: a population of single pixels
 * falling slowly, plus — for the ash — the embers riding up through them.
 *
 * A flake is one pixel at every depth. The three depths are told apart by
 * opacity and by speed and by nothing else, which is the same rule the sand
 * follows and the reason a squall never reads as gravel.
 */
function drawFlakes(ctx, view, k, light, color, depths) {
  const s = view.scale;
  const c = color.map((v) => Math.round(v * light));
  for (const p of state.particles) {
    const x = Math.round(p.x) * s;
    const y = Math.round(p.y) * s;
    if (p.ember) {
      // An ember dims as it burns out, and it carries one dark pixel of the
      // ash it came off behind it.
      const fade = Math.max(0, Math.min(1, p.life / 900));
      ctx.fillStyle = `rgba(255, 190, 82, ${fade * k})`;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = `rgba(255, 127, 34, ${fade * k * 0.35})`;
      ctx.fillRect(x - s, y - s, s * 3, s * 3);
      continue;
    }
    const d = depths[p.depth];
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.a * k})`;
    ctx.fillRect(x, y, s, s);
    // The nearest layer gets a second pixel, which at this size is the whole
    // difference between "a flake in front of you" and "a flake behind".
    if (p.depth === 2 && d) ctx.fillRect(x, y + s, s, s);
  }
  ctx.globalAlpha = 1;
}

/** Snow already on the ground: a short bright dash, fading out as it melts. */
function drawSettled(ctx, view, k) {
  const s = view.scale;
  for (const sp of state.settled) {
    const a = (1 - sp.t / sp.life) * k * (sp.depth === 2 ? 0.75 : 0.5);
    if (a <= 0.02) continue;
    ctx.fillStyle = `rgba(244, 250, 255, ${a})`;
    ctx.fillRect(Math.round(sp.x) * s, Math.round(sp.y) * s, s * 2, s);
  }
  ctx.globalAlpha = 1;
}

/**
 * Meteors. Each one is a tapering streak: a bright head, a body that thins
 * behind it, and nothing at all where it has already been. The taper is drawn
 * as whole pixels stepping down in alpha rather than as a gradient, for the
 * same reason the rest of this file has no gradients in it.
 */
function drawMeteors(ctx, view, k) {
  const s = view.scale;
  for (const p of state.particles) {
    // In and out: a meteor that appears at full brightness is a scratch on
    // the film. Both ends of its life are a fade.
    const age = p.t / p.life;
    const fade = Math.min(1, Math.min(age * 6, (1 - age) * 3));
    const a = p.a * k * fade;
    if (a <= 0.02) continue;
    const steps = Math.max(2, Math.round(p.len));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      // Behind the head, along the direction of travel.
      const x = Math.round(p.x + t * p.len) * s;
      const y = Math.round(p.y - t * p.len * METEOR_RAKE) * s;
      const tail = (1 - t) ** 1.6;
      ctx.fillStyle = p.bright
        ? `rgba(255, 240, 200, ${a * tail})`
        : `rgba(200, 230, 255, ${a * tail})`;
      ctx.fillRect(x, y, s, s);
    }
    // The head itself, one step brighter and one pixel wider on the bright ones.
    ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    ctx.fillRect(Math.round(p.x) * s, Math.round(p.y) * s, s, s);
    if (p.bright) {
      ctx.fillStyle = `rgba(162, 247, 236, ${a * 0.4})`;
      ctx.fillRect(Math.round(p.x) * s - s, Math.round(p.y) * s - s, s * 3, s * 3);
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
      // Grit tumbles: a single pixel with a fainter one trailing it. The
      // grain's own opacity is already in `fillStyle`, so the trail only asks
      // for half of it here — multiplying it in twice squared the alpha and
      // faded the trails out quadratically as the storm came and went.
      ctx.fillRect(x, y, s, s);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + s * 2, y, s, s);
      ctx.globalAlpha = 1;
    } else if (p.len > 4) {
      // The long dashes get a gap in them: a streak with a break reads as
      // speed, a solid bar reads as a bar. The short ones cannot spare it.
      const head = p.len - 2;
      ctx.fillRect(x, y, head * s, d.h * s);
      ctx.fillRect(x + (head + 2) * s, y, s, d.h * s);
    } else {
      ctx.fillRect(x, y, p.len * s, d.h * s);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * The gusts: broad, faint sheets crossing in front of everything. Each one is
 * drawn as three stacked bands, the outer two shorter and fainter, so it thins
 * out at its edges instead of ending on a hard vertical line — a rectangle of
 * haze sliding across the desert reads as a rendering fault, not as wind.
 *
 * The sandstorm and the fog share this: the difference between a gust of grit
 * and a bank of mist turns out to be its speed, its depth and its colour, and
 * all three of those live in SHEETS.
 */
function drawSheets(ctx, view, k, color) {
  const s = view.scale;
  ctx.fillStyle = color;
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
    /**
     * What this sky does to the hunger meter, and what to say when it arrives.
     * Both are read straight off the table so that adding a weather never
     * means editing the HUD or the road — see the note on `hungerMul`.
     */
    hungerMul: state.current.hungerMul || 1,
    blurb: state.current.blurb || null,
    tone: state.current.tone || 'info',
  };
}

export function serialize() {
  return { id: state.current.id, remaining: state.remaining };
}

export function restore(data) {
  // A slot written before the biomes existed — or written in one biome and
  // reloaded into another — can name a weather this place cannot have. Drop
  // it and let the sky roll fresh rather than importing someone else's storm.
  if (data && WEATHER[data.id] && allowed(data.id)) {
    roll(data.id);
    state.shown = state.current;
    clearParticles();
    state.intensity = 0; // a loaded save rolls its weather in, it does not pop
    if (typeof data.remaining === 'number') state.remaining = data.remaining;
  }
}
